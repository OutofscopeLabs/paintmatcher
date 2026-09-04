import { describe, expect, it } from "vitest";
import { matchDetection, type Detection } from "@/lib/match";

const det = (d: Partial<Detection>): Detection => ({ brand: "unknown", name: "", confidence: 0.9, count: 1, ...d });

describe("matcher", () => {
  it("matches a Vallejo bottle by code even with a mangled name", () => {
    const r = matchDetection(det({ brand: "vallejo", code: "70.950", name: "Blak" }));
    expect(r.best?.paint.id).toBe("vallejo-model-color-black");
    expect(r.best?.reason).toBe("code");
  });
  it("prefers the right brand when names collide", () => {
    const r = matchDetection(det({ brand: "vallejo", range: "Game Color", name: "Black" }));
    expect(r.best?.paint.id).toBe("vallejo-game-color-black");
    const c = matchDetection(det({ brand: "citadel", name: "Abaddon Black" }));
    expect(c.best?.paint.id).toBe("citadel-base-abaddon-black");
  });
  it("tolerates OCR slips in Citadel names", () => {
    const r = matchDetection(det({ brand: "citadel", range: "Base", name: "Mephlston Red" }));
    expect(r.best?.paint.name).toBe("Mephiston Red");
    expect(r.best?.reason).toBe("fuzzy");
  });
  it("uses the range to disambiguate", () => {
    const r = matchDetection(det({ brand: "army_painter", range: "Washes", name: "Strong Tone" }));
    expect(r.best?.paint.range).toMatch(/Wash/);
  });
  it("returns no best match for nonsense", () => {
    const r = matchDetection(det({ brand: "other", name: "Zorbulon Fizz 9000" }));
    expect(r.best).toBeUndefined();
  });
  it("offers alternatives", () => {
    const r = matchDetection(det({ brand: "citadel", name: "Red" }));
    expect(r.candidates.length).toBeGreaterThan(1);
  });
});
