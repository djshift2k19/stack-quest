import { describe, expect, it } from "vitest";
import { allUnits } from "./catalog";
import { getCatalog, getUnit, splitFrontmatter } from "./loader";
import { unitFrontmatterSchema } from "./schema";

describe("content loader (real lesson files)", () => {
  it("loads every trail, module and unit without errors", async () => {
    const catalog = await getCatalog();
    expect(catalog.trails.length).toBeGreaterThanOrEqual(2);
    expect(allUnits(catalog).length).toBeGreaterThan(0);
  });

  it("keeps trails in folder-number order", async () => {
    const ids = (await getCatalog()).trails.map((t) => t.id);
    expect(ids[0]).toBe("how-computers-work");
  });

  it("gives every unit a unique key and a body", async () => {
    const catalog = await getCatalog();
    const keys = allUnits(catalog).map((u) => u.key);
    expect(new Set(keys).size).toBe(keys.length);
    const [trail, mod, unit] = keys[0].split("/");
    const loaded = await getUnit(trail, mod, unit);
    expect(loaded?.body.trim().length).toBeGreaterThan(50);
  });

  it("returns undefined for a unit that doesn't exist", async () => {
    expect(await getUnit("nope", "nope", "nope")).toBeUndefined();
  });
});

describe("frontmatter checks", () => {
  it("splits the header from the body", () => {
    const { data, body } = splitFrontmatter("---\nid: a\n---\nHello", "x.mdx");
    expect(data).toEqual({ id: "a" });
    expect(body).toBe("Hello");
  });

  it("rejects units longer than 10 minutes with a friendly message", () => {
    const result = unitFrontmatterSchema.safeParse({
      id: "long-one",
      title: "Too long",
      type: "reading",
      minutes: 25,
      goals: ["x"],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("units must take 10 minutes or less");
  });

  it("rejects ids with spaces or capitals", () => {
    const result = unitFrontmatterSchema.safeParse({ id: "What Is", title: "t", type: "reading", minutes: 3, goals: ["x"] });
    expect(result.success).toBe(false);
  });
});
