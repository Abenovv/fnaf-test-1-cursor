import { useEffect, useRef } from 'react';
import { NightAIController } from '@/game/ai/AIController';
import type { AnimatronicId } from '@/game/ai/types';
import { useGameStore } from '@/store/gameStore';

/** Full animatronic AI — Freddy, Bonnie, Chica, Foxy with unique behaviors. */
export function useAIController() {
  const screen = useGameStore((s) => s.screen);
  const night = useGameStore((s) => s.night);
  const powerOut = useGameStore((s) => s.powerOut);
  const jumpscare = useGameStore((s) => s.jumpscare);

  const controllerRef = useRef<NightAIController | null>(null);
  const powerDeathRef = useRef(false);
  const jumpscareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handlers = {
      getSnapshot: () => useGameStore.getState().getAISnapshot(),
      onMove: (_id: AnimatronicId, _loc: string) => {
        if (!controllerRef.current) return;
        useGameStore.getState().setAnimatronics(controllerRef.current.getStates());
      },
      onJumpscare: (id: AnimatronicId) => {
        useGameStore.getState().triggerJumpscare(id);
      },
      onTension: (tension: number) => {
        useGameStore.getState().setTension(tension);
      },
      onFoxyPowerDrain: (amount: number) => {
        useGameStore.getState().drainPower(amount);
      },
    };

    controllerRef.current = new NightAIController(handlers);
    return () => {
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (screen !== 'playing' || !controllerRef.current) return;
    controllerRef.current.configureForNight(night);
    useGameStore.getState().setAnimatronics(controllerRef.current.getStates());
  }, [screen, night]);

  useEffect(() => {
    if (screen !== 'playing') return;

    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      controllerRef.current?.update(delta);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [screen]);

  useEffect(() => {
    if (!powerOut) {
      powerDeathRef.current = false;
      return;
    }
    if (powerDeathRef.current || screen !== 'playing') return;
    powerDeathRef.current = true;
    const t = setTimeout(() => {
      const s = useGameStore.getState();
      if (s.screen === 'playing' && s.powerOut) {
        s.triggerJumpscare('freddy');
      }
    }, 5500);
    return () => clearTimeout(t);
  }, [powerOut, screen]);

  useEffect(() => {
    if (!jumpscare) return;
    if (jumpscareTimerRef.current) clearTimeout(jumpscareTimerRef.current);
    jumpscareTimerRef.current = setTimeout(() => {
      const s = useGameStore.getState();
      s.clearJumpscare();
      s.recordDeath();
    }, 2200);
    return () => {
      if (jumpscareTimerRef.current) clearTimeout(jumpscareTimerRef.current);
    };
  }, [jumpscare]);
}
