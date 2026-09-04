"use client";
import { useMemo, useRef, useState } from "react";
import { hexToHsl, isNeutral } from "@/lib/color";
import { BRAND_LABEL } from "@/lib/catalog";
import type { Brand, Paint } from "@/lib/types";

export interface MapPoint { paint: Paint; owned: boolean }

const W = 1000, H = 560, PAD = 34, NEUTRAL_W = 90;

/** Deterministic tiny jitter so identical colours do not stack exactly. */
function jitter(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((h % 1000) / 1000 - 0.5) * 8;
}

function position(p: Paint): { x: number; y: number } {
  const { h, s, l } = hexToHsl(p.hex);
  const y = PAD + (1 - l) * (H - 2 * PAD) + jitter(p.id + "y") * 0.5;
  if (isNeutral(p.hex)) {
    // Spread neutrals across their column: cool (bluish) greys to the left, warm (yellowish) greys to the right.
    const warmth = s < 0.02 ? 0.5 : h < 70 || h > 330 ? 0.5 + Math.min(s, 0.11) / 0.22 : 0.5 - Math.min(s, 0.11) / 0.22;
    return { x: PAD + 8 + warmth * (NEUTRAL_W - 16) + jitter(p.id) * 0.6, y };
  }
  // Start the hue axis at red-magenta so pinks and reds sit together, then walk round the wheel.
  const hh = (h + 20) % 360;
  const x = PAD + NEUTRAL_W + 20 + (hh / 360) * (W - 2 * PAD - NEUTRAL_W - 20) + jitter(p.id);
  return { x, y };
}

const HUE_TICKS: [string, number][] = [["red", 0], ["orange", 30], ["yellow", 55], ["green", 120], ["turquoise", 180], ["blue", 225], ["purple", 275], ["pink", 320]];

function marker(brand: Brand, x: number, y: number, r: number): string {
  switch (brand) {
    case "citadel": return `M${x - r},${y - r}h${2 * r}v${2 * r}h${-2 * r}z`; // square
    case "army_painter": return `M${x},${y - r * 1.25}L${x + r * 1.25},${y}L${x},${y + r * 1.25}L${x - r * 1.25},${y}z`; // diamond
    case "vallejo": return `M${x},${y}m${-r},0a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`; // circle
  }
}

export function PaintMap({ points, onSelect, selectedId }: { points: MapPoint[]; onSelect: (p: Paint) => void; selectedId?: string }) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, w: W, h: H });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const placed = useMemo(() => points.map((pt) => ({ ...pt, ...position(pt.paint) })), [points]);
  // Draw unowned first so owned paints sit on top.
  const ordered = useMemo(() => [...placed].sort((a, b) => Number(a.owned) - Number(b.owned)), [placed]);
  const r = Math.max(4, 7 * (view.w / W));

  const toClient = (e: React.MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, rect };
  };

  const onWheel = (e: React.WheelEvent) => {
    const { x, y, rect } = toClient(e);
    const f = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    setView((v) => {
      const nw = Math.min(W, Math.max(W / 8, v.w * f)), nh = nw * (H / W);
      const mx = v.x + (x / rect.width) * v.w, my = v.y + (y / rect.height) * v.h;
      const nx = Math.min(W - nw, Math.max(0, mx - (x / rect.width) * nw));
      const ny = Math.min(H - nh, Math.max(0, my - (y / rect.height) * nh));
      return { x: nx, y: ny, w: nw, h: nh };
    });
  };
  const onDown = (e: React.MouseEvent) => { drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; };
  const onMove = (e: React.MouseEvent) => {
    if (!drag.current) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const dx = ((e.clientX - drag.current.x) / rect.width) * view.w, dy = ((e.clientY - drag.current.y) / rect.height) * view.h;
    setView((v) => ({ ...v, x: Math.min(W - v.w, Math.max(0, drag.current!.vx - dx)), y: Math.min(H - v.h, Math.max(0, drag.current!.vy - dy)) }));
  };
  const onUp = () => { drag.current = null; };

  return (
    <div className="map-wrap">
      <svg ref={svgRef} className="map-svg" viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} onWheel={onWheel}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={() => { onUp(); setTip(null); }}>
        {/* axes */}
        <rect x={PAD} y={PAD} width={NEUTRAL_W} height={H - 2 * PAD} fill="none" stroke="currentColor" strokeOpacity=".15" />
        <text x={PAD + NEUTRAL_W / 2} y={PAD - 12} fontSize="12" textAnchor="middle" fill="currentColor" opacity=".55">neutrals (cool → warm)</text>
        {HUE_TICKS.map(([name, hue]) => {
          const x = PAD + NEUTRAL_W + 20 + (((hue + 20) % 360) / 360) * (W - 2 * PAD - NEUTRAL_W - 20);
          return <text key={name} x={x} y={PAD - 12} fontSize="12" textAnchor="middle" fill="currentColor" opacity=".55">{name}</text>;
        })}
        <text x={W - PAD + 6} y={PAD + 6} fontSize="11" fill="currentColor" opacity=".5">light</text>
        <text x={W - PAD + 6} y={H - PAD} fontSize="11" fill="currentColor" opacity=".5">dark</text>
        <line x1={PAD + NEUTRAL_W + 20} x2={W - PAD} y1={H - PAD} y2={H - PAD} stroke="currentColor" strokeOpacity=".15" />

        {ordered.map(({ paint, owned, x, y }) => (
          <path key={paint.id} d={marker(paint.brand, x, y, owned ? r : r * 0.8)}
            fill={paint.hex} fillOpacity={owned ? 1 : 0.28}
            stroke={paint.id === selectedId ? "currentColor" : paint.type === "metallic" ? "#fff" : "rgba(0,0,0,.35)"}
            strokeWidth={paint.id === selectedId ? 2.5 : owned ? 1 : 0.5}
            style={{ cursor: "pointer" }}
            onClick={(e) => { e.stopPropagation(); onSelect(paint); }}
            onMouseEnter={(e) => { const c = toClient(e); setTip({ x: c.x, y: c.y, text: `${paint.name} · ${BRAND_LABEL[paint.brand]} ${paint.range}${owned ? " · owned" : ""}` }); }}
            onMouseLeave={() => setTip(null)}
          />
        ))}
      </svg>
      {tip && <div className="map-tip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>}
      <div className="legend">
        <span>■ Citadel</span><span>◆ Army Painter</span><span>● Vallejo</span>
        <span>solid = owned, faint = not owned</span><span>white outline = metallic</span>
        <span>scroll to zoom, drag to pan</span>
      </div>
    </div>
  );
}
