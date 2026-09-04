"use client";
import { useMemo, useRef, useState } from "react";
import { BRAND_LABEL, searchPaints } from "@/lib/catalog";
import { useCollection } from "@/lib/collection-context";
import { exportJson } from "@/lib/storage";
import type { Paint } from "@/lib/types";
import { PaintDetail } from "@/components/PaintDetail";
import { PaintPicker } from "@/components/PaintPicker";
import { PaintSwatch } from "@/components/Swatch";

export default function CollectionPage() {
  const { collection, ready, resolve, setQuantity, add, replace, clear } = useCollection();
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Paint | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const owned = useMemo(() => {
    const items = collection.owned.map((o) => ({ o, p: resolve(o.paintId) })).filter((x): x is { o: typeof x.o; p: Paint } => !!x.p);
    const filtered = q ? new Set(searchPaints(q, items.map((x) => x.p)).map((p) => p.id)) : null;
    return items.filter((x) => !filtered || filtered.has(x.p.id));
  }, [collection, q, resolve]);

  const groups = useMemo(() => {
    const m = new Map<string, typeof owned>();
    for (const x of owned) {
      const key = x.p.id.startsWith("custom-") ? "Unlisted paints" : `${BRAND_LABEL[x.p.brand]} · ${x.p.range}`;
      m.set(key, [...(m.get(key) ?? []), x]);
    }
    for (const list of m.values()) list.sort((a, b) => a.p.name.localeCompare(b.p.name));
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [owned]);

  const download = () => {
    const blob = new Blob([exportJson(collection)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `paintmatcher-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (f: File) => {
    try { replace(await f.text()); setMsg("Collection imported."); }
    catch (e) { setMsg(`Import failed: ${e instanceof Error ? e.message : "bad file"}`); }
  };

  const pots = collection.owned.reduce((n, o) => n + o.qty, 0);

  return (
    <main className="page stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Your collection</h1>
          <p className="lead">{ready ? `${collection.owned.length} distinct paints, ${pots} pots. Stored in this browser; export to keep a backup or move it to another device.` : "Loading…"}</p>
        </div>
        <div className="row">
          <button className="btn" onClick={download} disabled={collection.owned.length === 0}>Export JSON</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import JSON</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && void onImport(e.target.files[0])} />
          <button className="btn ghost" onClick={() => { if (confirm("Remove every paint from your collection?")) clear(); }} disabled={collection.owned.length === 0}>Clear</button>
        </div>
      </div>
      {msg && <div className="notice">{msg}</div>}

      <div className="panel stack">
        <div className="row">
          <div style={{ flex: 2, minWidth: 240 }}><PaintPicker placeholder="Add a paint by hand: search name or code…" onPick={(p) => { add(p.id, 1, "manual"); setMsg(`Added ${p.name}.`); }} /></div>
          <input type="search" placeholder="Filter your collection" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
        </div>
      </div>

      {ready && collection.owned.length === 0 && <p className="empty">Nothing here yet. <a href="/">Scan a photo</a> or add paints by hand above.</p>}

      {groups.map(([title, list]) => (
        <section key={title}>
          <div className="group-title">{title} · {list.length}</div>
          <div className="paint-list">
            {list.map(({ o, p }) => (
              <div key={p.id} className="paint-row">
                <button style={{ background: "none", border: 0, padding: 0 }} onClick={() => setDetail(p)} aria-label={`Details for ${p.name}`}><PaintSwatch paint={p} size={34} /></button>
                <button style={{ background: "none", border: 0, padding: 0, textAlign: "left" }} onClick={() => setDetail(p)}>
                  <div><strong>{p.name}</strong> {p.code && <span className="chip">{p.code}</span>} <span className="chip">{p.type}</span></div>
                  <div className="sub">{p.hex} · {p.finish}, {p.opacity}{o.source === "photo" ? " · from photo" : ""}</div>
                </button>
                <div className="row" style={{ gap: ".3rem" }}>
                  <button className="btn small" onClick={() => setQuantity(p.id, o.qty - 1)} aria-label="Remove one">−</button>
                  <span style={{ minWidth: "1.4rem", textAlign: "center" }}>{o.qty}</span>
                  <button className="btn small" onClick={() => setQuantity(p.id, o.qty + 1)} aria-label="Add one">+</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {detail && <PaintDetail paint={detail} onClose={() => setDetail(null)} onNavigate={setDetail} />}
    </main>
  );
}
