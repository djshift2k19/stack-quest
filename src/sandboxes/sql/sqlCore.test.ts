import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lineFromPosition, runSqlJob, sameRows } from "./sqlCore";

const setup = `
CREATE TABLE learners (id serial PRIMARY KEY, name text NOT NULL, city text, xp int NOT NULL DEFAULT 0);
INSERT INTO learners (name, city, xp) VALUES ('Thandi', 'Durban', 120), ('Sipho', 'Soweto', 40), ('Aisha', 'Cape Town', 300);
`;

const baseTest = { orderMatters: false };

describe("SQL helpers", () => {
  it("compares rows with or without order, treating 3 and '3' alike", () => {
    expect(sameRows([[1], [2]], [[2], [1]], false)).toBe(true);
    expect(sameRows([[1], [2]], [[2], [1]], true)).toBe(false);
    expect(sameRows([[3n]], [["3"]], true)).toBe(true);
  });

  it("turns an error position into a line number", () => {
    expect(lineFromPosition("SELECT *\nFROM learner", 15)).toBe(2);
    expect(lineFromPosition("x", undefined)).toBeUndefined();
  });
});

describe("running SQL against real Postgres (PGlite)", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await PGlite.create();
  }, 30_000);
  afterAll(async () => {
    await db.close();
  });

  it("passes when the learner's rows match the model answer", async () => {
    const r = await runSqlJob(db, {
      setup,
      code: "SELECT name FROM learners WHERE xp > 100;",
      tests: [{ ...baseTest, name: "shows learners with more than 100 XP", sameResultAs: "SELECT name FROM learners WHERE xp > 100" }],
    });
    expect(r.results[0].passed).toBe(true);
    expect(r.table?.columns).toEqual(["name"]);
    expect(r.table?.rows).toHaveLength(2);
  });

  it("fails kindly when rows differ, and notices order when it matters", async () => {
    const r = await runSqlJob(db, {
      setup,
      code: "SELECT name FROM learners ORDER BY name;",
      tests: [
        { ...baseTest, name: "highest XP first", sameResultAs: "SELECT name FROM learners ORDER BY xp DESC", orderMatters: true },
        { ...baseTest, name: "only Durban", sameResultAs: "SELECT name FROM learners WHERE city = 'Durban'" },
      ],
    });
    expect(r.results[0]).toMatchObject({ passed: false, message: expect.stringContaining("order") });
    expect(r.results[1].message).toContain("expected 1 row, got 3");
  });

  it("checks the database after an INSERT", async () => {
    const r = await runSqlJob(db, {
      setup,
      code: "INSERT INTO learners (name, city) VALUES ('Lerato', 'Pretoria');",
      tests: [{ ...baseTest, name: "Lerato was added", check: "SELECT count(*) FROM learners WHERE name = 'Lerato'", expect: [[1]] }],
    });
    expect(r.results[0].passed).toBe(true);
    expect(r.summary).toContain("INSERT");
  });

  it("reports SQL errors with a line number, and starts fresh each run", async () => {
    const r = await runSqlJob(db, { setup, code: "SELECT name\nFROM learner;", tests: [{ ...baseTest, name: "t", sameResultAs: "SELECT 1" }] });
    expect(r.error?.message).toBe('relation "learner" does not exist');
    expect(r.error?.line).toBe(2);
    // The INSERT from the previous test is gone: each run starts clean.
    const again = await runSqlJob(db, { setup, code: "SELECT count(*) FROM learners;", tests: [] });
    expect(String(again.table?.rows[0][0])).toBe("3");
  });
});
