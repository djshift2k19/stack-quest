/**
 * Small helpers that answer questions about progress,
 * e.g. "how much of this trail is done?" or "what should I do next?".
 */

import { allUnits, type Catalog, type CatalogModule, type CatalogTrail, type CatalogUnit } from "@/lib/content/catalog";
import type { ProgressState } from "@/lib/gamification/progress";

export function unitDone(state: ProgressState, unitKey: string): boolean {
  return Boolean(state.units[unitKey]);
}

export function fractionDone(state: ProgressState, units: CatalogUnit[]): number {
  if (units.length === 0) return 0;
  return units.filter((u) => unitDone(state, u.key)).length / units.length;
}

export function moduleFraction(state: ProgressState, module: CatalogModule): number {
  return fractionDone(state, module.units);
}

export function trailFraction(state: ProgressState, trail: CatalogTrail): number {
  return fractionDone(state, trail.modules.flatMap((m) => m.units));
}

/** The first unfinished unit, in learning order. */
export function nextUnit(state: ProgressState, catalog: Catalog): CatalogUnit | undefined {
  return allUnits(catalog).find((u) => !unitDone(state, u.key));
}

export function unitHref(unitKey: string): string {
  return `/trails/${unitKey}`;
}
