import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePixelGame } from '@/engine/usePixelGame';
import { clear, rect, text } from '@/engine/pixel';
import { playerDir, playerAction } from '@/engine/input';
import { playSound } from '@/audio/soundManager';

const W = 320;
const H = 240;
const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];

interface Tank {
  x: number;
  y: number;
  angle: number;
  hp: number;
  cd: number;
  alive: boolean;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: number;
}

export function TanksPixelGame({ players, onExit }: { players: 2 | 3 | 4; onExit: () => void }) {
  const { t } = useTranslation();
  const [winner, setWinner] = useState<number | null>(null);

  const st = useRef({
    tanks: [] as Tank[],
    bullets: [] as Bullet[],
  });

  const init = () => {
    const spawns = [
      { x: 40, y: 40 },
      { x: 280, y: 40 },
      { x: 40, y: 200 },
      { x: 280, y: 200 },
    ];
    st.current.tanks = Array.from({ length: players }, (_, i) => ({
      x: spawns[i].x,
      y: spawns[i].y,
      angle: 0,
      hp: 3,
      cd: 0,
      alive: true,
    }));
    st.current.bullets = [];
    setWinner(null);
  };

  useEffect(() => {
    init();
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [players, onExit]);

  const tick = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number) => {
      if (winner !== null) {
        clear(ctx, w, h, '#1a1410');
        text(ctx, `P${winner + 1} WINS!`, 100, 110, COLORS[winner], 12);
        return;
      }

      const s = st.current;
      let aliveCount = 0;
      let lastAlive = -1;

      for (let i = 0; i < players; i++) {
        const tank = s.tanks[i];
        if (!tank.alive) continue;
        aliveCount++;
        lastAlive = i;

        const d = playerDir(i);
        if (d.x || d.y) {
          tank.angle = Math.atan2(d.y, d.x);
          tank.x = Math.max(12, Math.min(w - 12, tank.x + d.x * 70 * dt));
          tank.y = Math.max(12, Math.min(h - 12, tank.y + d.y * 70 * dt));
        }
        tank.cd = Math.max(0, tank.cd - dt);
        if (playerAction(i) && tank.cd <= 0) {
          tank.cd = 0.45;
          const spd = 140;
          s.bullets.push({
            x: tank.x + Math.cos(tank.angle) * 10,
            y: tank.y + Math.sin(tank.angle) * 10,
            vx: Math.cos(tank.angle) * spd,
            vy: Math.sin(tank.angle) * spd,
            owner: i,
          });
          playSound('shoot');
        }
      }

      if (aliveCount <= 1 && players > 1) {
        setWinner(lastAlive);
        playSound('win');
      }

      for (const b of s.bullets) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }
      s.bullets = s.bullets.filter((b) => b.x > 0 && b.x < w && b.y > 0 && b.y < h);

      for (const b of s.bullets) {
        for (let i = 0; i < players; i++) {
          if (i === b.owner || !s.tanks[i].alive) continue;
          const t = s.tanks[i];
          if (Math.hypot(b.x - t.x, b.y - t.y) < 12) {
            t.hp--;
            b.x = -99;
            playSound('explosion');
            if (t.hp <= 0) t.alive = false;
          }
        }
      }

      clear(ctx, w, h, '#1a1410');
      rect(ctx, 80, 60, 40, 40, '#2a2018');
      rect(ctx, 200, 140, 50, 30, '#2a2018');

      for (let i = 0; i < players; i++) {
        const tank = s.tanks[i];
        if (!tank.alive) continue;
        ctx.save();
        ctx.translate(tank.x, tank.y);
        ctx.rotate(tank.angle);
        rect(ctx, -8, -6, 16, 12, COLORS[i]);
        rect(ctx, 4, -2, 10, 4, COLORS[i]);
        ctx.restore();
        for (let hi = 0; hi < tank.hp; hi++) {
          rect(ctx, tank.x - 8 + hi * 5, tank.y - 14, 4, 3, '#0f0');
        }
      }
      for (const b of s.bullets) {
        rect(ctx, b.x - 2, b.y - 2, 4, 4, '#ff0');
      }
      text(ctx, 'MOVE+SHOOT · last tank wins', 8, 6, '#666', 6);
    },
    [players, winner]
  );

  const canvasRef = usePixelGame(W, H, tick, true);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <h2 className="mb-2 font-display text-lg text-orange-500">{t('games.tanks.title')}</h2>
      <canvas ref={canvasRef} className="pixel-crisp" />
      <div className="mt-4 flex gap-2">
        {winner !== null && (
          <button type="button" className="hub-btn" onClick={init}>
            {t('death.retry')}
          </button>
        )}
        <button type="button" className="hub-btn-secondary" onClick={onExit}>
          {t('hub.exit')}
        </button>
      </div>
      <p className="mt-2 text-[10px] text-zinc-600">P1 WASD·P2 Arrows·P3 IJKL·P4 TFGH · Space/Enter shoot</p>
    </div>
  );
}
