import { useEffect, useRef } from 'react';

export function usePixelGame(
  baseW: number,
  baseH: number,
  tick: (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number) => void,
  active: boolean
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const pw = parent.clientWidth;
      const ph = parent.clientHeight;
      const scale = Math.max(1, Math.floor(Math.min(pw / baseW, ph / baseH)));
      canvas.width = baseW * scale;
      canvas.height = baseH * scale;
      canvas.style.width = `${baseW * scale}px`;
      canvas.style.height = `${baseH * scale}px`;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      tickRef.current(ctx, baseW, baseH, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [active, baseW, baseH]);

  return canvasRef;
}
