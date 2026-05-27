/** Shared 2D pixel drawing helpers — integer coords, crisp scaling */

export function clear(ctx: CanvasRenderingContext2D, w: number, h: number, color = '#0a0a12') {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
}

export function rect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
}

export function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  color: string,
  size = 10,
  align: CanvasTextAlign = 'left'
) {
  ctx.fillStyle = color;
  ctx.font = `${size}px "Press Start 2P", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillText(str, Math.floor(x), Math.floor(y));
}

export function pixelBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  thickness = 2
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.strokeRect(Math.floor(x) + 0.5, Math.floor(y) + 0.5, Math.floor(w), Math.floor(h));
}

/** Scale canvas for pixel-perfect fullscreen */
export function fitCanvas(
  canvas: HTMLCanvasElement,
  baseW: number,
  baseH: number
): { scale: number; offsetX: number; offsetY: number } {
  const parent = canvas.parentElement;
  if (!parent) return { scale: 1, offsetX: 0, offsetY: 0 };
  const pw = parent.clientWidth;
  const ph = parent.clientHeight;
  const scale = Math.floor(Math.min(pw / baseW, ph / baseH));
  const s = Math.max(1, scale);
  canvas.width = baseW * s;
  canvas.height = baseH * s;
  canvas.style.width = `${baseW * s}px`;
  canvas.style.height = `${baseH * s}px`;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.scale(s, s);
  }
  return { scale: s, offsetX: (pw - baseW * s) / 2, offsetY: (ph - baseH * s) / 2 };
}
