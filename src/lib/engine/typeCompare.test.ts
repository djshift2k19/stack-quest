import { describe, expect, it } from "vitest";
import { firstMismatch, typeHints } from "./typeCompare";

describe("type-the-code comparison", () => {
  it("matches when only trailing spaces differ", () => {
    expect(firstMismatch('console.log("Hi");   \n\n', 'console.log("Hi");')).toBeNull();
  });

  it("finds the first difference by line and column", () => {
    const m = firstMismatch('let a = 1;\nconsole.log(a;', "let a = 1;\nconsole.log(a);");
    expect(m).toMatchObject({ line: 2, column: 14, expected: '")"', found: '";"' });
  });

  it("notices missing lines", () => {
    expect(firstMismatch("a", "a\nb")).toMatchObject({ line: 2, found: "nothing (the line is missing)" });
  });

  it("builds three increasingly helpful hints", () => {
    const hints = typeHints(firstMismatch("let x = 1", "let x = 1;"));
    expect(hints).toHaveLength(3);
    expect(hints[0]).toContain("line 1");
    expect(hints[1]).toContain('the example has ";"');
    expect(hints[2]).toContain("let x = 1;");
  });
});
