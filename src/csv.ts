/**
 * Minimal RFC 4180 CSV writer. `\n` line endings on every platform so the same
 * data always produces byte-identical output (git-diff-able scheduled artifacts).
 */
export function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** CSV-injection mitigation (OWASP): prefix `'` so spreadsheet apps treat the
 *  cell as text, never a live formula — guest names are attacker-controlled.
 *  Plain numeric strings (amount columns like "-1.00") are exempt so accounting
 *  values still import as numbers. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

function neutralize(value: string): string {
  return FORMULA_PREFIX.test(value) && !PLAIN_NUMBER.test(value) ? `'${value}` : value;
}

export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [header.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(
      row
        .map((cell) => {
          if (cell === null || cell === undefined) return "";
          if (typeof cell === "number") return String(cell);
          return csvEscape(neutralize(cell));
        })
        .join(","),
    );
  }
  return lines.join("\n") + "\n";
}
