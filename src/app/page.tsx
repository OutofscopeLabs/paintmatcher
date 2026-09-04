"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { ALL_PAINTS, BRAND_LABEL, getPaint } from "@/lib/catalog";
import { useCollection } from "@/lib/collection-context";
import { prepareImage, type PreparedImage } from "@/lib/image";
import type { Detection } from "@/lib/match";
import { recognizeImages, type RecognitionResult } from "@/lib/recognize";
import { DEFAULTS, type Settings } from "@/lib/settings";
import { slug } from "@/lib/text";
import type { Paint } from "@/lib/types";
import { ApiKeyPanel } from "@/components/ApiKeyPanel";
import { PaintDetail } from "@/components/PaintDetail";
import { PaintPicker } from "@/components/PaintPicker";
import { PaintSwatch, Swatch } from "@/components/Swatch";

interface ReviewRow {
  key: string;
  detection: Detection;
  candidates: { paintId: string; score: number }[];
  /** Chosen catalog paint, or null to add as an unlisted custom paint. */
  chosen: string | null;
  include: boolean;
  qty: number;
}

function confClass(c: number) { return c >= 0.85 ? "hi" : c >= 0.5 ? "mid" : "lo"; }

export default function ScanPage() {
  const [images, setImages] = useState<PreparedImage[]>([]);
  const [busy, setBusy] = useState<"prep" | "recognize" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [caveats, setCaveats] = useState<string[]>([]);
  const [usage, setUsage] = useState<RecognitionResult["usage"] | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [dragOver, setDragOver] = useState(false);
  const [detail, setDetail] = useState<Paint | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  const { add, addCustomPaint, qtyOf } = useCollection();

  const addFiles = useCallback(async (files: FileList | File[]) => {
    setError(null); setBusy("prep");
    try {
      const prepared: PreparedImage[] = [];
      for (const f of Array.from(files)) if (f.type.startsWith("image/")) prepared.push(await prepareImage(f));
      setImages((prev) => [...prev, ...prepared].slice(0, 6));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read image");
    } finally { setBusy(null); }
  }, []);

  const recognize = async () => {
    setBusy("recognize"); setError(null); setRows(null); setAdded(null);
    try {
      const result = await recognizeImages(images.map((i) => ({ data: i.data, mediaType: i.mediaType })), settings.apiKey, settings.model);
      setRows(result.matches.map((m, i) => ({
        key: `${i}-${m.detection.name}`,
        detection: m.detection,
        candidates: m.candidates.map((c) => ({ paintId: c.paint.id, score: c.score })),
        chosen: m.best?.paint.id ?? null,
        include: true,
        qty: m.detection.count,
      })));
      setCaveats(result.caveats); setUsage(result.usage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recognition failed");
    } finally { setBusy(null); }
  };

  const updateRow = (key: string, patch: Partial<ReviewRow>) => setRows((rs) => rs!.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const commit = () => {
    if (!rows) return;
    let n = 0;
    for (const r of rows) {
      if (!r.include || r.qty < 1) continue;
      if (r.chosen) { add(r.chosen, r.qty, "photo"); n += r.qty; continue; }
      const d = r.detection;
      if (!d.name.trim()) continue;
      addCustomPaint({
        id: `custom-${slug(`${d.brand}-${d.range ?? ""}-${d.name}-${d.code ?? ""}`)}`,
        brand: d.brand === "unknown" ? "other" : d.brand,
        range: d.range, name: d.name, code: d.code,
        hex: d.hexGuess ?? "#888888",
        type: /wash|shade|tone/i.test(d.range ?? "") ? "shade" : /contrast|speedpaint|xpress/i.test(d.range ?? "") ? "contrast" : /metal/i.test(`${d.range} ${d.name}`) ? "metallic" : "base",
        addedAt: new Date().toISOString(),
      }, r.qty);
      n += r.qty;
    }
    setAdded(n); setRows(null); setImages([]);
  };

  const includedCount = rows?.filter((r) => r.include && (r.chosen || r.detection.name.trim())).length ?? 0;

  return (
    <main className="page stack">
      <div>
        <h1>Scan your paints</h1>
        <p className="lead">Photograph a shelf, rack or handful of pots. Labels facing the camera, decent light, and no more than a couple of dozen pots per photo works best. PaintMatcher reads the labels, matches them against {ALL_PAINTS.length} catalogued Citadel, Army Painter and Vallejo paints, and lets you confirm before anything is added.</p>
      </div>

      {added !== null && <div className="notice">Added {added} pot{added === 1 ? "" : "s"} to your collection. <Link href="/collection">View collection</Link> or <Link href="/map">see them on the map</Link>.</div>}
      {error && <div className="notice error">{error}</div>}

      <ApiKeyPanel onChange={setSettings} />

      <div className={`dropzone${dragOver ? " active" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); void addFiles(e.dataTransfer.files); }}>
        <p>Drop photos here, or</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <label className="btn">Choose photos<input type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && void addFiles(e.target.files)} /></label>
          <label className="btn">Take a photo<input type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files && void addFiles(e.target.files)} /></label>
        </div>
        <p className="stat" style={{ marginTop: ".6rem" }}>Up to 6 photos per scan; images are resized in your browser before upload.</p>
      </div>

      {images.length > 0 && (
        <div className="panel stack">
          <div className="thumbs">
            {images.map((img, i) => (
              <div className="thumb" key={i}>
                <img src={img.previewUrl} alt={img.name} />
                <button className="btn small" onClick={() => setImages((im) => im.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </div>
          <div className="row">
            <button className="btn primary" disabled={busy !== null || !settings.apiKey} title={settings.apiKey ? "" : "Add your API key first"} onClick={recognize}>{busy === "recognize" ? "Reading labels…" : "Identify paints"}</button>
            <button className="btn ghost" disabled={busy !== null} onClick={() => { setImages([]); setRows(null); }}>Clear</button>
            {busy === "recognize" && <span className="stat">This takes 15–60 seconds depending on how many pots are in shot.</span>}
          </div>
        </div>
      )}

      {rows && (
        <div className="panel stack">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>Review {rows.length} detected paint{rows.length === 1 ? "" : "s"}</h2>
            <button className="btn primary" disabled={includedCount === 0} onClick={commit}>Add {includedCount} to collection</button>
          </div>
          {caveats.length > 0 && <div className="notice">{caveats.join(" ")}</div>}
          {rows.length === 0 && <p className="empty">No paint pots were recognised. Try a closer photo with labels facing the camera.</p>}
          <div className="detections">
            {rows.map((r) => {
              const chosen = r.chosen ? getPaint(r.chosen) : undefined;
              const d = r.detection;
              return (
                <div key={r.key} className={`det${r.include ? "" : " excluded"}`}>
                  <input type="checkbox" checked={r.include} onChange={(e) => updateRow(r.key, { include: e.target.checked })} aria-label="Include" />
                  <div className="stack" style={{ gap: ".3rem" }}>
                    <div className="row">
                      {chosen ? <button className="row" style={{ background: "none", border: 0, padding: 0 }} onClick={() => setDetail(chosen)}><PaintSwatch paint={chosen} /> <strong>{chosen.name}</strong> <span className={`chip brand-${chosen.brand}`}>{BRAND_LABEL[chosen.brand]} · {chosen.range}{chosen.code ? ` · ${chosen.code}` : ""}</span>{qtyOf(chosen.id) > 0 && <span className="chip">already own {qtyOf(chosen.id)}</span>}</button>
                        : <span className="row"><Swatch hex={d.hexGuess ?? "#888888"} /> <strong>{d.name || "Unreadable label"}</strong> <span className="chip">not in catalog — will be added as “{d.brand === "other" || d.brand === "unknown" ? "other" : BRAND_LABEL[d.brand]}” paint</span></span>}
                    </div>
                    <div className="meta">
                      Read as: {d.brand === "unknown" ? "unknown brand" : d.brand === "other" ? "other brand" : BRAND_LABEL[d.brand]}{d.range ? ` ${d.range}` : ""} “{d.name}”{d.code ? ` (${d.code})` : ""} · <span className={`conf ${confClass(d.confidence)}`}>{Math.round(d.confidence * 100)}% sure</span>
                      {d.labelText && d.labelText !== d.name ? ` · label: “${d.labelText}”` : ""}
                    </div>
                    <div className="row">
                      <select value={r.chosen ?? "__custom"} onChange={(e) => updateRow(r.key, { chosen: e.target.value === "__custom" ? null : e.target.value })}>
                        {r.candidates.map((c) => { const p = getPaint(c.paintId)!; return <option key={c.paintId} value={c.paintId}>{p.name} — {BRAND_LABEL[p.brand]} {p.range}{p.code ? ` ${p.code}` : ""} ({Math.round(c.score * 100)}%)</option>; })}
                        <option value="__custom">Not one of these — keep as unlisted paint</option>
                      </select>
                      <div style={{ flex: 1, minWidth: 220 }}><PaintPicker placeholder="…or search the catalog" onPick={(p) => updateRow(r.key, { chosen: p.id, candidates: [{ paintId: p.id, score: 1 }, ...r.candidates.filter((c) => c.paintId !== p.id)] })} /></div>
                    </div>
                  </div>
                  <label className="check">× <input type="number" min={1} value={r.qty} onChange={(e) => updateRow(r.key, { qty: Math.max(1, Number(e.target.value) || 1) })} /></label>
                </div>
              );
            })}
          </div>
          {usage && <div className="stat">{usage.model} · {usage.inputTokens + usage.cachedTokens} input tokens ({usage.cachedTokens} cached) · {usage.outputTokens} output</div>}
        </div>
      )}

      {detail && <PaintDetail paint={detail} onClose={() => setDetail(null)} onNavigate={setDetail} />}
    </main>
  );
}
