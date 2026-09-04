import type { Brand, Paint } from "./types";
import { citadel } from "@/data/citadel";
import { armyPainter } from "@/data/army_painter";
import { vallejo } from "@/data/vallejo";
import { normalize, normalizeCode } from "./text";

export const BRAND_LABEL: Record<Brand, string> = {
  citadel: "Citadel",
  army_painter: "The Army Painter",
  vallejo: "Vallejo",
};

export const ALL_PAINTS: Paint[] = [...citadel, ...armyPainter, ...vallejo];

const byId = new Map<string, Paint>();
const byCode = new Map<string, Paint[]>();
const byNormName = new Map<string, Paint[]>();
for (const p of ALL_PAINTS) {
  byId.set(p.id, p);
  if (p.code) {
    const k = normalizeCode(p.code);
    byCode.set(k, [...(byCode.get(k) ?? []), p]);
  }
  const n = normalize(p.name);
  byNormName.set(n, [...(byNormName.get(n) ?? []), p]);
}

export function getPaint(id: string): Paint | undefined {
  return byId.get(id);
}

export function paintsByCode(code: string): Paint[] {
  return byCode.get(normalizeCode(code)) ?? [];
}

export function paintsByName(name: string): Paint[] {
  return byNormName.get(normalize(name)) ?? [];
}

export function rangesFor(brand: Brand): string[] {
  const seen = new Set<string>();
  for (const p of ALL_PAINTS) if (p.brand === brand) seen.add(p.range);
  return [...seen];
}

/** Compact one-line-per-paint listing given to the vision model so it can snap to canonical names. */
export function catalogListing(): string {
  const lines: string[] = [];
  for (const b of Object.keys(BRAND_LABEL) as Brand[]) {
    lines.push(`## ${BRAND_LABEL[b]} (brand id: ${b})`);
    for (const r of rangesFor(b)) {
      lines.push(`### ${r}`);
      for (const p of ALL_PAINTS) if (p.brand === b && p.range === r) lines.push(p.code ? `${p.code} ${p.name}` : p.name);
    }
  }
  return lines.join("\n");
}

/** Simple substring search across name, code, range and brand. */
export function searchPaints(query: string, paints: Paint[] = ALL_PAINTS): Paint[] {
  const q = normalize(query);
  if (!q) return paints;
  const qc = normalizeCode(query);
  return paints.filter((p) => {
    if (p.code && normalizeCode(p.code).includes(qc)) return true;
    const hay = normalize(`${BRAND_LABEL[p.brand]} ${p.range} ${p.name} ${(p.tags ?? []).join(" ")}`);
    return q.split(" ").every((w) => hay.includes(w));
  });
}
