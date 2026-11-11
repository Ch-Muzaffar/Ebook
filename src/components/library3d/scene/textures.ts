import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { seededRandom } from "./seeded-random";

/**
 * Procedural material textures painted on canvases at load time — real-looking surfaces with
 * zero image downloads. All are greyscale-ish so the material colour (and per-instance colours on
 * the shelves) tints them; that's how one texture serves both themes.
 */

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function finish(c: HTMLCanvasElement, repeat: [number, number] = [1, 1], aniso = 4) {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = aniso;
  return t;
}

/** Fine speckle noise over the whole canvas. */
function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, rand: () => number) {
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/** Long, wavy wood grain (for shelves, columns, beams). */
export function woodTexture(aniso = 4) {
  const rand = seededRandom(11);
  const [c, ctx] = canvas(128, 256);
  ctx.scale(0.5, 0.5); // drawn at half size: same look, a quarter of the pixels to generate
  ctx.fillStyle = "#e9e1d6";
  ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 60; i++) {
    const x = rand() * 256;
    const shade = 150 + rand() * 70;
    ctx.strokeStyle = `rgba(${shade - 40},${shade - 60},${shade - 80},${0.12 + rand() * 0.2})`;
    ctx.lineWidth = 0.6 + rand() * 2.2;
    ctx.beginPath();
    for (let y = 0; y <= 512; y += 16) {
      const wobble = Math.sin(y / (40 + rand() * 30) + i) * (2 + rand() * 3);
      if (y === 0) ctx.moveTo(x + wobble, y);
      else ctx.lineTo(x + wobble, y);
    }
    ctx.stroke();
  }
  // A few knots.
  for (let k = 0; k < 3; k++) {
    const kx = rand() * 256;
    const ky = rand() * 512;
    for (let r = 10; r > 1; r -= 2.5) {
      ctx.strokeStyle = `rgba(90,62,40,${0.18})`;
      ctx.beginPath();
      ctx.ellipse(kx, ky, r * 0.7, r * 1.8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  speckle(ctx, 128, 256, 14, rand);
  return finish(c, [1, 1], aniso);
}

/** Floorboards: planks with staggered joints, running down the hall. */
export function floorTexture(aniso = 8) {
  const rand = seededRandom(23);
  const [c, ctx] = canvas(256, 512);
  const planks = 6;
  const pw = 256 / planks;
  for (let p = 0; p < planks; p++) {
    let y = -rand() * 400;
    while (y < 512) {
      const len = 150 + rand() * 200;
      const tone = 200 + rand() * 40;
      ctx.fillStyle = `rgb(${tone},${tone - 10},${tone - 24})`;
      ctx.fillRect(p * pw, y, pw, len);
      // grain
      for (let g = 0; g < 8; g++) {
        ctx.strokeStyle = `rgba(110,80,50,${0.05 + rand() * 0.1})`;
        ctx.lineWidth = 0.6 + rand();
        const gx = p * pw + rand() * pw;
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.bezierCurveTo(gx + rand() * 6 - 3, y + len / 3, gx + rand() * 6 - 3, y + (2 * len) / 3, gx, y + len);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(60,40,25,0.55)";
      ctx.fillRect(p * pw, y, pw, 2); // end joint
      y += len;
    }
    ctx.fillStyle = "rgba(60,40,25,0.5)";
    ctx.fillRect(p * pw, 0, 2, 512); // side joint
  }
  speckle(ctx, 256, 512, 10, rand);
  return finish(c, [2, 6], aniso);
}

/** Leather spine: soft grain, raised bands and gilt rules near head and tail. */
export function spineTexture(aniso = 4) {
  const rand = seededRandom(37);
  const [c, ctx] = canvas(64, 256);
  ctx.fillStyle = "#d8d2c8";
  ctx.fillRect(0, 0, 64, 256);
  // Rounded-spine shading (darker at the edges).
  const g = ctx.createLinearGradient(0, 0, 64, 0);
  g.addColorStop(0, "rgba(0,0,0,0.35)");
  g.addColorStop(0.5, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  // Raised bands + gilt rules.
  for (const y of [26, 34, 222, 230]) {
    ctx.fillStyle = "rgba(255,240,200,0.85)";
    ctx.fillRect(4, y, 56, 2);
  }
  for (const y of [70, 150]) {
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(0, y, 64, 6);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(0, y, 64, 2);
  }
  // Title label block.
  ctx.fillStyle = "rgba(255,235,190,0.35)";
  ctx.fillRect(14, 96, 36, 34);
  speckle(ctx, 64, 256, 26, rand);
  return finish(c, [1, 1], aniso);
}

/** Plaster / painted wall with faint mottling. */
export function plasterTexture() {
  const rand = seededRandom(51);
  const [c, ctx] = canvas(128, 128);
  ctx.scale(0.5, 0.5);
  ctx.fillStyle = "#f0ece4";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(${rand() < 0.5 ? "0,0,0" : "255,255,255"},${0.02 + rand() * 0.03})`;
    ctx.beginPath();
    ctx.arc(rand() * 256, rand() * 256, 10 + rand() * 40, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  speckle(ctx, 128, 128, 12, rand);
  return finish(c, [3, 2], 2);
}

/** Vertical light-shaft gradient (bright core, soft edges), used with additive blending. */
export function shaftTexture() {
  const [c, ctx] = canvas(128, 256);
  const h = ctx.createLinearGradient(0, 0, 128, 0);
  h.addColorStop(0, "rgba(255,255,255,0)");
  h.addColorStop(0.5, "rgba(255,255,255,1)");
  h.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = h;
  ctx.fillRect(0, 0, 128, 256);
  ctx.globalCompositeOperation = "destination-in";
  const v = ctx.createLinearGradient(0, 0, 0, 256);
  v.addColorStop(0, "rgba(0,0,0,0.9)");
  v.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, 128, 256);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Round soft dot for dust particles. */
export function dotTexture() {
  const [c, ctx] = canvas(32, 32);
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
