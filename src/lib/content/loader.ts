/**
 * The content loader: turns the `content/` folder into data the app can use.
 *
 * Folder layout (numbers at the start set the order):
 *
 *   content/trails/01-how-computers-work/trail.yaml
 *   content/trails/01-how-computers-work/01-files-and-programs/module.yaml
 *   content/trails/01-how-computers-work/01-files-and-programs/01-what-is-a-computer.mdx
 *
 * This runs on the server only (it reads files from disk). The browser
 * never runs it: it receives the finished pages and the small catalog.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { z } from "zod";
import type { Catalog, CatalogModule, CatalogTrail } from "./catalog";
import {
  glossarySchema,
  moduleSchema,
  trailSchema,
  unitFrontmatterSchema,
  type GlossaryEntry,
  type UnitFrontmatter,
} from "./schema";

export const CONTENT_DIR = path.join(process.cwd(), "content", "trails");
export const GLOSSARY_FILE = path.join(process.cwd(), "content", "glossary.yaml");

export class ContentError extends Error {
  constructor(file: string, problem: string) {
    super(`Problem in lesson file ${path.relative(process.cwd(), file)}:\n${problem}`);
    this.name = "ContentError";
  }
}

function check<T>(schema: z.ZodType<T>, data: unknown, file: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const problems = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(file)"}: ${i.message}`)
      .join("\n");
    throw new ContentError(file, problems);
  }
  return result.data;
}

/** Split an .mdx file into its YAML header ("frontmatter") and its body. */
export function splitFrontmatter(source: string, file: string): { data: unknown; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);
  if (!match) throw new ContentError(file, "  - the file must start with a --- header block");
  return { data: parseYaml(match[1]), body: match[2] };
}

/** Sorted folder entries, ignoring hidden files like .DS_Store. */
async function list(dir: string, kind: "dir" | "file"): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => !e.name.startsWith(".") && (kind === "dir" ? e.isDirectory() : e.isFile()))
    .map((e) => e.name)
    .sort();
}

async function readYaml(file: string): Promise<unknown> {
  return parseYaml(await readFile(file, "utf8"));
}

export interface LoadedUnit {
  key: string;
  meta: UnitFrontmatter;
  body: string;
  file: string;
}

interface LoadedContent {
  catalog: Catalog;
  units: Map<string, LoadedUnit>;
  glossary: GlossaryEntry[];
}

let cache: Promise<LoadedContent> | undefined;

async function loadEverything(): Promise<LoadedContent> {
  const trails: CatalogTrail[] = [];
  const units = new Map<string, LoadedUnit>();
  const seenTrailIds = new Set<string>();

  for (const trailDir of await list(CONTENT_DIR, "dir")) {
    const trailPath = path.join(CONTENT_DIR, trailDir);
    const trailFile = path.join(trailPath, "trail.yaml");
    const trail = check(trailSchema, await readYaml(trailFile), trailFile);
    if (seenTrailIds.has(trail.id)) throw new ContentError(trailFile, `  - trail id "${trail.id}" is used twice`);
    seenTrailIds.add(trail.id);

    const modules: CatalogModule[] = [];
    for (const moduleDir of await list(trailPath, "dir")) {
      const modulePath = path.join(trailPath, moduleDir);
      const moduleFile = path.join(modulePath, "module.yaml");
      const mod = check(moduleSchema, await readYaml(moduleFile), moduleFile);
      const moduleKey = `${trail.id}/${mod.id}`;
      if (modules.some((m) => m.id === mod.id)) {
        throw new ContentError(moduleFile, `  - module id "${mod.id}" is used twice in this trail`);
      }

      const catalogUnits: CatalogModule["units"] = [];
      for (const unitFile of (await list(modulePath, "file")).filter((f) => f.endsWith(".mdx"))) {
        const file = path.join(modulePath, unitFile);
        const { data, body } = splitFrontmatter(await readFile(file, "utf8"), file);
        const meta = check(unitFrontmatterSchema, data, file);
        const key = `${moduleKey}/${meta.id}`;
        if (units.has(key)) throw new ContentError(file, `  - unit id "${meta.id}" is used twice in this module`);
        units.set(key, { key, meta, body, file });
        catalogUnits.push({ key, id: meta.id, title: meta.title, type: meta.type, minutes: meta.minutes, xp: meta.xp });
      }

      modules.push({
        key: moduleKey,
        id: mod.id,
        title: mod.title,
        summary: mod.summary,
        goals: mod.goals,
        badge: mod.badge,
        units: catalogUnits,
      });
    }

    trails.push({ ...trail, modules });
  }

  const glossary = check(glossarySchema, await readYaml(GLOSSARY_FILE), GLOSSARY_FILE);
  const seenTerms = new Set<string>();
  for (const entry of glossary) {
    if (seenTerms.has(entry.id)) throw new ContentError(GLOSSARY_FILE, `  - glossary id "${entry.id}" is used twice`);
    seenTerms.add(entry.id);
  }

  // Every <Term word="..."> in a lesson must have a glossary entry.
  for (const unit of units.values()) {
    for (const match of unit.body.matchAll(/<Term\s+word="([^"]+)"/g)) {
      if (!seenTerms.has(match[1])) {
        throw new ContentError(unit.file, `  - <Term word="${match[1]}"> has no entry in content/glossary.yaml`);
      }
    }
  }

  glossary.sort((a, b) => a.term.localeCompare(b.term));
  return { catalog: { trails }, units, glossary };
}

function load(): Promise<LoadedContent> {
  // In development, re-read files every time so lesson edits show up straight away.
  if (process.env.NODE_ENV === "development") return loadEverything();
  cache ??= loadEverything();
  return cache;
}

// "use cache" tells Next.js the result only changes when lesson files change,
// so pages can be built ahead of time instead of on every visit.
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  return (await load()).catalog;
}

export async function getUnit(trailId: string, moduleId: string, unitId: string): Promise<LoadedUnit | undefined> {
  "use cache";
  return (await load()).units.get(`${trailId}/${moduleId}/${unitId}`);
}

export async function getGlossary(): Promise<GlossaryEntry[]> {
  "use cache";
  return (await load()).glossary;
}
