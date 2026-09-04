import type { Paint } from "@/lib/types";

export function Swatch({ hex, size = 28, metallic = false, title }: { hex: string; size?: number; metallic?: boolean; title?: string }) {
  return <span className={`swatch${metallic ? " metallic" : ""}`} title={title ?? hex} style={{ width: size, height: size, background: hex }} />;
}

export function PaintSwatch({ paint, size }: { paint: Paint; size?: number }) {
  return <Swatch hex={paint.hex} size={size} metallic={paint.finish === "metallic"} title={`${paint.name} ${paint.hex}`} />;
}
