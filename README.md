# PaintMatcher

Photograph your miniature paints, have them identified and catalogued automatically, and browse them on a colour map that tells you what each paint is and what it is good for.

Covers **Citadel**, **The Army Painter** and **Vallejo** out of the box, with a data-driven catalog you can extend.

It is a fully static site: there is no server, so it can be served straight from this repository with GitHub Pages. Photo recognition calls the Anthropic API directly from your browser with your own key, which is kept in the browser's local storage.

## What it does

- **Scan** – drop or take photos of your pots and bottles. Claude reads the labels (brand, range, name, product code) and each reading is matched against the catalog by code, exact name and fuzzy name. You review every detection, fix any misreads from a dropdown or catalog search, set quantities, and add them to your collection. Pots that are not in the catalog are still kept as "unlisted" paints.
- **Collection** – everything you own grouped by brand and range, with quantities, search, manual add, and JSON export/import. The collection lives in your browser's local storage.
- **Encyclopedia** – browse the whole catalog by brand and range, sort by hue or lightness, filter by type, and open any paint for its detail panel. Owned paints are ticked.
- **Map** – every paint plotted by hue and lightness (neutrals in their own column). Owned paints are solid, the rest of the catalog faint. Filter by brand and paint type, zoom and pan, and click a dot for its detail panel.
- **Paint detail** – colour description, texture and consistency out of the pot, how to apply it, what it is useful for on miniatures, tips, the closest equivalent in each other brand (CIE Lab distance), and similar colours across the catalog.

## Running it locally

```bash
npm install
npm run dev                  # http://localhost:3000
```

Open the Scan page and paste an Anthropic API key into the key panel. The key is stored only in that browser. Recognition runs in `src/lib/recognize.ts`; the catalog listing sits behind a prompt-cache breakpoint so repeated scans are cheap.

```bash
npm test          # vitest: colour maths, matcher, catalog integrity
npm run typecheck
npm run build     # static export into out/
```

## Deploying with GitHub Pages

`.github/workflows/pages.yml` builds the static export on every push to `main` and publishes it with GitHub's Pages actions. One-time setup in the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The site then lives at `https://<owner>.github.io/<repo>/`.

The workflow sets `NEXT_PUBLIC_BASE_PATH` to `/<repo-name>` because project pages are served from a sub-path. For a custom domain or a user site, leave it unset.

Because the site is static, the API key has to live in the browser. Use a key from a personal account with a spend limit, and treat the browser it is saved in as you would any device that holds a password. Anyone who can open your browser profile can read it.

## Photo tips

- Labels facing the camera, even light, no glare on the lids.
- A couple of dozen pots per photo is the sweet spot; up to six photos per scan.
- Vallejo and Army Painter Fanatic bottles print product codes; these are the most reliable identifier, so keep them in shot.

## The catalog

Paint data lives in `src/data/citadel.ts`, `src/data/army_painter.ts` and `src/data/vallejo.ts`; the schema is in `src/lib/types.ts`. Each entry has an id, brand, range, name, optional code, a dried-colour hex, a functional type (base, layer, shade, contrast, metallic, …), finish, opacity, tags and an optional note.

Names, codes and swatch hexes come from the MIT-licensed [Miniature Painter Pro dataset](https://github.com/Arcturus5404/miniature-paints), merged with hand-written notes, tags and classifications by `scripts/import-reference.ts`. To refresh after the dataset updates:

```bash
git clone --depth 1 https://github.com/Arcturus5404/miniature-paints /tmp/mp
node scripts/import-reference.ts /tmp/mp/paints
npm test
```

Coverage: Citadel Base, Layer, Shade, Contrast, Technical, Dry, Air and Spray; Army Painter Warpaints Fanatic (colours, metallics, effects, washes), Speedpaint 2.0 and 1.0, Warpaints Air, classic Warpaints, Colour Primer sprays and Quickshade washes; Vallejo Model Color, Game Color (plus washes and Special FX), Xpress Color and Xpress Intense, Metal Color, Liquid Gold, Model Air, Game Air, Model Wash, Mecha Color, Panzer Aces and Surface Primer.

Washes and shades are stored at their pigment colour, not the pale tint they leave over white, so they sit sensibly on the map. Hexes are swatch approximations, so map positions and cross-brand equivalents are guides rather than lab measurements. Anything the recogniser reads that is not listed is still added to your collection as an unlisted paint.

## Project layout

```
src/app/                 Next.js pages: scan (/), /collection, /map, /catalog, /api/recognize
src/components/          PaintMap (SVG), PaintDetail (drawer), PaintPicker, Nav, Swatch
src/lib/color.ts         sRGB / HSL / Lab conversions, ΔE, hue families
src/lib/match.ts         detection → catalog matcher (code, name, fuzzy)
src/lib/describe.ts      texture / usage / tips generator and cross-brand equivalents
src/lib/storage.ts       localStorage collection + import/export
src/data/                paint catalogs (generated; see scripts/import-reference.ts)
tests/                   vitest suites
```
