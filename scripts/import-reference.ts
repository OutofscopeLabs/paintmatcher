/**
 * Merges swatch data from the MIT-licensed Miniature Painter Pro dataset
 * (https://github.com/Arcturus5404/miniature-paints) into src/data/*.ts.
 *
 *   git clone --depth 1 https://github.com/Arcturus5404/miniature-paints /tmp/mp
 *   node scripts/import-reference.ts /tmp/mp/paints
 *
 * Hand-written notes, tags and type classifications in the existing files are kept; the
 * reference supplies names, codes, ranges and measured hexes, and adds every paint we were missing.
 */
import fs from "node:fs";
import path from "node:path";
import { citadel as existingCitadel } from "../src/data/citadel.ts";
import { armyPainter as existingAP } from "../src/data/army_painter.ts";
import { vallejo as existingVallejo } from "../src/data/vallejo.ts";

type Brand = "citadel" | "army_painter" | "vallejo";
type PaintType = "base" | "layer" | "shade" | "contrast" | "metallic" | "dry" | "technical" | "glaze" | "effect" | "primer" | "air" | "varnish";
interface Paint { id: string; brand: Brand; range: string; name: string; code?: string; hex: string; type: PaintType; finish: "matte" | "satin" | "gloss" | "metallic"; opacity: "opaque" | "semi-opaque" | "translucent" | "transparent"; tags?: string[]; notes?: string }
interface Row { name: string; code?: string; set: string; hex: string }

const refDir = process.argv[2];
if (!refDir) { console.error("usage: node scripts/import-reference.ts <path to miniature-paints/paints>"); process.exit(1); }
const outDir = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "src", "data");

// ---------- helpers ----------
const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const clean = (s: string) => s.replace(/\s+/g, " ").replace(/’/g, "'").trim();

function hsl(hex: string) {
  const n = parseInt(hex.slice(1), 16); const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b); const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min; const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}
function hslToHex(h: number, s: number, l: number) {
  const f = (n: number) => { const k = (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return "#" + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}
/** Washes in the reference are sampled painted over white; pull them down to a pigment-like tone for the map. */
function deepen(hex: string, maxL: number) { const { h, s, l } = hsl(hex); return l > maxL ? hslToHex(h, Math.min(1, s + 0.1), maxL) : hex; }
function family(hex: string): string {
  const { h, s, l } = hsl(hex);
  if (s < 0.11 || l < 0.06 || l > 0.96) return l < 0.12 ? "black" : l > 0.9 ? "white" : "grey";
  if (h >= 12 && h < 55 && (l < 0.42 || (s < 0.5 && l < 0.6))) return "brown";
  if (h < 12 || h >= 340) return l > 0.6 && s < 0.85 ? "pink" : "red";
  if (h < 42) return "orange"; if (h < 70) return "yellow"; if (h < 165) return "green"; if (h < 200) return "turquoise"; if (h < 262) return "blue"; if (h < 300) return "purple"; return "pink";
}

const METAL = /\b(gold|golden|glittering loot|silver|steel|bronze|brass|copper|chrome|mithril|metal|iron|alloy|aluminium|aluminum|gunmetal|gun metal|leadbelcher|retributor|stormhost|runefang|sigmarite|ironbreaker|balthasar|liberator|canoptek|sycorax|hashut|fulgurite|gehenna|runelord|skullcrusher|screaming bell|warplock|scorpion|auric|necron compound|golden griffon|tin|pewter|platinum|titanium|magnesium|duraluminium|exhaust|burnt metal|jet)\b/i;
const isMetal = (name: string) => METAL.test(name) && !/gold yellow|golden yellow|silver grey|steel grey|steel legion|iron warriors|brass scorpion green|copper brown|bronze fleshtone|bronze green|bronze skin|tin bitz grey/i.test(name);

function tagsFor(name: string, hex: string, type: PaintType, extra: string[] = []): string[] {
  const t = new Set<string>(extra);
  const n = name.toLowerCase();
  const fam = family(hex); t.add(fam);
  if (/skin|flesh/.test(n)) { t.add("skin"); t.add("flesh"); }
  if (/bone|skull|skeleton|ivory/.test(n)) t.add("bone");
  if (/leather|hide/.test(n)) t.add("leather");
  if (/wood|oak|bark/.test(n)) t.add("wood");
  if (/gold/.test(n)) { t.add("gold"); t.add("metal"); }
  if (/silver|steel|mithril|chrome|plate mail|iron/.test(n)) { t.add("silver"); t.add("metal"); }
  if (/bronze|brass/.test(n)) { t.add("bronze"); t.add("metal"); }
  if (/copper/.test(n)) { t.add("copper"); t.add("metal"); }
  if (/rust/.test(n)) t.add("rust");
  if (/verdigris|oxide|patina/.test(n)) t.add("verdigris");
  if (/blood|gore/.test(n)) { t.add("blood"); t.add("gore"); }
  if (/slime|vomit|rot|decay|grime|ooz/.test(n)) t.add("rot");
  if (/glow|flare|plasma|neon|fluo|volt|radiat/.test(n)) { t.add("glow"); t.add("osl"); }
  if (/camo|drab|khaki|olive|military|uniform/.test(n)) t.add("camo");
  if (/stone|granite|concrete|rock/.test(n)) t.add("stone");
  if (/snow|frost|ice/.test(n)) t.add("snow");
  if (/mud|earth|dirt|dust/.test(n)) t.add("basing");
  if (/necro|undead|ghoul|ghost|zombie|mummif|rigor/.test(n)) t.add("undead");
  if (/ork|orc|goblin|greenskin/.test(n)) t.add("ork");
  if (/lava|fire|flame|inferno|magma/.test(n)) t.add("lava");
  if (type === "metallic") t.add("metal");
  if (type === "shade") { t.add("wash"); t.add("shadow"); }
  if (type === "varnish") t.add("varnish");
  if (type === "glaze") t.add("medium");
  if (type === "technical") t.add("texture");
  if (type === "layer") t.add("highlight");
  return [...t].slice(0, 6);
}

function finishFor(type: PaintType, brand: Brand, range: string, name: string): Paint["finish"] {
  if (type === "metallic" || (type === "contrast" && isMetal(name))) return "metallic";
  if (/gloss/i.test(name)) return "gloss";
  if (/matt/i.test(name) && type === "varnish") return "matte";
  if (/satin/i.test(name)) return "satin";
  if (type === "shade" || type === "contrast" || type === "glaze") return "satin";
  if (/blood|slime|gore|vomit|oil stain/i.test(name)) return "gloss";
  if (brand === "vallejo" && /^Game Color/.test(range)) return "satin";
  return "matte";
}
function opacityFor(type: PaintType, brand: Brand, range: string, name: string): Paint["opacity"] {
  if (type === "shade" || type === "glaze" || type === "varnish") return "transparent";
  if (type === "contrast") return "translucent";
  if (type === "layer" || type === "air") return "semi-opaque";
  if (brand === "vallejo" && range === "Model Color" && /yellow|^red$|flat red|vermillion|magenta|carmine|orange/i.test(name)) return "semi-opaque";
  return "opaque";
}

// ---------- parse reference markdown ----------
function parse(file: string): Row[] {
  const lines = fs.readFileSync(path.join(refDir, file), "utf8").split("\n").filter((l) => l.startsWith("|"));
  const header = lines[0].split("|").map((s) => s.trim());
  const col = (n: string) => header.indexOf(n);
  const rows: Row[] = [];
  for (const line of lines.slice(2)) {
    const cells = line.split("|").map((s) => s.trim());
    const name = clean(cells[col("Name")] ?? ""); const set = clean(cells[col("Set")] ?? "");
    const hex = /#([0-9A-Fa-f]{6})/.exec(cells[col("Hex")] ?? "")?.[1];
    const code = col("Code") >= 0 ? cells[col("Code")] : "";
    if (!name || !set || !hex) continue;
    rows.push({ name, set, hex: `#${hex.toUpperCase()}`, code: code && code !== "null" ? code : undefined });
  }
  return rows;
}

// ---------- merge ----------
interface Spec { brand: Brand; range: string; type: PaintType; tags?: string[] }

function build(brand: Brand, rows: Row[], existing: Paint[], classify: (r: Row) => Spec | null, keyOf: (brand: Brand, range: string, name: string, code?: string) => string[]): Paint[] {
  const byKey = new Map<string, Paint>();
  for (const p of existing) for (const k of keyOf(brand, p.range, p.name, p.code)) if (!byKey.has(k)) byKey.set(k, p);
  const out = new Map<string, Paint>();
  const usedExisting = new Set<string>();
  for (const r of rows) {
    const spec = classify(r); if (!spec) continue;
    const keys = keyOf(brand, spec.range, r.name, r.code);
    const prev = keys.map((k) => byKey.get(k)).find(Boolean);
    const sameRange = !!prev && prev.range === spec.range;
    let type = spec.type;
    if (sameRange) type = prev!.type; // trust hand classification when the range agrees
    const dilutedInRef = type === "shade" || type === "glaze" || type === "varnish" || type === "technical" || (type === "effect" && /glow|flame|gloom|light/i.test(r.name));
    let hex = r.hex;
    if (dilutedInRef) hex = prev && hsl(prev.hex).l < hsl(r.hex).l ? prev.hex : type === "varnish" || type === "glaze" && /medium|thinner|retarder|varnish/i.test(r.name) ? r.hex : deepen(r.hex, 0.4);
    const id = `${brand}-${slug(spec.range)}-${slug(r.name)}`;
    const clash = out.get(id);
    if (clash) {
      // Same paint listed in two reference sets (e.g. Fanatic skin tones appear in both the range and the box set):
      // keep one entry unless the codes genuinely differ (old vs new Vallejo codes).
      if (!r.code || !clash.code || clash.code === r.code) { if (!clash.code && r.code) clash.code = r.code; continue; }
    }
    let finalId = id; let n = 2; while (out.has(finalId)) finalId = `${id}-${r.code ? slug(r.code) : n++}`;
    const p: Paint = {
      // Codes and notes are range-specific; only tags are worth borrowing from a same-name entry in another range.
      id: finalId, brand, range: spec.range, name: r.name, code: r.code ?? (sameRange ? prev?.code : undefined), hex, type,
      finish: finishFor(type, brand, spec.range, r.name), opacity: opacityFor(type, brand, spec.range, r.name),
      tags: prev?.tags?.length ? prev.tags : tagsFor(r.name, hex, type, spec.tags), notes: sameRange ? prev?.notes : undefined,
    };
    if (!p.code) delete p.code; if (!p.notes) delete p.notes;
    out.set(finalId, p); if (prev) usedExisting.add(prev.id);
  }
  // Keep hand-written entries the reference does not have.
  let kept = 0;
  const keptIds: string[] = [];
  for (const p of existing) if (!usedExisting.has(p.id) && !out.has(p.id) && !DROP.has(p.id)) { out.set(p.id, p); kept++; keptIds.push(p.id); }
  if (keptIds.length) console.log(`  kept: ${keptIds.join(", ")}`);
  // The reference occasionally repeats a code across two paints; keep it on the first and log the rest.
  const codes = new Set<string>();
  for (const p of out.values()) {
    if (!p.code) continue;
    if (codes.has(p.code)) { console.log(`  dropped duplicate code ${p.code} from ${p.id}`); delete p.code; } else codes.add(p.code);
  }
  const list = [...out.values()].sort((a, b) => a.range.localeCompare(b.range) || a.name.localeCompare(b.name));
  console.log(`${brand}: ${list.length} entries (${existing.length} before, ${kept} hand-written kept without reference match)`);
  return list;
}

/** Hand-written entries that the reference (which is complete for these ranges) does not list; dropped as unverified. */
const DROP = new Set([
  "army_painter-colour-primer-ash-grey", "army_painter-colour-primer-dungeon-grey", "army_painter-speedpaint-2-0-hardy-brown",
  "army_painter-warpaints-fanatic-metallics-glittering-gold", "army_painter-warpaints-fanatic-metallics-rose-gold",
  "vallejo-xpress-color-seraph-red", "vallejo-xpress-color-camo-green",
]);

const keyByRangeName = (brand: Brand, range: string, name: string) => [`${range}|${norm(name)}`];
const keyByCodeOrName = (brand: Brand, range: string, name: string, code?: string) => (code ? [`code|${code}`, `${range}|${norm(name)}`] : [`${range}|${norm(name)}`]);

// Citadel ---------------------------------------------------------------
const CIT_TECH_TYPE = (n: string): PaintType => /varnish|'ardcoat|stormshield/i.test(n) ? "varnish" : /medium|spiritstone|soulstone|waystone/i.test(n) ? "glaze" : /glow|flame|gloom|blood|rot|corrosion|rust|oxide/i.test(n) ? "effect" : /primer/i.test(n) ? "primer" : "technical";
const citadelRows = parse("Citadel_Colour.md");
const citadelOut = build("citadel", citadelRows, existingCitadel as Paint[], (r) => {
  const range = r.set;
  const t: PaintType | null = range === "Base" ? "base" : range === "Layer" ? "layer" : range === "Shade" ? "shade" : range === "Contrast" ? "contrast" : range === "Dry" ? "dry" : range === "Technical" ? CIT_TECH_TYPE(r.name) : range === "Air" ? "air" : range === "Spray" ? "primer" : null;
  if (!t) return null;
  const type: PaintType = (t === "base" || t === "layer" || t === "dry") && isMetal(r.name) ? "metallic" : t;
  return { brand: "citadel", range, type };
}, keyByRangeName);

// Army Painter ------------------------------------------------------------
const FANATIC_METAL = new Set(["Plate Mail Metal", "Shining Silver", "Mithril", "Cobalt Metal", "Death Metal", "Gun Metal", "Rough Iron", "Evil Chrome", "Bright Gold", "Greedy Gold", "Tainted Gold", "True Brass", "Weapon Bronze", "True Copper", "Red Copper", "Burning Ore", "Glittering Green", "Space Dust"].map(norm));
const apRows = parse("Army_Painter.md");
const apOut = build("army_painter", apRows, existingAP as Paint[], (r) => {
  const n = r.name; const b: Brand = "army_painter";
  switch (r.set) {
    case "Warpaints Fanatic":
      if (FANATIC_METAL.has(norm(n))) return { brand: b, range: "Warpaints Fanatic Metallics", type: "metallic" };
      return { brand: b, range: "Warpaints Fanatic", type: "base", tags: /skin|flesh/i.test(n) ? ["skin"] : [] };
    case "Warpaints Fanatic Wash":
      if (/primer/i.test(n)) return { brand: b, range: "Warpaints Fanatic Effects", type: "primer" };
      if (/medium/i.test(n)) return { brand: b, range: "Warpaints Fanatic Washes", type: "glaze" };
      if (/tone|shade/i.test(n)) return { brand: b, range: "Warpaints Fanatic Washes", type: "shade" };
      return { brand: b, range: "Warpaints Fanatic Effects", type: "effect" };
    case "Speedpaint Set 2.0":
      if (/medium/i.test(n)) return { brand: b, range: "Speedpaint 2.0", type: "glaze" };
      return { brand: b, range: "Speedpaint 2.0", type: "contrast" };
    case "Speedpaint Set":
      return { brand: b, range: "Speedpaint 1.0", type: /medium/i.test(n) ? "glaze" : "contrast" };
    case "Warpaints Air":
      return { brand: b, range: "Warpaints Air", type: isMetal(n) ? "metallic" : /varnish/i.test(n) ? "varnish" : /primer/i.test(n) ? "primer" : /tone|wash|shade/i.test(n) ? "shade" : /medium|thinner/i.test(n) ? "glaze" : "air" };
    case "Warpaints":
      return { brand: b, range: "Warpaints Classic", type: isMetal(n) ? "metallic" : /varnish/i.test(n) ? "varnish" : /ink|tone|wash/i.test(n) ? "shade" : /medium/i.test(n) ? "glaze" : /primer/i.test(n) ? "primer" : /blood|slime|gore|glow|fluo/i.test(n) ? "effect" : "base" };
    case "Warpaints Primer":
      return { brand: b, range: "Colour Primer", type: /varnish/i.test(n) ? "varnish" : "primer" };
    case "Quickshade Washes Set": case "Warpaints Tone":
      return { brand: b, range: "Quickshade Wash", type: "shade" };
    case "Warpaints Wash":
      return { brand: b, range: "Quickshade Wash", type: /varnish/i.test(n) ? "varnish" : "glaze" };
    case "Metallic Colours Paint Set":
      return { brand: b, range: "Warpaints Metallics", type: "metallic" };
    case "Skin Tones Paint Set":
      return { brand: b, range: "Warpaints Fanatic", type: /medium|toner/i.test(n) ? "glaze" : "base", tags: ["skin"] };
    case "Skin Tones Paint Set - Washes":
      return { brand: b, range: "Warpaints Fanatic Washes", type: "shade", tags: ["skin"] };
    default:
      return null; // D&D Nolzur's sets are branded differently and left out
  }
}, (brand, range, name) => {
  // Existing hand-written ranges map onto the same names, so key on range + name; also fall back to bare name.
  return [`${range}|${norm(name)}`, `*|${norm(name)}`];
});

// Vallejo -----------------------------------------------------------------
const VALLEJO_SETS: Record<string, { range: string; type: (n: string) => PaintType }> = {
  "Model Color": { range: "Model Color", type: (n) => isMetal(n) ? "metallic" : /varnish/i.test(n) ? "varnish" : /medium|thinner|retarder|glaze|transparent|smoke|clear/i.test(n) ? "glaze" : /wash/i.test(n) ? "shade" : /fluo/i.test(n) ? "effect" : "base" },
  "Game Color": { range: "Game Color", type: (n) => isMetal(n) ? "metallic" : /ink/i.test(n) ? "glaze" : /wash/i.test(n) ? "shade" : /varnish/i.test(n) ? "varnish" : /medium|thinner|retarder/i.test(n) ? "glaze" : /fluo/i.test(n) ? "effect" : /primer/i.test(n) ? "primer" : "base" },
  "Game Color Wash": { range: "Game Color Wash", type: () => "shade" },
  "Game Color Special FX": { range: "Game Color Special FX", type: () => "effect" },
  "Xpress Color": { range: "Xpress Color", type: (n) => /medium/i.test(n) ? "glaze" : "contrast" },
  "Xpress Color Intense": { range: "Xpress Color Intense", type: () => "contrast" },
  "Metal Color": { range: "Metal Color", type: (n) => /varnish/i.test(n) ? "varnish" : /thinner/i.test(n) ? "glaze" : "metallic" },
  "Liquid Gold": { range: "Liquid Gold", type: () => "metallic" },
  "Surface Primer": { range: "Surface Primer", type: () => "primer" },
  "Model Air": { range: "Model Air", type: (n) => isMetal(n) ? "metallic" : /varnish/i.test(n) ? "varnish" : /thinner|cleaner|improver|medium/i.test(n) ? "glaze" : "air" },
  "Game Air": { range: "Game Air", type: (n) => isMetal(n) ? "metallic" : /varnish/i.test(n) ? "varnish" : /thinner|cleaner|improver|medium/i.test(n) ? "glaze" : "air" },
  "Wash FX": { range: "Model Wash", type: () => "shade" },
  "Mecha Color": { range: "Mecha Color", type: (n) => isMetal(n) ? "metallic" : /varnish/i.test(n) ? "varnish" : /wash/i.test(n) ? "shade" : /thinner|primer/i.test(n) ? (/primer/i.test(n) ? "primer" : "glaze") : /fluo/i.test(n) ? "effect" : "base" },
  "Panzer Aces": { range: "Panzer Aces", type: () => "base" },
};
const vRowsRaw = parse("Vallejo.md");
const seenV = new Set<string>();
const vRows = vRowsRaw.filter((r) => { const k = `${r.set}|${r.code ?? ""}|${norm(r.name)}`; if (seenV.has(k)) return false; seenV.add(k); return true; });
const vallejoOut = build("vallejo", vRows, existingVallejo as Paint[], (r) => {
  const s = VALLEJO_SETS[r.set]; if (!s) return null;
  return { brand: "vallejo", range: s.range, type: s.type(r.name) };
}, keyByCodeOrName);

// ---------- emit ----------
function emit(file: string, exportName: string, list: Paint[], header: string) {
  const lines = [
    `import type { Paint } from "@/lib/types";`, "",
    `// ${header}`,
    `// Generated by scripts/import-reference.ts from the Miniature Painter Pro dataset (MIT, https://github.com/Arcturus5404/miniature-paints),`,
    `// with hand-written notes and classifications merged in. Re-run the script rather than editing hexes by hand.`, "",
    `export const ${exportName}: Paint[] = [`,
  ];
  let range = "";
  for (const p of list) {
    if (p.range !== range) { range = p.range; lines.push(`  // ---- ${range} ----`); }
    lines.push(`  ${JSON.stringify(p)},`);
  }
  lines.push("];", "");
  fs.writeFileSync(path.join(outDir, file), lines.join("\n"));
}
emit("citadel.ts", "citadel", citadelOut, "Games Workshop Citadel Colour.");
emit("army_painter.ts", "armyPainter", apOut, "The Army Painter: Warpaints Fanatic, Speedpaint, Warpaints Air, classic Warpaints, primers and washes.");
emit("vallejo.ts", "vallejo", vallejoOut, "Acrylicos Vallejo hobby ranges.");
