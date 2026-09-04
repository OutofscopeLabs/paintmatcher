/** Turns a catalog entry into human advice: what the paint feels like, and what it is good for on miniatures. */
import type { Brand, Paint, PaintType } from "./types";
import { ALL_PAINTS, BRAND_LABEL } from "./catalog";
import { deltaE, hexToHsl, hexToLab, hueFamily, neutralName, toneWords, type HueFamily } from "./color";

export interface PaintInfo {
  /** e.g. "deep, muted red" */
  colour: string;
  family: HueFamily;
  /** Consistency / texture out of the pot. */
  consistency: string;
  /** How it covers and how to thin it. */
  application: string;
  /** Bullet list of uses on miniatures. */
  usefulFor: string[];
  /** Short practical tips. */
  tips: string[];
}

const TYPE_TEXT: Record<PaintType, { consistency: string; application: string; uses: string[]; tips: string[] }> = {
  base: {
    consistency: "Thick, creamy and heavily pigmented; designed to lay down a solid, even foundation.",
    application: "Thin with water or medium to a milk-like consistency and apply in two thin coats rather than one heavy one.",
    uses: ["Basecoating large areas: armour plates, cloaks, vehicle hulls", "Blocking in the main colour before shading and highlighting", "Undercoat for weaker-covering layer colours over a black primer"],
    tips: ["Two thin coats beat one thick one — a heavy coat fills detail and leaves brush strokes.", "Works well over a matching coloured spray for fast batch painting."],
  },
  layer: {
    consistency: "Smoother and more fluid than a base, with slightly less pigment so it flows off the brush.",
    application: "Semi-opaque; build in two or three thin passes. Ideal for edge and layer highlights where you want control, not coverage.",
    uses: ["Edge highlights and layered highlights over a base colour", "Glazing when thinned heavily with medium", "Feathered blends and transitions"],
    tips: ["Keep to raised edges and upper surfaces to imply light from above.", "Thin with a little medium instead of water to keep it from separating on the palette."],
  },
  shade: {
    consistency: "Watery, translucent and loaded with flow improver so it runs into recesses and settles in the deepest points.",
    application: "Apply over a matte basecoat; either flood the whole area (all-over shade) or pin it into recesses with a smaller brush.",
    uses: ["Instant shading of recesses, cloth folds, chainmail, skin and fur", "Toning down and unifying a bright basecoat", "Weathering and grime on metallics and vehicles"],
    tips: ["Avoid pooling on flat panels — wick excess away with a dry brush before it dries or you get tide marks.", "Re-highlight with the basecoat afterwards to bring the raised areas back."],
  },
  contrast: {
    consistency: "Thin and translucent, but with a heavy pigment load suspended in a special medium that concentrates colour in recesses while staying paler on raised areas.",
    application: "One generous coat over a light (white, bone or grey) primer does base, shade and a rough highlight in one step. Avoid going back over it while wet.",
    uses: ["Speed-painting whole armies in one coat", "Skin, fur, cloth and organic textures with lots of detail", "Tinting: heavily thinned with medium it works as a glaze over metallics or white"],
    tips: ["Results depend entirely on the undercoat: brighter primer means brighter colour.", "Keep coats even and let them dry fully — touching a drying contrast leaves marks.", "Mix with medium to reduce intensity rather than water, which breaks the effect."],
  },
  metallic: {
    consistency: "Carries metal flake pigment; slightly gritty or glittery compared with normal colours and separates quickly on the palette.",
    application: "Covers well undiluted over a dark base. Thin with medium, not much water, to keep flakes suspended. Stir or shake well before use.",
    uses: ["Armour, weapons, chainmail and trim", "True metallic metal (TMM) with washes and edge highlights", "Mixing with a drop of colour for tinted metals"],
    tips: ["Use a dedicated brush — flakes are hard to wash out and will contaminate other colours.", "A black or dark brown wash afterwards adds instant depth; highlight edges with a brighter silver."],
  },
  dry: {
    consistency: "Very thick, almost paste-like, with little moisture so it catches only raised texture.",
    application: "Load a flat dry-brush, wipe most of it off on tissue, then flick across the surface. Do not thin.",
    uses: ["Fast highlights on fur, chainmail, rocks, bases and heavily textured surfaces", "Weathered and dusty edges on vehicles"],
    tips: ["Use a soft, flat make-up style brush for smoother results.", "Two light passes look better than one heavy one that leaves chalky streaks."],
  },
  technical: {
    consistency: "Textured or specialised medium — grit, crackle paste or thick gel depending on the product.",
    application: "Apply straight from the pot with an old brush or spatula; thickness controls the effect.",
    uses: ["Bases: earth, cracked desert, snow, mud and rubble", "Structural texture on scenery and vehicles"],
    tips: ["Let it cure fully (often overnight) before drybrushing or washing it.", "Crackle effects need a thick layer to crack; thin layers stay smooth."],
  },
  glaze: {
    consistency: "Very thin, transparent and heavily flow-enhanced; more like an ink than a paint.",
    application: "Apply in thin, controlled coats to tint an underlying colour without hiding it; build slowly.",
    uses: ["Tinting and unifying highlights that have become too chalky", "Colour shifts on metallics (gem, gold, lens effects)", "Smoothing transitions between layered highlights"],
    tips: ["Wick the brush on tissue before touching the model — glazes pool fast.", "Multiple thin coats give depth; one heavy coat just looks like a wash."],
  },
  effect: {
    consistency: "Specialised medium: glossy gels for blood and slime, grainy pastes for rust and corrosion, or transparent fluorescent colour.",
    application: "Stipple, drip or splatter on top of a finished model as a final step.",
    uses: ["Blood, slime, rust, verdigris and glowing effects", "Object-source lighting and weathering details"],
    tips: ["Less is more — apply where the effect would naturally collect (blade edges, joints, drains).", "Seal with matte varnish first, then add gloss effects on top so they keep their shine."],
  },
  primer: {
    consistency: "Thin, self-levelling and made to bite onto bare plastic, resin or metal.",
    application: "Thin, even coats from about 20–30 cm with a spray, or brush on undiluted in one thin coat. Let it cure before painting.",
    uses: ["First coat on bare miniatures", "Colour-matched priming to speed up basecoating"],
    tips: ["Avoid humid or cold conditions when spraying — it frosts or goes grainy.", "Rotate the model so every undercut gets coverage."],
  },
  air: {
    consistency: "Pre-thinned to an ink-like consistency for airbrushing.",
    application: "Airbrush at 15–25 PSI in light passes; can also be used as a glaze with a brush.",
    uses: ["Zenithal highlights and smooth gradients on armour and vehicles", "Fast basecoating of many models"],
    tips: ["Add a drop of flow improver if it tip-dries.", "Too heavy a pass will run and pool in recesses."],
  },
  varnish: {
    consistency: "Clear medium that dries to a protective film.",
    application: "Brush or spray on in thin coats over the finished model.",
    uses: ["Protecting paint from handling and transport", "Setting the final finish: matte for cloth, gloss for gems, lenses and wet effects"],
    tips: ["Two light coats are safer than one heavy one, which can frost or fog.", "Matte varnish will kill metallic shine — varnish metallics with satin or leave them."],
  },
};

const FAMILY_USES: Record<HueFamily, string[]> = {
  red: ["Cloaks, banners, tabards and heraldry", "Blood Angels / Khorne / Sylvaneth-style red armour", "Warm glazing over gold and bronze"],
  orange: ["Fire, lava and plasma glows", "Object-source lighting from flames", "Rust tones and warm highlights on browns and reds"],
  yellow: ["Imperial Fists / Iyanden yellow armour", "Hazard stripes and warning markings", "Final highlights on golds, fire and blond hair"],
  green: ["Orks, goblins and Nurgle skin", "Camouflage, cloaks and natural foliage", "Dark Angels / Salamanders armour"],
  turquoise: ["Necron and Tau accents, energy weapons", "Verdigris on bronze and copper", "Sci-fi lenses and gems"],
  blue: ["Ultramarines / Stormcast-style armour", "Cold shadows glazed into greys and whites", "Power weapon and plasma glows"],
  purple: ["Genestealer, Slaanesh and Emperor's Children armour", "Deep shadow glazes on reds and blues", "Magic, warp and psychic effects"],
  pink: ["Highlights on purples and reds", "Slaaneshi and daemon flesh", "Bright accents on grim colour schemes"],
  brown: ["Leather straps, belts, boots and holsters", "Wood, bone shadows and earth on bases", "Skin tones and hair"],
  neutral: ["Armour plates, robes and stone", "Grey/black primer-style base colours", "Bone, skulls and white cloth highlights"],
};

const TAG_USES: Record<string, string> = {
  skin: "Skin tones — base, shade or highlight depending on how light it is",
  flesh: "Flesh tones for humans, elves and other characters",
  bone: "Bone, skulls, horns and teeth",
  leather: "Leather straps, belts and holsters",
  wood: "Wooden weapon hafts, shields and scenery",
  gold: "Gold trim, jewellery and decorative armour",
  silver: "Steel weapons, chainmail and bright edge highlights on metal",
  bronze: "Bronze and brass fittings, ancient armour",
  copper: "Copper piping, cables and warm metal accents",
  rust: "Rust streaks and corrosion on vehicles and armour",
  verdigris: "Verdigris patina on copper and bronze",
  blood: "Blood splatter on blades and wounds",
  gem: "Gemstones, lenses and power crystals",
  glow: "Glowing eyes, plasma coils and OSL",
  osl: "Object-source lighting and glow effects",
  stone: "Stone, concrete and rubble on bases and terrain",
  basing: "Base texture and groundwork",
  snow: "Snow and frost effects on bases",
  mud: "Mud, dirt and grime on bases and lower legs",
  camo: "Military camouflage and drab uniforms",
  undead: "Undead flesh, ghosts and spectral effects",
  necron: "Necron living metal and green energy",
  ork: "Orc and goblin skin",
  marine: "Space Marine chapter colours",
  eldar: "Aeldari wraithbone and armour",
  armour: "Armour plating and vehicles",
  cloth: "Cloth, robes and cloaks",
  hair: "Hair and fur",
  historical: "Historical uniforms and vehicles",
  vehicle: "Tanks and vehicle hulls",
  nmm: "Non-metallic metal painting",
  lava: "Lava and fire effects",
};

const BRAND_NOTES: Partial<Record<Brand, Partial<Record<string, string>>>> = {
  citadel: {
    Base: "Citadel Base: the most pigment-dense pots in the range; excellent one-coat coverage over black.",
    Layer: "Citadel Layer: thinner than Base and meant to sit over it; several are surprisingly weak on their own.",
    Shade: "Citadel Shade: gloss variants (e.g. Cryptek Armourshade) flow better and stay off flat areas.",
    Contrast: "Citadel Contrast: intended for Wraithbone or Grey Seer spray; behaves very differently over dark primers.",
    Dry: "Citadel Dry: sold pre-thickened; dries out fast in the pot so keep the lid on.",
  },
  army_painter: {
    "Warpaints Fanatic": "Warpaints Fanatic (2024): dropper bottles with a mixing ball, organised in six-shade triads so darker and lighter siblings are easy to find.",
    "Speedpaint 2.0": "Speedpaint 2.0: the reformulation no longer reactivates when a second coat is applied on top.",
    "Warpaints Fanatic Washes": "Fanatic washes are slightly more concentrated than the old Quickshade Ink range; thin with medium for a subtler tint.",
  },
  vallejo: {
    "Model Color": "Vallejo Model Color: dropper bottle, very matte, high pigment; shake well as the medium separates. Historical/military hobby staple.",
    "Game Color": "Vallejo Game Color (2023 reformulation): satin finish, more durable and less prone to rubbing off than the old formula.",
    "Xpress Color": "Vallejo Xpress Color: contrast-style one-coat paints; slightly more translucent than Citadel Contrast so undercoat matters.",
    "Metal Color": "Vallejo Metal Color: aluminium-pigment metallics that can be airbrushed straight from the bottle; extremely smooth finish.",
  },
};

export function describePaint(p: Paint): PaintInfo {
  const fam = hueFamily(p.hex);
  const colourWord = fam === "neutral" ? neutralName(p.hex) : fam;
  const t = TYPE_TEXT[p.type];
  const { l } = hexToHsl(p.hex);

  const usefulFor: string[] = [];
  for (const tag of p.tags ?? []) if (TAG_USES[tag] && !usefulFor.includes(TAG_USES[tag])) usefulFor.push(TAG_USES[tag]);
  if (p.type === "metallic") {
    usefulFor.push(...t.uses.slice(0, 2));
  } else if (p.type === "base" || p.type === "layer" || p.type === "contrast" || p.type === "air") {
    for (const u of FAMILY_USES[fam]) if (usefulFor.length < 6 && !usefulFor.includes(u)) usefulFor.push(u);
    if (p.type === "layer" || l > 0.7) usefulFor.push(`Highlight colour for darker ${fam === "neutral" ? "greys and blacks" : fam + "s"}`);
    if (l < 0.3) usefulFor.push(`Shadow tone for brighter ${fam === "neutral" ? "greys" : fam + "s"}`);
  } else {
    usefulFor.push(...t.uses);
  }

  const tips = [...t.tips];
  const bn = BRAND_NOTES[p.brand]?.[p.range];
  if (bn) tips.unshift(bn);
  if (p.notes) tips.unshift(p.notes);
  if (p.opacity === "semi-opaque" && p.type === "base") tips.push("This colour is weaker covering than most of its range — start from a light or matching undercoat.");

  return {
    colour: `${toneWords(p.hex)} ${colourWord}`.replace(/\s+/g, " "),
    family: fam,
    consistency: t.consistency,
    application: t.application,
    usefulFor: usefulFor.slice(0, 7),
    tips,
  };
}

export interface SimilarPaint { paint: Paint; distance: number }

/** Nearest colours in the catalog, optionally restricted to other brands or to a paint type. */
export function similarPaints(p: Paint, opts: { limit?: number; otherBrandsOnly?: boolean; sameType?: boolean } = {}): SimilarPaint[] {
  const { limit = 6, otherBrandsOnly = false, sameType = false } = opts;
  const lab = hexToLab(p.hex);
  const out: SimilarPaint[] = [];
  for (const q of ALL_PAINTS) {
    if (q.id === p.id) continue;
    if (otherBrandsOnly && q.brand === p.brand) continue;
    if (sameType && q.type !== p.type) continue;
    // Metallics and non-metallics never look alike on the model.
    if ((q.type === "metallic") !== (p.type === "metallic")) continue;
    out.push({ paint: q, distance: deltaE(lab, hexToLab(q.hex)) });
  }
  out.sort((a, b) => a.distance - b.distance);
  return out.slice(0, limit);
}

/** Closest equivalent from each other brand — the "what do I use instead" answer. */
export function equivalents(p: Paint): { brand: Brand; label: string; match?: SimilarPaint }[] {
  return (Object.keys(BRAND_LABEL) as Brand[])
    .filter((b) => b !== p.brand)
    .map((b) => {
      const best = similarPaints(p, { limit: 50 }).find((s) => s.paint.brand === b);
      return { brand: b, label: BRAND_LABEL[b], match: best };
    });
}

export function distanceWords(d: number): string {
  if (d < 5) return "near-identical";
  if (d < 10) return "very close";
  if (d < 18) return "similar";
  if (d < 28) return "same family";
  return "loose match";
}
