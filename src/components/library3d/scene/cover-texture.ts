import { CanvasTexture, SRGBColorSpace } from "three";

/** `image` (optional): the product's real cover; BookModel loads it over the typographic cover. */
export type CoverSpec = { title: string; author: string; background: string; ink: string; rule: string; image?: string };

/**
 * Paints a typographic book cover onto a canvas and wraps it as a texture — no image assets
 * to download. Uses the page's Playfair Display / Inter font families (from next/font).
 * Used as the placeholder while a real cover image loads, and for books without one.
 */
export function createCoverTexture(spec: CoverSpec, maxAnisotropy = 1): CanvasTexture {
  const W = 512;
  const H = 768;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const rootStyle = getComputedStyle(document.documentElement);
  const serif = rootStyle.getPropertyValue("--font-playfair").trim() || "Georgia, serif";
  const sans = rootStyle.getPropertyValue("--font-inter").trim() || "system-ui, sans-serif";

  ctx.fillStyle = spec.background;
  ctx.fillRect(0, 0, W, H);

  // Fine inset frame + short rule, echoing the editorial UI.
  ctx.strokeStyle = spec.rule;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, W - 56, H - 56);
  ctx.globalAlpha = 1;
  ctx.fillStyle = spec.rule;
  ctx.fillRect(64, 92, 72, 3);

  // Title, wrapped.
  ctx.fillStyle = spec.ink;
  ctx.font = `500 58px ${serif}`;
  ctx.textBaseline = "alphabetic";
  const lines = wrap(ctx, spec.title, W - 128);
  const lineH = 68;
  const startY = H * 0.5 - ((lines.length - 1) * lineH) / 2;
  lines.forEach((line, i) => ctx.fillText(line, 64, startY + i * lineH));

  // Author.
  ctx.font = `500 22px ${sans}`;
  ctx.globalAlpha = 0.75;
  ctx.fillText(spec.author.toUpperCase().split("").join(String.fromCharCode(8202)), 64, H - 84);
  ctx.globalAlpha = 1;

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  return tex;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}
