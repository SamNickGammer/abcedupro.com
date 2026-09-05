/**
 * A parser for phpMyAdmin / mysqldump `INSERT INTO ... VALUES (...)` output.
 *
 * Hand-rolled rather than regex-based, because the data contains the two
 * things regexes get wrong here: JSON in the `marks` column (braces, quotes,
 * colons) and apostrophes inside names, both of which arrive backslash-escaped
 * inside single-quoted strings.
 *
 * The tokenizer walks the VALUES list character by character and tracks quote
 * state, so an escaped quote inside a value can never be mistaken for the end
 * of that value.
 */

export type SqlValue = string | number | null;
export type Row = Record<string, SqlValue>;

/** Reads every row of every `INSERT INTO \`table\`` statement in the dump. */
export function parseInserts(dump: string, table: string): Row[] {
  const rows: Row[] = [];
  const needle = `INSERT INTO \`${table}\``;

  let cursor = 0;

  while (true) {
    const start = dump.indexOf(needle, cursor);
    if (start === -1) break;

    // Column list, between the first "(" after the table name and its ")".
    const columnsOpen = dump.indexOf("(", start + needle.length);
    const columnsClose = dump.indexOf(")", columnsOpen);
    const columns = dump
      .slice(columnsOpen + 1, columnsClose)
      .split(",")
      .map((name) => name.trim().replace(/^`|`$/g, ""));

    const valuesAt = dump.toUpperCase().indexOf("VALUES", columnsClose);
    const { tuples, end } = readTuples(dump, valuesAt + "VALUES".length);

    for (const tuple of tuples) {
      if (tuple.length !== columns.length) {
        throw new Error(
          `${table}: row has ${tuple.length} values but ${columns.length} columns:\n${JSON.stringify(tuple).slice(0, 300)}`,
        );
      }

      rows.push(Object.fromEntries(columns.map((name, index) => [name, tuple[index]])));
    }

    cursor = end;
  }

  return rows;
}

/** Reads `(a, b), (c, d);` starting at `from`, stopping at the statement's `;`. */
function readTuples(sql: string, from: number): { tuples: SqlValue[][]; end: number } {
  const tuples: SqlValue[][] = [];

  let i = from;
  let current: SqlValue[] | null = null;
  let token = "";
  let quoted = false;
  let escaped = false;
  let tokenWasQuoted = false;

  const pushToken = () => {
    if (current === null) return;
    current.push(finishToken(token, tokenWasQuoted));
    token = "";
    tokenWasQuoted = false;
  };

  while (i < sql.length) {
    const char = sql[i];

    if (quoted) {
      if (escaped) {
        token += unescape(char);
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "'") {
        // A doubled '' inside a quoted string is a literal apostrophe.
        if (sql[i + 1] === "'") {
          token += "'";
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        token += char;
      }

      i += 1;
      continue;
    }

    if (char === "'") {
      // Whitespace between the comma and the opening quote is separator, not
      // data — without this every quoted value gains a leading space.
      if (token.trim() === "") token = "";
      quoted = true;
      tokenWasQuoted = true;
      i += 1;
      continue;
    }

    if (char === "(" && current === null) {
      current = [];
      i += 1;
      continue;
    }

    if (char === "," && current !== null) {
      pushToken();
      i += 1;
      continue;
    }

    if (char === ")" && current !== null) {
      pushToken();
      tuples.push(current);
      current = null;
      i += 1;
      continue;
    }

    if (char === ";" && current === null) {
      i += 1;
      break;
    }

    if (current !== null) token += char;
    i += 1;
  }

  return { tuples, end: i };
}

function unescape(char: string): string {
  switch (char) {
    case "n": return "\n";
    case "r": return "\r";
    case "t": return "\t";
    case "0": return "\0";
    case "b": return "\b";
    case "Z": return "\x1a";
    default: return char; // covers \' \" \\ and anything else
  }
}

function finishToken(raw: string, wasQuoted: boolean): SqlValue {
  if (wasQuoted) return raw;

  const trimmed = raw.trim();

  if (trimmed === "" || trimmed.toUpperCase() === "NULL") return null;

  const asNumber = Number(trimmed);
  return Number.isFinite(asNumber) ? asNumber : trimmed;
}

// ------------------------------------------------------------------ helpers

export function text(value: SqlValue): string | null {
  if (value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

export function requiredText(value: SqlValue, fallback = ""): string {
  return text(value) ?? fallback;
}

export function int(value: SqlValue, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

export function bool(value: SqlValue): boolean {
  return value === 1 || value === "1";
}

export function decimal(value: SqlValue): string | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : null;
}

/** MySQL DATE (`YYYY-MM-DD`) pinned to UTC midnight so it round-trips. */
export function dateOnly(value: SqlValue): Date | null {
  const raw = text(value);
  if (!raw || raw.startsWith("0000")) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) return null;

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

/** MySQL TIMESTAMP. The dump is written with `SET time_zone = "+00:00"`. */
export function timestamp(value: SqlValue, fallback: Date): Date {
  const raw = text(value);
  if (!raw || raw.startsWith("0000")) return fallback;

  const parsed = new Date(raw.replace(" ", "T") + "Z");
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

/** The DB enum stores "Very Good" with a space; the Prisma member cannot. */
export function performance(value: SqlValue) {
  const raw = text(value);
  if (!raw) return null;

  const map: Record<string, "Excellent" | "Very_Good" | "Good" | "Failure"> = {
    Excellent: "Excellent",
    "Very Good": "Very_Good",
    Good: "Good",
    Failure: "Failure",
  };

  return map[raw] ?? null;
}

export function marksheetStage(value: SqlValue): "started" | "pending" | "verified" {
  const raw = text(value);
  return raw === "pending" || raw === "verified" ? raw : "started";
}

/**
 * Reduces a stored photo reference to its object key.
 *
 * Production rows point at two different hosts, both of which served the same
 * files:
 *   http://abcedupro.com/student_photo/412/x.jpg
 *   http://ng.abcedupro.com/api/public/student_photo/412/x.jpg
 *
 * Both become `student_photo/412/x.jpg`, which is the key the files are
 * uploaded under, so a single R2 layout serves rows written by either.
 */
export function photoKey(value: SqlValue): string | null {
  const raw = text(value);
  if (!raw) return null;

  let path = raw;

  // Strip scheme + host.
  path = path.replace(/^https?:\/\/[^/]+/i, "");
  // Strip the /api/public prefix the second host used.
  path = path.replace(/^\/api\/public/i, "");
  path = path.replace(/^\/+/, "");

  try {
    path = decodeURIComponent(path);
  } catch {
    // Leave a malformed escape sequence as-is rather than dropping the row.
  }

  return path || null;
}
