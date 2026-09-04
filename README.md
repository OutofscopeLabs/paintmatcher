# PaintMatcher

Photograph your miniature paints, have them identified and catalogued automatically, and browse them on a colour map that tells you what each paint is and what it is good for.

Covers **Citadel**, **The Army Painter** and **Vallejo** out of the box, with a data-driven catalog you can extend.

## What it does

- **Scan** – drop or take photos of your pots and bottles. A vision model reads the labels (brand, range, name, product code) and each reading is matched against the catalog by code, exact name and fuzzy name. You review every detection, fix any misreads from a dropdown or catalog search, set quantities, and add them to your collection. Pots that are not in the catalog are still kept as "unlisted" paints.
- **Collection** – everything you own grouped by brand and range, with quantities, search, manual add, and JSON export/import. The collection lives in your browser's local storage.
- **Map** – every paint plotted by hue and lightness (neutrals in their own column). Owned paints are solid, the rest of the catalog faint. Filter by brand and paint type, zoom and pan, and click a dot for its detail panel.
- **Paint detail** – colour description, texture and consistency out of the pot, how to apply it, what it is useful for on miniatures, tips, the closest equivalent in each other brand (CIE Lab distance), and similar colours across the catalog.

## Running it

```bash
npm install
cp .env.example .env.local   # add your Anthropic API key
npm run dev                  # http://localhost:3000
```

Recognition calls the Claude API server-side from `src/app/api/recognize/route.ts`; the key never reaches the browser. The catalog listing is placed behind a prompt-cache breakpoint so repeated scans are cheap.

```bash
npm test        # vitest: colour maths, matcher, catalog integrity
npm run typecheck
npm run build
```

## Photo tips

- Labels facing the camera, even light, no glare on the lids.
- A couple of dozen pots per photo is the sweet spot; up to six photos per scan.
- Vallejo and Army Painter Fanatic bottles print product codes; these are the most reliable identifier, so keep them in shot.

## Extending the catalog

Paint data lives in `src/data/citadel.ts`, `src/data/army_painter.ts` and `src/data/vallejo.ts`; the schema is in `src/lib/types.ts`. Each entry has an id, brand, range, name, optional code, an approximate dried-colour hex, a functional type (base, layer, shade, contrast, metallic, …), finish, opacity, tags and an optional note. Add entries and run `npm test` — the catalog test checks ids, codes and hex values.

Hex values are approximations of the manufacturers' swatches, so map positions and cross-brand equivalents are guides rather than lab measurements. The catalogs are not exhaustive: only paints we were confident exist are listed, and anything the recogniser reads that is not listed is still added to your collection as an unlisted paint.

## Project layout

```
src/app/                 Next.js pages: scan (/), /collection, /map, /api/recognize
src/components/          PaintMap (SVG), PaintDetail (drawer), PaintPicker, Nav, Swatch
src/lib/color.ts         sRGB / HSL / Lab conversions, ΔE, hue families
src/lib/match.ts         detection → catalog matcher (code, name, fuzzy)
src/lib/describe.ts      texture / usage / tips generator and cross-brand equivalents
src/lib/storage.ts       localStorage collection + import/export
src/data/                paint catalogs
tests/                   vitest suites
```
