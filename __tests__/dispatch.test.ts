import { describe, expect, it } from "vitest";
import { coerceValue } from "../src/dispatch.js";
import type { ParamSpec } from "../src/spec.js";

const arrayProp: ParamSpec = { name: "event_types", type: "array", required: false };
const jsonProp: ParamSpec = { name: "discount", type: "json", required: false };

describe("coerceValue — array flags", () => {
  it("JSON-parses a JSON array of strings verbatim", () => {
    expect(coerceValue(arrayProp, '["guest.registered","ticket.registered"]')).toEqual([
      "guest.registered",
      "ticket.registered",
    ]);
  });

  it("JSON-parses a JSON array of objects (send-invites --guests shape)", () => {
    const guests = coerceValue(
      { ...arrayProp, name: "guests" },
      '[{"email":"alice@example.com","name":"Alice"},{"email":"bob@example.com"}]',
    );
    expect(guests).toEqual([{ email: "alice@example.com", name: "Alice" }, { email: "bob@example.com" }]);
  });

  it("keeps the comma-separated convenience form", () => {
    expect(coerceValue(arrayProp, "a,b, c")).toEqual(["a", "b", "c"]);
  });

  it("wraps a single bare value in an array", () => {
    expect(coerceValue(arrayProp, "guest.registered")).toEqual(["guest.registered"]);
  });

  it("throws a clear error on malformed JSON arrays instead of sending fragments", () => {
    expect(() => coerceValue(arrayProp, '["unterminated')).toThrow(/JSON array/);
  });
});

describe("coerceValue — other types", () => {
  it("parses json-typed props", () => {
    expect(coerceValue(jsonProp, '{"discount_type":"percent","percent_off":20}')).toEqual({
      discount_type: "percent",
      percent_off: 20,
    });
  });

  it("coerces booleans and numbers", () => {
    expect(coerceValue({ name: "is_hidden", type: "boolean", required: false }, "true")).toBe(true);
    expect(coerceValue({ name: "cents", type: "integer", required: false }, "1500")).toBe(1500);
  });
});
