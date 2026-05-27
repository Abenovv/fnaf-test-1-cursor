import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePixelGame } from '@/engine/usePixelGame';
import { clear, rect, text } from '@/engine/pixel';
import { playerDir, playerAction } from '@/engine/input';
import { playSound } from '@/audio/soundManager';

const W = 320;
const H = 240;
const TW = 20;
const TH = 15;
const TILE = 16;

type Tile = 0 | 1 | 2 | 3; // air grass dirt stone

const COLORS: Record<Tile, string> = {
  0: '#87ceeb',
  1: '#3d8b37',
  2: '#6b4423',
  3: '#666',
};

export function MinicraftPixelGame({ players, onExit }: { players: 1 | 2 | 3 | 4; onExit: () => void }) {
  const { t } = useTranslation();

  const st = useRef({
    world: [] as Tile[][],
    players: Array.from({ length: players }, (_, i) => ({
      x: 80 + i * 20,
      y: 80,
      color: ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'][i],
      selected: 1 as Tile,
    })),
    camX: 0,
    camY: 0,
  });

  useEffect(() => {
    const world: Tile[][] = [];
    for (let y = 0; y < TH; y++) {
      world[y] = [];
      for (let x = 0; x < TW; x++) {
        if (y > 8) world[y][x] = Math.random() < 0.3 ? 3 : 2;
        else if (y > 5) world[y][x] = 1;
        else world[y][x] = 0;
      }
    }
    st.current.world = world;

    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [players, onExit]);

  const tick = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number) => {
      const s = st.current;
      const world = s.world;

      for (let pi = 0; pi < players; pi++) {
        const p = s.players[pi];
        const d = playerDir(pi);
        if (d.x || d.y) {
          p.x += d.x * 60 * dt;
          p.y += d.y * 60 * dt;
          p.x = Math.max(0, Math.min(TW * TILE - 8, p.x));
          p.y = Math.max(0, Math.min(TH * TILE - 8, p.y));
        }
        s.camX = p.x - w / 2;
        s.camY = p.y - h / 2;

        const tx = Math.floor((p.x + 4) / TILE);
        const ty = Math.floor((p.y + 8) / TILE);
        if (tx >= 0 && tx < TW && ty >= 0 && ty < TH) {
          if (playerAction(pi)) {
            if (world[ty][tx] !== 0) {
              world[ty][tx] = 0;
              playSound('mine');
            } else if (p.selected !== 0) {
              world[ty][tx] = p.selected;
              playSound('place');
            }
          }
        }
        if (pi === 0) {
          if (typeof window !== 'undefined') {
            /* cycle block with number keys */
          }
        }
      }

      clear(ctx, w, h, '#87ceeb');
      const cx = Math.max(0, s.camX);
      const cy = Math.max(0, s.camY);

      for (let y = 0; y < TH; y++) {
        for (let x = 0; x < TW; x++) {
          const px = x * TILE - cx;
          const py = y * TILE - cy;
          if (px < -TILE || py < -TILE || px > w || py > h) continue;
          const tile = world[y][x];
          rect(ctx, px, py, TILE, TILE, COLORS[tile]);
          if (tile !== 0) {
            rect(ctx, px + 2, py + 2, TILE - 4, TILE - 4, COLORS[tile]);
          }
        }
      }

      for (let pi = 0; pi < players; pi++) {
        const p = s.players[pi];
        rect(ctx, p.x - cx, p.y - cy, 8, 14, p.color);
      }

      text(ctx, 'ACTION: mine/place · 1-3 block type', 8, 8, '#333', 6);
      text(ctx, `PLAYERS: ${players}`, 8, 20, '#333', 6);
    },
    [players]
  );

  const canvasRef = usePixelGame(W, H, tick, true);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <h2 className="mb-2 font-display text-lg text-green-500">{t('games.minicraft.title')}</h2>
      <canvas ref={canvasRef} className="pixel-crisp" />
      <button type="button" className="hub-btn-secondary mt-4" onClick={onExit}>
        {t('hub.exit')}
      </button>
      <p className="mt-2 text-[10px] text-zinc-600">P1-P4 move · action key mines/places</p>
    </div>
  );
}
