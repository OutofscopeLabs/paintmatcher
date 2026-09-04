/** Matches a paint detection (from the vision model, or typed by hand) to catalog entries. */
import type { Brand, Paint } from "./types";
import { ALL_PAINTS, paintsByCode } from "./catalog";
import { dice, normalize, normalizeCode, wordOverlap } from "./text";

export interface Detection {
  /** Brand as read from the pot; "other" when it is not one of the supported brands. */
  brand: Brand | "other" | "unknown";
  /** Product line if legible, e.g. "Layer", "Speedpaint 2.0", "Model Color". */
  range?: string;
  /** Paint name as read from the label. */
  name: string;
  /** Product code if printed, e.g. "70.950", "WP3001". */
  code?: string;
  /** Model's confidence 0..1 that the reading is right. */
  confidence: number;
  /** Number of identical pots seen. */
  count: number;
  /** Raw label text or a note about legibility. */
  labelText?: string;
  /** Approximate hex of the pot cap / swatch, if visible. */
  hexGuess?: string;
}

export interface MatchCandidate {
  paint: Paint;
  /** 0..1 — 1 is an exact code or name match within the right brand. */
  score: number;
  reason: "code" | "name" | "fuzzy";
}

export interface MatchResult {
  detection: Detection;
  best?: MatchCandidate;
  candidates: MatchCandidate[];
}

const RANGE_ALIASES: Record<string, string[]> = {
  "warpaints fanatic": ["fanatic", "warpaints", "warpaint"],
  "speedpaint 2.0": ["speedpaint", "speed paint", "speedpaints"],
  "model color": ["model colour", "mc"],
  "game color": ["game colour", "gc"],
  "xpress color": ["xpress", "express color", "express colour"],
  "metal color": ["metal colour"],
};

function rangeMatches(detRange: string | undefined, paintRange: string): number {
  if (!detRange) return 0;
  const d = normalize(detRange), p = normalize(paintRange);
  if (!d) return 0;
  if (d === p || p.includes(d) || d.includes(p)) return 1;
  const aliases = RANGE_ALIASES[p] ?? [];
  if (aliases.some((a) => d.includes(a))) return 1;
  return -1;
}

/** Score every catalog paint against a detection and return the ranked candidates. */
export function matchDetection(det: Detection, limit = 5): MatchResult {
  const name = normalize(det.name);
  const candidates: MatchCandidate[] = [];

  // 1. Product code is the strongest signal (Vallejo / Army Painter print it prominently).
  if (det.code) {
    for (const p of paintsByCode(det.code)) {
      const brandOk = det.brand === p.brand || det.brand === "unknown" || det.brand === "other";
      const nameSim = name ? dice(name, normalize(p.name)) : 1;
      candidates.push({ paint: p, score: brandOk ? Math.max(0.9, 0.9 + nameSim * 0.1) : 0.6, reason: "code" });
    }
  }

  // 2. Name similarity, boosted by brand and range agreement.
  if (name) {
    for (const p of ALL_PAINTS) {
      if (candidates.some((c) => c.paint.id === p.id)) continue;
      const pn = normalize(p.name);
      let sim = Math.max(dice(name, pn), wordOverlap(name, pn) * 0.9);
      if (sim < 0.45) continue;
      const exact = sim >= 0.999;
      if (det.brand !== "unknown" && det.brand !== "other") {
        if (det.brand === p.brand) sim += 0.08;
        else sim -= 0.35; // same name in a different brand (Vallejo "Black" vs Citadel) should not win
      }
      const r = rangeMatches(det.range, p.range);
      if (r > 0) sim += 0.06;
      else if (r < 0) sim -= 0.12;
      // With no range read, prefer the brush ranges over airbrush/spray lines, whose bottles say so on the label.
      else if (/\bair\b|spray/i.test(p.range)) sim -= 0.03;
      // A code that exists but did not match is a strong negative for that paint.
      if (det.code && p.code && normalizeCode(det.code) !== normalizeCode(p.code)) sim -= 0.15;
      candidates.push({ paint: p, score: Math.max(0, sim), reason: exact ? "name" : "fuzzy" });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  // Sort on the raw score (bonuses can push it past 1), then clamp for display.
  const top = candidates.slice(0, limit).map((c) => ({ ...c, score: Math.min(1, c.score) }));
  const best = top[0] && top[0].score >= 0.6 ? top[0] : undefined;
  return { detection: det, best, candidates: top };
}

export function matchAll(dets: Detection[]): MatchResult[] {
  return dets.map((d) => matchDetection(d));
}
