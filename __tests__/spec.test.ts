import { describe, it, expect } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildResourceMap, snakeToCamel, snakeToKebab } from "../src/spec.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = resolve(__dirname, "..", "src", "spec", "openapi.json");

describe("buildResourceMap", () => {
  const map = buildResourceMap(SPEC_PATH);

  it("groups every endpoint under a resource", () => {
    expect(map.size).toBeGreaterThan(0);
    const total = Array.from(map.values()).reduce((n, ops) => n + ops.length, 0);
    expect(total).toBe(61);
  });

  it("exposes core resources", () => {
    for (const r of ["event", "calendar", "user", "memberships", "webhooks", "organizations"]) {
      expect(map.has(r)).toBe(true);
    }
  });

  it("registers user/get-self with no params", () => {
    const op = map.get("user")!.find((o) => o.action === "get-self");
    expect(op).toBeDefined();
    expect(op!.method).toBe("GET");
    expect(op!.path).toBe("/v1/user/get-self");
    expect(op!.params).toEqual([]);
  });

  it("registers event/get with id + api_id query params", () => {
    const op = map.get("event")!.find((o) => o.action === "get");
    expect(op).toBeDefined();
    expect(op!.method).toBe("GET");
    expect(op!.params.map((p) => p.name).sort()).toEqual(["api_id", "id"]);
  });

  it("registers event/create with required name/start-at/timezone body props", () => {
    const op = map.get("event")!.find((o) => o.action === "create");
    expect(op).toBeDefined();
    expect(op!.method).toBe("POST");
    const required = op!.bodyProps.filter((p) => p.required).map((p) => p.name);
    expect(required).toContain("name");
    expect(required).toContain("start_at");
    expect(required).toContain("timezone");
  });

  it("collapses /v1/event/ticket-types/list into ticket-types-list", () => {
    const op = map.get("event")!.find((o) => o.action === "ticket-types-list");
    expect(op).toBeDefined();
    expect(op!.path).toBe("/v1/event/ticket-types/list");
  });

  it("skips deprecated body props", () => {
    const op = map.get("event")!.find((o) => o.action === "add-guests");
    expect(op).toBeDefined();
    // event_api_id is deprecated in the body and should not appear as a flag
    const names = op!.bodyProps.map((p) => p.name);
    expect(names).toContain("event_id");
    expect(names).not.toContain("event_api_id");
  });
});

describe("name conversions", () => {
  it("snake_to_kebab", () => {
    expect(snakeToKebab("event_api_id")).toBe("event-api-id");
    expect(snakeToKebab("approval_status")).toBe("approval-status");
  });
  it("snake_to_camel", () => {
    expect(snakeToCamel("event_api_id")).toBe("eventApiId");
    expect(snakeToCamel("pagination_cursor")).toBe("paginationCursor");
  });
});
