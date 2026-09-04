"use client";
import { BRAND_LABEL } from "@/lib/catalog";
import { textOn } from "@/lib/color";
import { describePaint, distanceWords, equivalents, similarPaints } from "@/lib/describe";
import { useCollection } from "@/lib/collection-context";
import type { Paint } from "@/lib/types";
import { PaintSwatch } from "./Swatch";

export function PaintDetail({ paint, onClose, onNavigate }: { paint: Paint; onClose: () => void; onNavigate: (p: Paint) => void }) {
  const info = describePaint(paint);
  const { qtyOf, add, setQuantity } = useCollection();
  const qty = qtyOf(paint.id);
  const eq = equivalents(paint);
  const sims = similarPaints(paint, { limit: 6 });
  const isCustom = paint.id.startsWith("custom-");

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={paint.name}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: ".6rem" }}>
          <span className="stat">{isCustom ? "Unlisted paint" : `${BRAND_LABEL[paint.brand]} · ${paint.range}${paint.code ? ` · ${paint.code}` : ""}`}</span>
          <button className="btn small ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={`hero${paint.type === "metallic" ? " swatch metallic" : ""}`} style={{ background: paint.hex, color: textOn(paint.hex) }}>
          <div>
            <h2>{paint.name}</h2>
            <div style={{ opacity: .85, fontSize: ".85rem" }}>{paint.hex} · {info.colour}</div>
          </div>
        </div>

        <div className="row">
          <span className="chip">{paint.type}</span>
          <span className="chip">{paint.finish}</span>
          <span className="chip">{paint.opacity}</span>
          {(paint.tags ?? []).map((t) => <span className="chip" key={t}>{t}</span>)}
        </div>

        <h3>In your collection</h3>
        <div className="row">
          {qty > 0 ? (
            <>
              <button className="btn small" onClick={() => setQuantity(paint.id, qty - 1)}>−</button>
              <strong>{qty} pot{qty === 1 ? "" : "s"}</strong>
              <button className="btn small" onClick={() => setQuantity(paint.id, qty + 1)}>+</button>
            </>
          ) : (
            <button className="btn primary small" onClick={() => add(paint.id, 1, "manual")}>Add to collection</button>
          )}
        </div>

        <h3>Texture &amp; consistency</h3>
        <p>{info.consistency}</p>
        <p>{info.application}</p>

        <h3>Useful for</h3>
        <ul>{info.usefulFor.map((u) => <li key={u}>{u}</li>)}</ul>

        <h3>Tips</h3>
        <ul>{info.tips.map((t) => <li key={t}>{t}</li>)}</ul>

        {!isCustom && (
          <>
            <h3>Closest match in other brands</h3>
            <div className="stack" style={{ gap: ".2rem" }}>
              {eq.map(({ brand, label, match }) => match ? (
                <button key={brand} className="sim" onClick={() => onNavigate(match.paint)}>
                  <PaintSwatch paint={match.paint} size={22} />
                  <span>{match.paint.name} <span className="d">· {label} {match.paint.range}</span></span>
                  <span className="d">{distanceWords(match.distance)} (ΔE {match.distance.toFixed(0)})</span>
                </button>
              ) : <span key={brand} className="d">{label}: no comparable paint</span>)}
            </div>

            <h3>Similar colours</h3>
            <div className="stack" style={{ gap: ".2rem" }}>
              {sims.map(({ paint: s, distance }) => (
                <button key={s.id} className="sim" onClick={() => onNavigate(s)}>
                  <PaintSwatch paint={s} size={22} />
                  <span>{s.name} <span className="d">· {BRAND_LABEL[s.brand]} {s.range}</span></span>
                  <span className="d">{qtyOf(s.id) > 0 ? "owned · " : ""}ΔE {distance.toFixed(0)}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
