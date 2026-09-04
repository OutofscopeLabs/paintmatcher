/** Shared paint catalog types. Every catalog entry in src/data/*.ts must satisfy `Paint`. */

export type Brand = "citadel" | "army_painter" | "vallejo";

/** Functional category of the paint, used for usage advice and map filtering. */
export type PaintType =
  | "base" // opaque foundation colour (Citadel Base, Vallejo Model/Game Color, Warpaints Fanatic)
  | "layer" // thinner, semi-opaque highlight colour (Citadel Layer)
  | "shade" // wash / ink that settles in recesses (Citadel Shade, Quickshade wash, Vallejo Wash)
  | "contrast" // one-coat translucent "contrast" / "speedpaint" / "xpress" style paint
  | "metallic" // metallic pigment paint
  | "dry" // thick dry-brush paint
  | "technical" // texture, crackle, blood, verdigris, gloss varnish etc.
  | "glaze" // transparent glaze / ink used for tinting
  | "effect" // fluorescent, luminous, oil-stain, rust, weathering effects
  | "primer" // spray or brush-on primer / surface primer
  | "air" // pre-thinned airbrush colour
  | "varnish"; // matt/satin/gloss varnish

export type Finish = "matte" | "satin" | "gloss" | "metallic";

export type Opacity = "opaque" | "semi-opaque" | "translucent" | "transparent";

export interface Paint {
  /** Stable id: `${brand}-${slug(range)}-${slug(name)}`, lowercase, hyphenated. */
  id: string;
  brand: Brand;
  /** Product line inside the brand, e.g. "Base", "Layer", "Warpaints Fanatic", "Model Color". */
  range: string;
  /** Exact name as printed on the pot. */
  name: string;
  /** Manufacturer product code if printed on the pot, e.g. "70.950", "WP3001", "72.001". */
  code?: string;
  /** Approximate sRGB hex of the dried paint, e.g. "#1F2A3C". */
  hex: string;
  type: PaintType;
  finish: Finish;
  opacity: Opacity;
  /** Short free-form tags: "skin", "bone", "rust", "nmm", "gold", "verdigris"... */
  tags?: string[];
  /** Optional paint-specific note on consistency, quirks or well-known uses. One or two sentences. */
  notes?: string;
}

export interface PaintWithMeta extends Paint {
  /** Alternative names the paint is known by (old names, common misspellings). */
  aliases?: string[];
}
