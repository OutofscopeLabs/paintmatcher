/** String normalisation and fuzzy similarity used by the catalog matcher. */

export function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Lowercase, strip punctuation/diacritics, collapse whitespace. Used for name comparison. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Normalise a product code: "WP 3001" → "wp3001", "70,950" → "70.950", "70950" → "70.950". */
export function normalizeCode(code: string): string {
  let c = code.toLowerCase().replace(/\s+/g, "").replace(/,/g, ".");
  const m = /^(\d{2})\.?(\d{3})$/.exec(c);
  if (m) c = `${m[1]}.${m[2]}`;
  return c;
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  const t = ` ${s} `;
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}

/** Sørensen–Dice coefficient over character bigrams, 0..1. Tolerant of OCR slips and word-order swaps. */
export function dice(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = bigrams(a), B = bigrams(b);
  let inter = 0, total = 0;
  for (const [g, n] of A) { total += n; const m = B.get(g); if (m) inter += Math.min(n, m); }
  for (const n of B.values()) total += n;
  return (2 * inter) / total;
}

/** Word-level Jaccard, helps when one label is a strict subset ("Red" vs "Flat Red"). */
export function wordOverlap(a: string, b: string): number {
  const A = new Set(a.split(" ").filter(Boolean)), B = new Set(b.split(" ").filter(Boolean));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / Math.max(A.size, B.size);
}
