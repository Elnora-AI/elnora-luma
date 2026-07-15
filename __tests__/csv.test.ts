import { describe, expect, it } from "vitest";
import { csvEscape, toCsv } from "../src/csv.js";

describe("csvEscape", () => {
  it("passes plain values through", () => {
    expect(csvEscape("hello")).toBe("hello");
    expect(csvEscape("õäöü 日本語")).toBe("õäöü 日本語");
  });

  it("quotes commas, quotes, and newlines per RFC 4180", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
    expect(csvEscape("cr\rlf")).toBe('"cr\rlf"');
  });
});

describe("toCsv", () => {
  it("renders header + rows with \\n endings and empty cells for null/undefined", () => {
    const csv = toCsv(["name", "amount"], [["Alice, Inc.", 1250], ["Bob", null]]);
    expect(csv).toBe('name,amount\n"Alice, Inc.",1250\nBob,\n');
  });

  it("is byte-stable for identical input", () => {
    const rows = [["x", 1]];
    expect(toCsv(["a", "b"], rows)).toBe(toCsv(["a", "b"], rows));
  });

  it("neutralizes spreadsheet formula prefixes in string cells (CSV injection)", () => {
    const csv = toCsv(
      ["name", "amount"],
      [['=HYPERLINK("https://evil.example")', "-12.34"], ["+1 555 000", 42], ["@handle", "0.00"]],
    );
    const lines = csv.split("\n");
    expect(lines[1]).toBe('"\'=HYPERLINK(""https://evil.example"")",-12.34'); // formula neutralized, numeric string exempt
    expect(lines[2]).toBe("'+1 555 000,42"); // number cell untouched
    expect(lines[3]).toBe("'@handle,0.00");
  });
});
