/** Client-side image preparation: downscale and re-encode as JPEG so uploads stay small and fast. */

export interface PreparedImage { data: string; mediaType: "image/jpeg"; previewUrl: string; name: string }

async function decode(file: File): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; release: () => void }> {
  try {
    const bmp = await createImageBitmap(file);
    return { width: bmp.width, height: bmp.height, draw: (ctx, w, h) => ctx.drawImage(bmp, 0, 0, w, h), release: () => bmp.close() };
  } catch {
    // Fall back to an <img> element, which handles a few more formats (and EXIF rotation) in some browsers.
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("undecodable"));
        el.src = url;
      });
      return { width: img.naturalWidth, height: img.naturalHeight, draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h), release: () => URL.revokeObjectURL(url) };
    } catch {
      URL.revokeObjectURL(url);
      throw new Error(`Could not read “${file.name}”. Your browser cannot decode this format (HEIC photos from iPhones are a common case) — export it as JPEG or PNG and try again.`);
    }
  }
}

export async function prepareImage(file: File, maxEdge = 1800, quality = 0.86): Promise<PreparedImage> {
  const src = await decode(file);
  try {
    const scale = Math.min(1, maxEdge / Math.max(src.width, src.height));
    const w = Math.max(1, Math.round(src.width * scale)), h = Math.max(1, Math.round(src.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    src.draw(ctx, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return { data: dataUrl.split(",")[1], mediaType: "image/jpeg", previewUrl: dataUrl, name: file.name };
  } finally {
    src.release();
  }
}
