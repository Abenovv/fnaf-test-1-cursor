import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NightAIController } from '@/game/ai/AIController';
import type { AnimatronicId, AnimatronicState, LocationId } from '@/game/ai/types';
import { DEFAULT_ANIMATRONICS } from '@/game/ai/AIController';
import { CAMERA_FEEDS, GAME } from '@/game/constants';
import { usePixelGame } from '@/engine/usePixelGame';
import { clear, rect, text, pixelBorder } from '@/engine/pixel';
import { anyKey } from '@/engine/input';
import { playSound } from '@/audio/soundManager';
import { useHubStore } from '@/hub/hubStore';

const W = 320;
const H = 180;
const HOURS = ['12AM', '1AM', '2AM', '3AM', '4AM', '5AM', '6AM'];
const FEED_LABELS = ['STAGE', 'DINE', 'COVE', 'W.H', 'W.C', 'CLOSET', 'E.H', 'E.C', 'BACK', 'KIT'];

interface FnafState {
  power: number;
  hour: number;
  elapsed: number;
  doorL: boolean;
  doorR: boolean;
  lightL: boolean;
  lightR: boolean;
  camOpen: boolean;
  camFeed: number;
  powerOut: boolean;
  jumpscare: AnimatronicId | null;
  animatronics: Record<AnimatronicId, AnimatronicState>;
  keys: { d1: boolean; d2: boolean; cam: boolean };
}

export function FnafPixelGame({ onExit }: { onExit: () => void }) {
  const { t } = useTranslation();
  const night = useHubStore((s) => s.fnafNight);
  const markBeaten = useHubStore((s) => s.markFnafBeaten);
  const [ui, setUi] = useState<'playing' | 'dead' | 'win'>('playing');
  const [session, setSession] = useState(0);

  const s = useRef<FnafState>({
    power: GAME.POWER_START,
    hour: 0,
    elapsed: 0,
    doorL: false,
    doorR: false,
    lightL: false,
    lightR: false,
    camOpen: false,
    camFeed: 0,
    powerOut: false,
    jumpscare: null,
    animatronics: { ...DEFAULT_ANIMATRONICS },
    keys: { d1: false, d2: false, cam: false },
  });

  const aiRef = useRef<NightAIController | null>(null);
  const uiRef = useRef(ui);
  uiRef.current = ui;

  useEffect(() => {
    const st = s.current;
    const handlers = {
      getSnapshot: () => ({
        night,
        doorLeft: st.doorL,
        doorRight: st.doorR,
        cameraOpen: st.camOpen,
        activeCamera: CAMERA_FEEDS[st.camFeed] ?? 'cam1a',
        powerOut: st.powerOut,
      }),
      onMove: () => {
        if (aiRef.current) st.animatronics = aiRef.current.getStates();
      },
      onJumpscare: (id: AnimatronicId) => {
        st.jumpscare = id;
        playSound('jumpscare');
        setUi('dead');
      },
      onTension: () => {},
      onFoxyPowerDrain: (amt: number) => {
        st.power = Math.max(0, st.power - amt);
        if (st.power <= 0) st.powerOut = true;
      },
    };
    aiRef.current = new NightAIController(handlers);
    aiRef.current.configureForNight(night);
    Object.assign(st, {
      power: GAME.POWER_START,
      hour: 0,
      elapsed: 0,
      doorL: false,
      doorR: false,
      lightL: false,
      lightR: false,
      camOpen: false,
      camFeed: 0,
      powerOut: false,
      jumpscare: null,
      animatronics: { ...DEFAULT_ANIMATRONICS },
      keys: { d1: false, d2: false, cam: false },
    });
    setUi('playing');

    let powerTimer: ReturnType<typeof setTimeout> | null = null;
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (uiRef.current === 'playing') step(dt, () => {
        if (powerTimer) clearTimeout(powerTimer);
        powerTimer = setTimeout(() => {
          if (st.powerOut && uiRef.current === 'playing') {
            st.jumpscare = 'freddy';
            playSound('jumpscare');
            setUi('dead');
          }
        }, 5000);
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      if (powerTimer) clearTimeout(powerTimer);
    };
  }, [night, session]);

  function step(dt: number, onPowerOut: () => void) {
    const st = s.current;
    if (st.powerOut) {
      aiRef.current?.update(dt);
      return;
    }

    let drain = GAME.POWER_DRAIN_BASE;
    if (st.camOpen) drain += GAME.POWER_DRAIN_CAMERA;
    if (st.doorL) drain += GAME.POWER_DRAIN_DOOR;
    if (st.doorR) drain += GAME.POWER_DRAIN_DOOR;
    if (st.lightL) drain += GAME.POWER_DRAIN_LIGHT;
    if (st.lightR) drain += GAME.POWER_DRAIN_LIGHT;
    st.power = Math.max(0, st.power - drain * dt);

    st.elapsed += dt;
    const h = Math.min(6, Math.floor(st.elapsed / GAME.HOUR_DURATION_SEC));
    if (h !== st.hour) {
      st.hour = h;
      if (h >= 6) {
        markBeaten(night);
        playSound('win');
        setUi('win');
        return;
      }
    }
    if (st.power <= 0) {
      st.powerOut = true;
      st.power = 0;
      onPowerOut();
    }

    if (anyKey('Digit1') && !st.keys.d1) {
      st.doorL = !st.doorL;
      playSound('door');
    }
    st.keys.d1 = anyKey('Digit1');
    if (anyKey('Digit2') && !st.keys.d2) {
      st.doorR = !st.doorR;
      playSound('door');
    }
    st.keys.d2 = anyKey('Digit2');
    if (anyKey('KeyQ')) st.lightL = true;
    else st.lightL = false;
    if (anyKey('KeyE')) st.lightR = true;
    else st.lightR = false;
    if (anyKey('KeyC', 'Tab') && !st.keys.cam) {
      st.camOpen = !st.camOpen;
      playSound('camera');
    }
    st.keys.cam = anyKey('KeyC', 'Tab');
    if (st.camOpen) {
      if (anyKey('KeyA')) st.camFeed = Math.max(0, st.camFeed - 1);
      if (anyKey('KeyD')) st.camFeed = Math.min(9, st.camFeed + 1);
    }

    aiRef.current?.update(dt);
    if (aiRef.current) st.animatronics = aiRef.current.getStates();
  }

  const tick = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const st = s.current;
      clear(ctx, w, h, '#0c0c14');
      rect(ctx, 20, 60, 280, 100, '#1a1a22');
      rect(ctx, 120, 95, 80, 40, '#2a1810');
      rect(ctx, 135, 100, 50, 28, st.camOpen ? '#1a4060' : '#0a1520');
      rect(ctx, 8, 70, 24, 80, st.doorL ? '#4a2020' : '#222');
      rect(ctx, 288, 70, 24, 80, st.doorR ? '#4a2020' : '#222');
      if (st.lightL && !st.powerOut) rect(ctx, 0, 90, 12, 40, '#ffcc8866');
      if (st.lightR && !st.powerOut) rect(ctx, 308, 90, 12, 40, '#ffcc8866');

      const bonnieNear = (['corner_west', 'office', 'hallway_west'] as LocationId[]).includes(
        st.animatronics.bonnie.location
      );
      const chicaNear = (['corner_east', 'office', 'hallway_east'] as LocationId[]).includes(
        st.animatronics.chica.location
      );
      if (st.lightL && bonnieNear) rect(ctx, 2, 100, 10, 24, '#000');
      if (st.lightR && chicaNear) rect(ctx, 308, 100, 10, 24, '#000');

      const pc = st.power > 50 ? '#8a8' : st.power > 25 ? '#b86' : '#a00';
      text(ctx, `PWR ${Math.round(st.power)}%`, 24, 8, pc, 8);
      text(ctx, HOURS[st.hour] ?? '6AM', 140, 6, '#a00', 10, 'center');
      text(ctx, `NIGHT ${night}`, 140, 20, '#444', 6, 'center');
      pixelBorder(ctx, 8, 4, 304, 172, '#222');

      if (st.camOpen) {
        rect(ctx, 60, 30, 200, 90, '#050508');
        pixelBorder(ctx, 60, 30, 200, 90, '#a00');
        text(ctx, FEED_LABELS[st.camFeed] ?? '', 150, 70, '#444', 8, 'center');
      }
      if (st.powerOut) text(ctx, 'POWER OUT', 120, 150, '#a00', 8, 'center');
      if (ui === 'dead') {
        rect(ctx, 0, 0, w, h, '#400000cc');
        text(ctx, 'GAME OVER', 90, 75, '#f00', 14);
      }
      if (ui === 'win') {
        rect(ctx, 0, 0, w, h, '#001a00aa');
        text(ctx, '6 AM', 120, 75, '#6a6', 14);
      }
    },
    [night, ui]
  );

  const canvasRef = usePixelGame(W, H, tick, true);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onExit]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <canvas ref={canvasRef} className="pixel-crisp" />
      <div className="mt-4 flex gap-3">
        {ui === 'dead' && (
          <button
            type="button"
            className="hub-btn"
            onClick={() => {
              setSession((s) => s + 1);
              setUi('playing');
            }}
          >
            {t('death.retry')}
          </button>
        )}
        {ui === 'win' && (
          <button type="button" className="hub-btn" onClick={onExit}>
            {t('hub.continue')}
          </button>
        )}
        <button type="button" className="hub-btn-secondary" onClick={onExit}>
          {t('hub.exit')}
        </button>
      </div>
      <p className="mt-2 font-mono text-[10px] text-zinc-600">1/2 · Q/E · C · A/D cams · ESC hub</p>
    </div>
  );
}
