/** Colour maths: sRGB <-> HSL / CIE Lab, perceptual distance and helpers for the map. */

export interface RGB { r: number; g: number; b: number }
export interface HSL { h: number; s: number; l: number }
export interface Lab { L: number; a: number; b: number }

export function hexToRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Invalid hex colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s, l };
}

export function hexToHsl(hex: string): HSL {
  return rgbToHsl(hexToRgb(hex));
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function rgbToLab({ r, g, b }: RGB): Lab {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  // D65 reference white
  let x = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
  let y = (R * 0.2126729 + G * 0.7151522 + B * 0.072175) / 1.0;
  let z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x); y = f(y); z = f(z);
  return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

export function hexToLab(hex: string): Lab {
  return rgbToLab(hexToRgb(hex));
}

/** CIE76 colour difference. ~2.3 is a just-noticeable difference; < 10 reads as "the same paint" on a model. */
export function deltaE(a: Lab, b: Lab): number {
  return Math.sqrt((a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2);
}

export function deltaEHex(a: string, b: string): number {
  return deltaE(hexToLab(a), hexToLab(b));
}

/** Relative luminance (WCAG) 0..1 */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** Black or white text that reads on top of the swatch. */
export function textOn(hex: string): "#000000" | "#FFFFFF" {
  return luminance(hex) > 0.35 ? "#000000" : "#FFFFFF";
}

/** True for greys, blacks, whites and very desaturated colours (no meaningful hue). */
export function isNeutral(hex: string): boolean {
  const { s, l } = hexToHsl(hex);
  return s < 0.11 || l < 0.06 || l > 0.96;
}

export type HueFamily =
  | "red" | "orange" | "yellow" | "green" | "turquoise" | "blue" | "purple" | "pink" | "brown" | "neutral";

/** Coarse colour family used for grouping and for describing a paint in words. */
export function hueFamily(hex: string): HueFamily {
  if (isNeutral(hex)) return "neutral";
  const { h, s, l } = hexToHsl(hex);
  // Browns are dark / desaturated oranges and yellows.
  if (h >= 12 && h < 55 && (l < 0.42 || (s < 0.5 && l < 0.6))) return "brown";
  if (h < 12 || h >= 340) return l > 0.6 && s < 0.85 ? "pink" : "red";
  if (h < 42) return "orange";
  if (h < 70) return "yellow";
  if (h < 165) return "green";
  if (h < 200) return "turquoise";
  if (h < 262) return "blue";
  if (h < 300) return "purple";
  return "pink";
}

/** Human words for lightness / saturation, e.g. "deep, muted". */
export function toneWords(hex: string): string {
  const { s, l } = hexToHsl(hex);
  const light = l < 0.18 ? "very dark" : l < 0.35 ? "deep" : l < 0.55 ? "mid-tone" : l < 0.78 ? "light" : "pale";
  if (isNeutral(hex)) return light;
  const sat = s < 0.3 ? "muted" : s < 0.6 ? "moderately saturated" : "vivid";
  return `${light}, ${sat}`;
}

/** Descriptive name for a neutral, e.g. "warm grey". */
export function neutralName(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  const base = l < 0.12 ? "black" : l < 0.3 ? "dark grey" : l < 0.6 ? "grey" : l < 0.9 ? "light grey" : "white";
  if (s < 0.03) return base;
  const warm = h < 70 || h > 330;
  return `${warm ? "warm" : "cool"} ${base}`;
}

/** Mix two hex colours (t=0 → a, t=1 → b) in linear sRGB. */
export function mixHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex({ r: A.r + (B.r - A.r) * t, g: A.g + (B.g - A.g) * t, b: A.b + (B.b - A.b) * t });
}
