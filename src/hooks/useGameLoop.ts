import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

/** Drives power drain, clock, and AI while playing. */
export function useGameLoop() {
  const screen = useGameStore((s) => s.screen);
  const tickPlaying = useGameStore((s) => s.tickPlaying);

  useEffect(() => {
    if (screen !== 'playing') return;

    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      tickPlaying(delta);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [screen, tickPlaying]);
}
