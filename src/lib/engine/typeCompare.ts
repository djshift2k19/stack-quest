/**
 * Compares what the learner typed with the target code, for "type the code"
 * units, and builds the three hints automatically from the first difference.
 */

export interface Mismatch {
  /** 1-based line and column of the first difference. */
  line: number;
  column: number;
  expected: string;
  found: string;
  expectedLine: string;
}

const lines = (s: string) =>
  s
    .replace(/\r\n/g, "\n")
    .replace(/\s+$/, "")
    .split("\n")
    .map((l) => l.trimEnd());

const describeChar = (c: string | undefined) =>
  c === undefined ? "the end of the line" : c === " " ? "a space" : c === "\t" ? "a tab" : `"${c}"`;

/** Returns null when they match (ignoring spaces at line ends). */
export function firstMismatch(typed: string, target: string): Mismatch | null {
  const a = lines(typed);
  const b = lines(target);
  const count = Math.max(a.length, b.length);
  for (let i = 0; i < count; i++) {
    const got = a[i] ?? "";
    const want = b[i] ?? "";
    if (got === want) continue;
    let col = 0;
    while (col < want.length && got[col] === want[col]) col++;
    return {
      line: i + 1,
      column: col + 1,
      expected: describeChar(want[col]),
      found: i >= a.length ? "nothing (the line is missing)" : describeChar(got[col]),
      expectedLine: want,
    };
  }
  return null;
}

export function typeHints(m: Mismatch | null): string[] {
  if (!m) return ["It matches. Press Check!", "", ""];
  return [
    `Compare line ${m.line} with the example, slowly.`,
    `On line ${m.line}, character ${m.column}: the example has ${m.expected} but you have ${m.found}.`,
    `Line ${m.line} should be exactly: ${m.expectedLine || "(an empty line)"}`,
  ];
}
