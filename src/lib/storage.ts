/** Client-side collection persistence (localStorage) with JSON import/export. */
import type { Brand, PaintType } from "./types";

export interface OwnedPaint {
  paintId: string;
  qty: number;
  addedAt: string;
  source: "photo" | "manual" | "import";
  note?: string;
}

/** A pot the recogniser could not map onto the catalog; kept so the collection is still complete. */
export interface CustomPaint {
  id: string; // "custom-<slug>"
  brand: Brand | "other";
  range?: string;
  name: string;
  code?: string;
  hex: string;
  type: PaintType;
  addedAt: string;
}

export interface Collection {
  version: 1;
  owned: OwnedPaint[];
  custom: CustomPaint[];
}

const KEY = "paintmatcher.collection.v1";

export const EMPTY: Collection = { version: 1, owned: [], custom: [] };

export function loadCollection(): Collection {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Collection>;
    return { version: 1, owned: parsed.owned ?? [], custom: parsed.custom ?? [] };
  } catch {
    return EMPTY;
  }
}

export function saveCollection(c: Collection): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* storage unavailable (private mode, quota) — keep going in memory */
  }
}

export function addOwned(c: Collection, paintId: string, qty: number, source: OwnedPaint["source"]): Collection {
  const existing = c.owned.find((o) => o.paintId === paintId);
  if (existing) {
    return { ...c, owned: c.owned.map((o) => (o.paintId === paintId ? { ...o, qty: o.qty + qty } : o)) };
  }
  return { ...c, owned: [...c.owned, { paintId, qty, addedAt: new Date().toISOString(), source }] };
}

export function setQty(c: Collection, paintId: string, qty: number): Collection {
  if (qty <= 0) return { ...c, owned: c.owned.filter((o) => o.paintId !== paintId), custom: c.custom.filter((x) => x.id !== paintId) };
  return { ...c, owned: c.owned.map((o) => (o.paintId === paintId ? { ...o, qty } : o)) };
}

export function addCustom(c: Collection, custom: CustomPaint, qty: number): Collection {
  const withCustom = c.custom.some((x) => x.id === custom.id) ? c : { ...c, custom: [...c.custom, custom] };
  return addOwned(withCustom, custom.id, qty, "photo");
}

export function exportJson(c: Collection): string {
  return JSON.stringify(c, null, 2);
}

export function importJson(text: string): Collection {
  const parsed = JSON.parse(text) as Partial<Collection>;
  if (!Array.isArray(parsed.owned)) throw new Error("Not a PaintMatcher export: missing owned[]");
  return { version: 1, owned: parsed.owned, custom: Array.isArray(parsed.custom) ? parsed.custom : [] };
}
