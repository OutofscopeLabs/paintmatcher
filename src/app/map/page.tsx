"use client";
import { useMemo, useState } from "react";
import { ALL_PAINTS, BRAND_LABEL } from "@/lib/catalog";
import { useCollection } from "@/lib/collection-context";
import type { Brand, Paint, PaintType } from "@/lib/types";
import { PaintDetail } from "@/components/PaintDetail";
import { PaintMap, type MapPoint } from "@/components/PaintMap";

const TYPES: PaintType[] = ["base", "layer", "contrast", "shade", "metallic", "dry", "glaze", "effect", "technical", "air", "primer", "varnish"];

export default function MapPage() {
  const { collection, ready, resolve } = useCollection();
  const [ownedOnly, setOwnedOnly] = useState(true);
  const [brands, setBrands] = useState<Set<Brand>>(new Set(["citadel", "army_painter", "vallejo"]));
  const [types, setTypes] = useState<Set<PaintType>>(new Set(TYPES));
  const [detail, setDetail] = useState<Paint | null>(null);

  const ownedIds = useMemo(() => new Set(collection.owned.map((o) => o.paintId)), [collection]);

  const points = useMemo<MapPoint[]>(() => {
    const out: MapPoint[] = [];
    const seen = new Set<string>();
    for (const p of ALL_PAINTS) {
      const owned = ownedIds.has(p.id);
      if (ownedOnly && !owned) continue;
      if (!brands.has(p.brand) || !types.has(p.type)) continue;
      out.push({ paint: p, owned }); seen.add(p.id);
    }
    // Custom (unlisted) paints from photos are always shown when owned.
    for (const o of collection.owned) {
      if (seen.has(o.paintId) || !o.paintId.startsWith("custom-")) continue;
      const p = resolve(o.paintId);
      if (p && types.has(p.type)) out.push({ paint: p, owned: true });
    }
    return out;
  }, [ownedIds, ownedOnly, brands, types, collection, resolve]);

  const toggle = <T,>(set: Set<T>, v: T, setter: (s: Set<T>) => void) => { const n = new Set(set); if (n.has(v)) n.delete(v); else n.add(v); setter(n); };
  const ownedShown = points.filter((p) => p.owned).length;

  return (
    <main className="page stack">
      <div>
        <h1>Colour map</h1>
        <p className="lead">Every paint placed by hue (left to right) and lightness (top to bottom), with greys and blacks in their own column. Paints above and below each other are highlight and shadow siblings; neighbours side by side are hue shifts. Click any dot for what it is and what it is good for.</p>
      </div>

      <div className="panel row" style={{ gap: "1rem" }}>
        <label className="check"><input type="checkbox" checked={ownedOnly} onChange={(e) => setOwnedOnly(e.target.checked)} /> Only paints I own</label>
        <span className="row" style={{ gap: ".4rem" }}>
          {(Object.keys(BRAND_LABEL) as Brand[]).map((b) => (
            <label key={b} className="check"><input type="checkbox" checked={brands.has(b)} onChange={() => toggle(brands, b, setBrands)} /> {BRAND_LABEL[b]}</label>
          ))}
        </span>
        <span className="row" style={{ gap: ".3rem" }}>
          {TYPES.map((t) => (
            <button key={t} className={`btn small${types.has(t) ? "" : " ghost"}`} style={{ opacity: types.has(t) ? 1 : .5 }} onClick={() => toggle(types, t, setTypes)}>{t}</button>
          ))}
        </span>
        <span className="stat">{points.length} shown · {ownedShown} owned</span>
      </div>

      {ready && ownedOnly && ownedShown === 0 && (
        <div className="notice">You have not added any paints yet — <a href="/">scan a photo</a>, or untick “Only paints I own” to browse the whole catalog.</div>
      )}

      <PaintMap points={points} onSelect={setDetail} selectedId={detail?.id} />

      <p className="stat">Positions come from each paint's approximate dried colour. Metallics are placed by their mid-tone. Contrast paints, shades and glazes are placed by their colour at full strength, so on the model they will read lighter over a pale undercoat.</p>

      {detail && <PaintDetail paint={detail} onClose={() => setDetail(null)} onNavigate={setDetail} />}
    </main>
  );
}
