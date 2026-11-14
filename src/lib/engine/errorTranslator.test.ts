import { describe, expect, it } from "vitest";
import { TIMEOUT_ERROR_NAME, translateError } from "./errorTranslator";

describe("error translator: JavaScript", () => {
  it("explains undefined names and points at the line", () => {
    const t = translateError({ name: "ReferenceError", message: "totl is not defined", line: 3 });
    expect(t.title).toContain('"totl"');
    expect(t.whereToLook).toContain("line 3");
  });

  it("explains reading a property of undefined", () => {
    const t = translateError({ name: "TypeError", message: "Cannot read properties of undefined (reading 'name')" });
    expect(t.title).toContain("undefined");
    expect(t.explanation).toContain(".name");
  });

  it("explains calling something that isn't a function", () => {
    expect(translateError({ name: "TypeError", message: "score is not a function" }).title).toContain("score");
  });

  it("explains const reassignment and syntax problems", () => {
    expect(translateError({ name: "TypeError", message: "Assignment to constant variable." }).title).toContain("const");
    expect(translateError({ name: "SyntaxError", message: "Unexpected end of input" }).title).toContain("before it's finished");
    expect(translateError({ name: "SyntaxError", message: "missing ) after argument list" }).title).toContain(")");
  });

  it("explains timeouts as a likely endless loop", () => {
    expect(translateError({ name: TIMEOUT_ERROR_NAME, message: "" }).explanation).toContain("loop");
  });

  it("falls back gracefully for unknown errors", () => {
    const t = translateError({ name: "WeirdError", message: "something odd" });
    expect(t.title).toContain("WeirdError");
  });
});

describe("error translator: SQL", () => {
  it("explains missing tables and columns", () => {
    expect(translateError({ name: "error", message: 'relation "learner" does not exist' }, "sql").title).toContain('"learner"');
    expect(translateError({ name: "error", message: 'column "nmae" does not exist' }, "sql").title).toContain('"nmae"');
  });

  it("explains syntax errors near a word", () => {
    expect(translateError({ name: "error", message: 'syntax error at or near "FROM"' }, "sql").whereToLook).toContain("FROM");
  });

  it("explains GROUP BY mistakes", () => {
    const msg = 'column "learners.name" must appear in the GROUP BY clause or be used in an aggregate function';
    expect(translateError({ name: "error", message: msg }, "sql").title).toContain("grouped");
  });
});
