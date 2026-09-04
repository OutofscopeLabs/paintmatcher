import { describe, expect, it } from "vitest";
import { ALL_PAINTS, catalogListing, paintsByCode, searchPaints } from "@/lib/catalog";
import { hexToRgb } from "@/lib/color";
import { slug } from "@/lib/text";

const TYPES = new Set(["base", "layer", "shade", "contrast", "metallic", "dry", "technical", "glaze", "effect", "primer", "air", "varnish"]);

describe("catalog integrity", () => {
  it("has a substantial catalog for all three brands", () => {
    const byBrand = new Map<string, number>();
    for (const p of ALL_PAINTS) byBrand.set(p.brand, (byBrand.get(p.brand) ?? 0) + 1);
    expect(byBrand.get("citadel")).toBeGreaterThan(300);
    expect(byBrand.get("army_painter")).toBeGreaterThan(500);
    expect(byBrand.get("vallejo")).toBeGreaterThan(900);
  });
  it("has unique ids that follow the slug convention", () => {
    const ids = new Set<string>();
    for (const p of ALL_PAINTS) {
      expect(ids.has(p.id), `duplicate id ${p.id}`).toBe(false);
      ids.add(p.id);
      expect(p.id.startsWith(`${p.brand}-${slug(p.range)}-`), `id ${p.id} should start with ${p.brand}-${slug(p.range)}-`).toBe(true);
    }
  });
  it("has valid hex colours and known types", () => {
    for (const p of ALL_PAINTS) {
      expect(p.hex, p.id).toMatch(/^#[0-9A-F]{6}$/);
      expect(() => hexToRgb(p.hex)).not.toThrow();
      expect(TYPES.has(p.type), `${p.id} type ${p.type}`).toBe(true);
    }
  });
  it("covers the current Army Painter ranges", () => {
    const ap = (range: string) => ALL_PAINTS.filter((p) => p.brand === "army_painter" && p.range === range).length;
    expect(ap("Warpaints Fanatic")).toBeGreaterThanOrEqual(160);
    expect(ap("Warpaints Fanatic Metallics")).toBe(18);
    expect(ap("Speedpaint 2.0")).toBeGreaterThanOrEqual(90);
    expect(ap("Warpaints Air")).toBeGreaterThan(100);
    expect(ALL_PAINTS.filter((p) => p.brand === "army_painter" && p.range === "Speedpaint 2.0" && p.finish === "metallic").length).toBe(10);
  });
  it("does not list the same paint twice within a range", () => {
    const seen = new Set<string>();
    for (const p of ALL_PAINTS) {
      const k = `${p.brand}|${p.range}|${p.name.toLowerCase()}|${p.code ?? ""}`;
      expect(seen.has(k), `duplicate ${k}`).toBe(false);
      seen.add(k);
    }
  });
  it("does not duplicate a code within a brand", () => {
    const seen = new Set<string>();
    for (const p of ALL_PAINTS) {
      if (!p.code) continue;
      const k = `${p.brand}:${p.code}`;
      expect(seen.has(k), `duplicate code ${k}`).toBe(false);
      seen.add(k);
    }
  });
  it("indexes by code and searches by name", () => {
    expect(paintsByCode("70.950")[0]?.name).toBe("Black");
    expect(paintsByCode("70950")[0]?.name).toBe("Black");
    expect(searchPaints("nuln").some((p) => p.name === "Nuln Oil")).toBe(true);
    expect(searchPaints("vallejo dead white")[0]?.name).toBe("Dead White");
  });
  it("produces a listing the vision prompt can use", () => {
    const listing = catalogListing();
    expect(listing).toContain("## Citadel");
    expect(listing).toContain("70.950 Black");
    expect(listing.split("\n").length).toBeGreaterThan(ALL_PAINTS.length);
  });
});
