import { describe, expect, it } from "vitest";
import { deltaEHex, hexToHsl, hexToRgb, hueFamily, isNeutral, rgbToHex, textOn, toneWords } from "@/lib/color";

describe("colour maths", () => {
  it("round-trips hex", () => {
    expect(rgbToHex(hexToRgb("#7A1B1B"))).toBe("#7A1B1B");
    expect(rgbToHex(hexToRgb("1f2a3c"))).toBe("#1F2A3C");
  });
  it("computes hsl", () => {
    const { h, s, l } = hexToHsl("#FF0000");
    expect(h).toBeCloseTo(0); expect(s).toBeCloseTo(1); expect(l).toBeCloseTo(0.5);
  });
  it("deltaE is zero for identical and larger for far colours", () => {
    expect(deltaEHex("#123456", "#123456")).toBe(0);
    expect(deltaEHex("#FF0000", "#0000FF")).toBeGreaterThan(deltaEHex("#FF0000", "#EE1100"));
  });
  it("classifies hue families", () => {
    expect(hueFamily("#C0392B")).toBe("red");
    expect(hueFamily("#F39C12")).toBe("orange");
    expect(hueFamily("#F1C40F")).toBe("yellow");
    expect(hueFamily("#27AE60")).toBe("green");
    expect(hueFamily("#2980B9")).toBe("blue");
    expect(hueFamily("#8E44AD")).toBe("purple");
    expect(hueFamily("#5C3A21")).toBe("brown");
    expect(hueFamily("#808080")).toBe("neutral");
    expect(isNeutral("#111111")).toBe(true);
  });
  it("picks readable text colours", () => {
    expect(textOn("#000000")).toBe("#FFFFFF");
    expect(textOn("#FFFFFF")).toBe("#000000");
  });
  it("describes tone", () => {
    expect(toneWords("#7A1B1B")).toMatch(/deep/);
    expect(toneWords("#F5EDE0")).toMatch(/pale/);
  });
});
