import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePixelGame } from '@/engine/usePixelGame';
import { clear, rect, text } from '@/engine/pixel';
import { playerDir } from '@/engine/input';
import { playSound } from '@/audio/soundManager';

const W = 256;
const H = 256;
const TILE = 16;

const MAP = `
1111111111111111
1000000000000001
1011111011111101
1000001000000001
1011101010111101
1000100000001001
1010101111010101
1000100000001001
1011101010111101
1000001000000001
1011111011111101
1000000000000001
1011111111111101
1000000000000001
1111111111111111
`.trim().split('\n').map((r) => r.split('').map(Number));

export function GrannyPixelGame({ players, onExit }: { players: 1 | 2; onExit: () => void }) {
  const { t } = useTranslation();
  const [end, setEnd] = useState<'play' | 'win' | 'lose'>('play');

  const st = useRef({
    p: [{ x: 40, y: 40 }, { x: 56, y: 40 }],
    granny: { x: 180, y: 180 },
  });

  const reset = () => {
    st.current = { p: [{ x: 40, y: 40 }, { x: 56, y: 40 }], granny: { x: 180, y: 180 } };
    setEnd('play');
  };

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onExit]);

  const tick = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number) => {
      if (end !== 'play') {
        clear(ctx, w, h, '#0a1008');
        text(ctx, end === 'win' ? 'ESCAPED!' : 'CAUGHT!', 70, 120, end === 'win' ? '#6a6' : '#a00', 12);
        return;
      }

      const s = st.current;
      const wall = (x: number, y: number) => {
        const tx = Math.floor(x / TILE);
        const ty = Math.floor(y / TILE);
        if (tx < 0 || ty < 0 || tx >= 16 || ty >= 16) return true;
        return MAP[ty][tx] === 1;
      };

      const d0 = playerDir(0);
      if (d0.x || d0.y) {
        const sp = 55 * dt;
        const nx = s.p[0].x + d0.x * sp;
        const ny = s.p[0].y + d0.y * sp;
        if (!wall(nx, s.p[0].y)) s.p[0].x = nx;
        if (!wall(s.p[0].x, ny)) s.p[0].y = ny;
      }

      if (players === 2) {
        const gd = playerDir(1);
        s.granny.x += gd.x * 50 * dt;
        s.granny.y += gd.y * 50 * dt;
      } else {
        const dx = s.p[0].x - s.granny.x;
        const dy = s.p[0].y - s.granny.y;
        const len = Math.hypot(dx, dy) || 1;
        s.granny.x += (dx / len) * 35 * dt;
        s.granny.y += (dy / len) * 35 * dt;
        if (len < 60) playSound('granny_near');
        if (len < 12) {
          setEnd('lose');
          playSound('lose');
        }
      }

      const tx = Math.floor(s.p[0].x / TILE);
      const ty = Math.floor(s.p[0].y / TILE);
      if (tx >= 13 && ty <= 2) {
        setEnd('win');
        playSound('win');
      }

      clear(ctx, w, h, '#0a1008');
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const c = MAP[y][x];
          rect(ctx, x * TILE, y * TILE, TILE, TILE, c === 1 ? '#2a3028' : (x + y) % 2 ? '#141a14' : '#101410');
        }
      }
      rect(ctx, 208, 8, TILE, TILE, '#4a8040');
      rect(ctx, s.granny.x - 5, s.granny.y - 7, 10, 14, '#5a4030');
      rect(ctx, s.p[0].x - 4, s.p[0].y - 6, 8, 12, '#48f');
      text(ctx, players === 2 ? 'P2 moves Granny' : 'Reach top-right exit', 8, 4, '#666', 6);
    },
    [players, end]
  );

  const canvasRef = usePixelGame(W, H, tick, true);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <h2 className="mb-2 font-display text-lg text-emerald-500">{t('games.granny.title')}</h2>
      <canvas ref={canvasRef} className="pixel-crisp" />
      <div className="mt-4 flex gap-2">
        {end !== 'play' && (
          <button type="button" className="hub-btn" onClick={reset}>
            {t('death.retry')}
          </button>
        )}
        <button type="button" className="hub-btn-secondary" onClick={onExit}>
          {t('hub.exit')}
        </button>
      </div>
    </div>
  );
}
