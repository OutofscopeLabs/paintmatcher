"use client";
import { useMemo, useState } from "react";
import { ALL_PAINTS, BRAND_LABEL, rangesFor, searchPaints } from "@/lib/catalog";
import { hexToHsl, textOn } from "@/lib/color";
import { useCollection } from "@/lib/collection-context";
import type { Brand, Paint, PaintType } from "@/lib/types";
import { PaintDetail } from "@/components/PaintDetail";

const TYPES: PaintType[] = ["base", "layer", "contrast", "shade", "metallic", "dry", "glaze", "effect", "technical", "air", "primer", "varnish"];
type Sort = "name" | "hue" | "light" | "dark";

function hueKey(p: Paint): number {
  const { h, s, l } = hexToHsl(p.hex);
  // Neutrals go first, ordered by lightness; then colours around the wheel starting at red.
  return s < 0.11 ? -1 + l : (h + 20) % 360;
}

export default function CatalogPage() {
  const { qtyOf, collection } = useCollection();
  const [brand, setBrand] = useState<Brand | "all">("all");
  const [range, setRange] = useState<string | "all">("all");
  const [type, setType] = useState<PaintType | "all">("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [detail, setDetail] = useState<Paint | null>(null);

  const ownedIds = useMemo(() => new Set(collection.owned.map((o) => o.paintId)), [collection]);
  const ranges = brand === "all" ? [] : rangesFor(brand);

  const paints = useMemo(() => {
    let list = ALL_PAINTS.filter((p) => (brand === "all" || p.brand === brand) && (range === "all" || p.range === range) && (type === "all" || p.type === type) && (!ownedOnly || ownedIds.has(p.id)));
    if (q.trim()) list = searchPaints(q, list);
    const cmp: Record<Sort, (a: Paint, b: Paint) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      hue: (a, b) => hueKey(a) - hueKey(b) || hexToHsl(b.hex).l - hexToHsl(a.hex).l,
      light: (a, b) => hexToHsl(b.hex).l - hexToHsl(a.hex).l,
      dark: (a, b) => hexToHsl(a.hex).l - hexToHsl(b.hex).l,
    };
    return [...list].sort(cmp[sort]);
  }, [brand, range, type, q, sort, ownedOnly, ownedIds]);

  // Group by brand + range unless the user is sorting by colour, where a single flat grid reads better.
  const groups = useMemo(() => {
    if (sort !== "name") return [["", paints] as [string, Paint[]]];
    const m = new Map<string, Paint[]>();
    for (const p of paints) {
      const k = `${BRAND_LABEL[p.brand]} · ${p.range}`;
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return [...m.entries()];
  }, [paints, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: ALL_PAINTS.length };
    for (const p of ALL_PAINTS) c[p.brand] = (c[p.brand] ?? 0) + 1;
    return c;
  }, []);

  return (
    <main className="page stack">
      <div>
        <h1>Paint encyclopedia</h1>
        <p className="lead">Browse every catalogued paint by brand and range, sort them by colour, and open any pot for what it is and what it is for. Paints you own are marked.</p>
      </div>

      <div className="panel stack">
        <div className="tabs">
          {(["all", "citadel", "army_painter", "vallejo"] as const).map((b) => (
            <button key={b} className={`tab${brand === b ? " active" : ""}`} onClick={() => { setBrand(b); setRange("all"); }}>
              {b === "all" ? "All brands" : BRAND_LABEL[b]} <span className="tab-count">{counts[b]}</span>
            </button>
          ))}
        </div>
        {ranges.length > 0 && (
          <div className="row" style={{ gap: ".3rem" }}>
            <button className={`btn small${range === "all" ? "" : " ghost"}`} onClick={() => setRange("all")}>All ranges</button>
            {ranges.map((r) => (
              <button key={r} className={`btn small${range === r ? "" : " ghost"}`} style={{ opacity: range === r || range === "all" ? 1 : .6 }} onClick={() => setRange(r)}>{r}</button>
            ))}
          </div>
        )}
        <div className="row">
          <input type="search" placeholder="Search name, code or tag" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
          <select value={type} onChange={(e) => setType(e.target.value as PaintType | "all")}>
            <option value="all">All types</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="name">Sort by range and name</option>
            <option value="hue">Sort by hue</option>
            <option value="light">Lightest first</option>
            <option value="dark">Darkest first</option>
          </select>
          <label className="check"><input type="checkbox" checked={ownedOnly} onChange={(e) => setOwnedOnly(e.target.checked)} /> Owned only</label>
          <span className="stat">{paints.length} paint{paints.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      {paints.length === 0 && <p className="empty">No paints match those filters.</p>}

      {groups.map(([title, list]) => (
        <section key={title || "flat"}>
          {title && <div className="group-title">{title} · {list.length}</div>}
          <div className="card-grid">
            {list.map((p) => {
              const qty = qtyOf(p.id);
              return (
                <button key={p.id} className={`card${p.finish === "metallic" ? " metallic" : ""}`} style={{ background: p.hex, color: textOn(p.hex) }} onClick={() => setDetail(p)} title={`${p.name} — ${BRAND_LABEL[p.brand]} ${p.range}`}>
                  {qty > 0 && <span className="owned-badge">✓ {qty > 1 ? qty : ""}</span>}
                  <span className="card-name">{p.name}</span>
                  <span className="card-sub">{p.code ? `${p.code} · ` : ""}{p.type}{title ? "" : ` · ${BRAND_LABEL[p.brand]}`}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {detail && <PaintDetail paint={detail} onClose={() => setDetail(null)} onNavigate={setDetail} />}
    </main>
  );
}
