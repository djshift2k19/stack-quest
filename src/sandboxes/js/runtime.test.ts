import { describe, expect, it } from "vitest";
import { createJsRuntime, JS_RUNTIME_SOURCE } from "./runtime";

const rt = createJsRuntime();

describe("JS runtime", () => {
  it("captures console output like a real console", async () => {
    const r = await rt.run({ code: `console.log("Hi", 2 + 2); console.log([1, "a"], { b: 2 });`, tests: [] });
    expect(r.logs.map((l) => l.text)).toEqual(["Hi 4", '[1, "a"] { b: 2 }']);
  });

  it("runs tests that can see the learner's variables and functions", async () => {
    const r = await rt.run({
      code: `function add(a, b) { return a + b; }\nconst total = add(1, 1);`,
      tests: [
        { name: "add works", code: "expect(add(2, 3)).toBe(5)" },
        { name: "total is 3", code: "expect(total).toBe(3)" },
      ],
    });
    expect(r.results).toEqual([
      { name: "add works", passed: true },
      { name: "total is 3", passed: false, message: "Expected 3 but got 2" },
    ]);
  });

  it("supports not, toEqual, toContain and toThrow", async () => {
    const r = await rt.run({
      code: `const list = [1, 2];`,
      tests: [
        { name: "a", code: "expect(list).toEqual([1, 2]); expect(list).not.toContain(3)" },
        { name: "b", code: "expect(() => { throw new Error('x') }).toThrow()" },
      ],
    });
    expect(r.results.every((t) => t.passed)).toBe(true);
  });

  it("reports a crash with the learner's line number", async () => {
    const r = await rt.run({ code: `const a = 1;\nconst b = 2;\nconsole.log(totl);`, tests: [{ name: "x", code: "" }] });
    expect(r.error).toMatchObject({ name: "ReferenceError", message: "totl is not defined", line: 3 });
    expect(r.results[0].passed).toBe(false);
  });

  it("answers fetch from pretend API routes and logs the requests", async () => {
    const r = await rt.run({
      code: `const res = await fetch("/api/learners/1");\nconst data = await res.json();\nconsole.log(res.status, data.name);`,
      tests: [],
      api: [{ method: "GET", path: "/api/learners/:id", status: 200, body: { name: "Thandi" } }],
    });
    expect(r.logs[0].text).toBe("200 Thandi");
    expect(r.requests).toEqual([{ method: "GET", path: "/api/learners/1", status: 200 }]);
  });

  it("lets learner code act as a pretend server", async () => {
    const r = await rt.run({
      code: `server.post("/api/todos", (req, res) => {\n  if (!req.body.title) return res.status(400).json({ error: "title is required" });\n  res.status(201).json({ id: 1, title: req.body.title });\n});`,
      tests: [
        {
          name: "creating a todo gives 201",
          code: `const res = await fetch("/api/todos", { method: "POST", body: JSON.stringify({ title: "Learn HTTP" }) });\nexpect(res.status).toBe(201);`,
        },
        {
          name: "a missing title gives 400",
          code: `const res = await fetch("/api/todos", { method: "POST", body: "{}" });\nexpect(res.status).toBe(400);`,
        },
        { name: "unknown paths give 404", code: `expect((await fetch("/nope")).status).toBe(404);` },
      ],
    });
    expect(r.results.every((t) => t.passed)).toBe(true);
  });

  it("is self-contained, so it still works after being turned into text", async () => {
    const fromText = new Function(`return ${JS_RUNTIME_SOURCE}`)() as ReturnType<typeof createJsRuntime>;
    const r = await fromText.run({ code: `console.log("still works")`, tests: [] });
    expect(r.logs[0].text).toBe("still works");
  });
});
