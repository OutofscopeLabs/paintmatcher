import { describe, expect, it } from "vitest";
import { dice, normalize, normalizeCode, slug, wordOverlap } from "@/lib/text";

describe("text helpers", () => {
  it("slugs names", () => {
    expect(slug("'Ardcoat")).toBe("ardcoat");
    expect(slug("Garaghak's Sewer")).toBe("garaghaks-sewer");
    expect(slug("Speedpaint 2.0")).toBe("speedpaint-2-0");
  });
  it("normalises codes", () => {
    expect(normalizeCode("70,950")).toBe("70.950");
    expect(normalizeCode("70950")).toBe("70.950");
    expect(normalizeCode("WP 3001")).toBe("wp3001");
    expect(normalizeCode("72.001")).toBe("72.001");
  });
  it("fuzzy similarity tolerates OCR slips", () => {
    expect(dice(normalize("Mephiston Red"), normalize("Mephiston Red"))).toBe(1);
    expect(dice(normalize("Mephlston Red"), normalize("Mephiston Red"))).toBeGreaterThan(0.75);
    expect(dice(normalize("Abaddon Black"), normalize("Mephiston Red"))).toBeLessThan(0.3);
    expect(wordOverlap("flat red", "red")).toBe(0.5);
  });
});
