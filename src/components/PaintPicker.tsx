"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ALL_PAINTS, BRAND_LABEL, searchPaints } from "@/lib/catalog";
import type { Paint } from "@/lib/types";
import { PaintSwatch } from "./Swatch";

/** Search box that resolves to a catalog paint. */
export function PaintPicker({ onPick, placeholder = "Search the catalog (name or code)…", autoFocus }: { onPick: (p: Paint) => void; placeholder?: string; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const results = useMemo(() => (q.trim().length < 2 ? [] : searchPaints(q, ALL_PAINTS).slice(0, 40)), [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="picker" ref={ref}>
      <input type="search" value={q} placeholder={placeholder} autoFocus={autoFocus} style={{ width: "100%" }}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
      {open && results.length > 0 && (
        <div className="results">
          {results.map((p) => (
            <button key={p.id} type="button" onClick={() => { onPick(p); setQ(""); setOpen(false); }}>
              <PaintSwatch paint={p} size={22} />
              <span>{p.name}</span>
              <span className="chip">{BRAND_LABEL[p.brand]} · {p.range}{p.code ? ` · ${p.code}` : ""}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
