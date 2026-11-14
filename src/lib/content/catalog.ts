/**
 * The "catalog" is a lightweight table of contents: every trail, module and
 * unit, but without the lesson text. The browser gets this small list so it
 * can work out progress rings, badges and "what's next" without
 * downloading every lesson.
 */

export interface BadgeInfo {
  name: string;
  emoji: string;
}

export interface CatalogUnit {
  /** Unique address of the unit, e.g. "how-computers-work/files-and-programs/what-is-a-file". */
  key: string;
  id: string;
  title: string;
  type: string;
  minutes: number;
  xp: number;
}

export interface CatalogModule {
  /** e.g. "how-computers-work/files-and-programs" */
  key: string;
  id: string;
  title: string;
  summary: string;
  badge: BadgeInfo;
  units: CatalogUnit[];
}

export interface PlannedModule {
  title: string;
  goals: string[];
  units: string[];
}

export interface CatalogTrail {
  id: string;
  title: string;
  summary: string;
  status: "available" | "coming-soon";
  badge: BadgeInfo;
  modules: CatalogModule[];
  plannedModules: PlannedModule[];
}

export interface Catalog {
  trails: CatalogTrail[];
}

/** Every unit in learning order, across available trails. */
export function allUnits(catalog: Catalog): CatalogUnit[] {
  return catalog.trails
    .filter((t) => t.status === "available")
    .flatMap((t) => t.modules.flatMap((m) => m.units));
}

export function findModuleForUnit(
  catalog: Catalog,
  unitKey: string,
): { trail: CatalogTrail; module: CatalogModule } | undefined {
  for (const trail of catalog.trails) {
    for (const module of trail.modules) {
      if (module.units.some((u) => u.key === unitKey)) return { trail, module };
    }
  }
  return undefined;
}
