import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GAME, NIGHT_AI, SAVE_KEY, type CameraFeedId } from '@/game/constants';
import { DEFAULT_ANIMATRONICS } from '@/game/ai/AIController';
import type { AnimatronicId, AnimatronicState } from '@/game/ai/types';

export type Screen =
  | 'loading'
  | 'menu'
  | 'nightSelect'
  | 'playing'
  | 'settings'
  | 'death'
  | 'survive';

export type LocaleCode = 'en' | 'ru' | 'kk' | 'es' | 'de' | 'fr' | 'pt' | 'zh';

interface SaveSlice {
  currentNight: number;
  highestNight: number;
  nightsBeaten: number[];
  totalDeaths: number;
}

interface GameState extends SaveSlice {
  screen: Screen;
  locale: LocaleCode;
  night: number;
  power: number;
  hour: number;
  nightElapsed: number;
  doorLeft: boolean;
  doorRight: boolean;
  lightLeft: boolean;
  lightRight: boolean;
  cameraOpen: boolean;
  activeCamera: CameraFeedId;
  powerOut: boolean;
  quality: 'low' | 'medium' | 'high';
  masterVolume: number;
  filmGrain: boolean;
  bloom: boolean;
  animatronics: Record<AnimatronicId, AnimatronicState>;
  tension: number;
  jumpscare: AnimatronicId | null;

  setScreen: (s: Screen) => void;
  setLocale: (l: LocaleCode) => void;
  startNight: (night: number) => void;
  resetShift: () => void;
  tickPlaying: (delta: number) => void;
  toggleDoorLeft: () => void;
  toggleDoorRight: () => void;
  toggleLightLeft: () => void;
  toggleLightRight: () => void;
  openCamera: () => void;
  closeCamera: () => void;
  switchCamera: (id: CameraFeedId) => void;
  setAnimatronics: (states: Record<AnimatronicId, AnimatronicState>) => void;
  setTension: (tension: number) => void;
  drainPower: (amount: number) => void;
  triggerJumpscare: (id: AnimatronicId) => void;
  clearJumpscare: () => void;
  recordDeath: () => void;
  recordSurvive: () => void;
  getPowerDrain: () => number;
  getUsageBars: () => number;
  getAISnapshot: () => {
    night: number;
    doorLeft: boolean;
    doorRight: boolean;
    cameraOpen: boolean;
    activeCamera: CameraFeedId;
    powerOut: boolean;
  };
}

const initialSave: SaveSlice = {
  currentNight: 1,
  highestNight: 0,
  nightsBeaten: [],
  totalDeaths: 0,
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialSave,
      screen: 'loading',
      locale: 'en',
      night: 1,
      power: GAME.POWER_START,
      hour: 0,
      nightElapsed: 0,
      doorLeft: false,
      doorRight: false,
      lightLeft: false,
      lightRight: false,
      cameraOpen: false,
      activeCamera: 'cam1a',
      powerOut: false,
      quality: 'high',
      masterVolume: 0.85,
      filmGrain: true,
      bloom: true,
      animatronics: { ...DEFAULT_ANIMATRONICS },
      tension: 0,
      jumpscare: null,

      setScreen: (screen) => set({ screen }),
      setLocale: (locale) => set({ locale }),

      startNight: (night) =>
        set({
          screen: 'playing',
          night,
          power: GAME.POWER_START,
          hour: 0,
          nightElapsed: 0,
          doorLeft: false,
          doorRight: false,
          lightLeft: false,
          lightRight: false,
          cameraOpen: false,
          activeCamera: 'cam1a',
          powerOut: false,
          animatronics: { ...DEFAULT_ANIMATRONICS },
          tension: 0,
          jumpscare: null,
        }),

      resetShift: () => {
        const { night } = get();
        get().startNight(night);
      },

      tickPlaying: (delta) => {
        const s = get();
        if (s.screen !== 'playing' || s.powerOut) return;

        const drain = get().getPowerDrain();
        const power = Math.max(0, s.power - drain * delta);
        let nightElapsed = s.nightElapsed + delta;
        let hour = s.hour;

        const newHour = Math.min(6, Math.floor(nightElapsed / GAME.HOUR_DURATION_SEC));
        if (newHour !== hour) {
          hour = newHour;
          if (hour >= 6) {
            get().recordSurvive();
            set({ screen: 'survive', hour, nightElapsed, power });
            return;
          }
        }

        if (power <= 0) {
          set({ power: 0, powerOut: true, hour, nightElapsed });
          return;
        }

        set({ power, hour, nightElapsed });
      },

      toggleDoorLeft: () => {
        if (get().powerOut) return;
        set((s) => ({ doorLeft: !s.doorLeft }));
      },
      toggleDoorRight: () => {
        if (get().powerOut) return;
        set((s) => ({ doorRight: !s.doorRight }));
      },
      toggleLightLeft: () => {
        if (get().powerOut) return;
        set((s) => ({ lightLeft: !s.lightLeft }));
      },
      toggleLightRight: () => {
        if (get().powerOut) return;
        set((s) => ({ lightRight: !s.lightRight }));
      },
      openCamera: () => {
        if (get().powerOut) return;
        set({ cameraOpen: true });
      },
      closeCamera: () => set({ cameraOpen: false }),
      switchCamera: (activeCamera) => set({ activeCamera }),

      setAnimatronics: (animatronics) => set({ animatronics }),
      setTension: (tension) => set({ tension }),

      drainPower: (amount) => {
        const power = Math.max(0, get().power - amount);
        set({ power, ...(power <= 0 ? { powerOut: true } : {}) });
      },

      triggerJumpscare: (id) => set({ jumpscare: id }),

      clearJumpscare: () => set({ jumpscare: null }),

      getAISnapshot: () => {
        const s = get();
        return {
          night: s.night,
          doorLeft: s.doorLeft,
          doorRight: s.doorRight,
          cameraOpen: s.cameraOpen,
          activeCamera: s.activeCamera,
          powerOut: s.powerOut,
        };
      },

      recordDeath: () => {
        set((s) => ({
          screen: 'death',
          totalDeaths: s.totalDeaths + 1,
          jumpscare: null,
        }));
      },

      recordSurvive: () => {
        const s = get();
        const beaten = s.nightsBeaten.includes(s.night)
          ? s.nightsBeaten
          : [...s.nightsBeaten, s.night];
        set({
          nightsBeaten: beaten,
          highestNight: Math.max(s.highestNight, s.night),
          currentNight: Math.min(s.night + 1, 7),
        });
      },

      getPowerDrain: () => {
        const s = get();
        let rate = GAME.POWER_DRAIN_BASE;
        if (s.cameraOpen) rate += GAME.POWER_DRAIN_CAMERA;
        if (s.doorLeft) rate += GAME.POWER_DRAIN_DOOR;
        if (s.doorRight) rate += GAME.POWER_DRAIN_DOOR;
        if (s.lightLeft) rate += GAME.POWER_DRAIN_LIGHT;
        if (s.lightRight) rate += GAME.POWER_DRAIN_LIGHT;
        return rate;
      },

      getUsageBars: () => {
        const d = get().getPowerDrain();
        if (d < 0.5) return 1;
        if (d < 1) return 2;
        if (d < 2) return 3;
        if (d < 3) return 4;
        return 5;
      },
    }),
    {
      name: SAVE_KEY,
      partialize: (s) => ({
        currentNight: s.currentNight,
        highestNight: s.highestNight,
        nightsBeaten: s.nightsBeaten,
        totalDeaths: s.totalDeaths,
        locale: s.locale,
        quality: s.quality,
        masterVolume: s.masterVolume,
        filmGrain: s.filmGrain,
        bloom: s.bloom,
      }),
    }
  )
);

export function getNightAI(night: number) {
  return NIGHT_AI[Math.min(7, Math.max(1, night))] ?? NIGHT_AI[7];
}

export function isNightUnlocked(night: number, highestNight: number) {
  return night <= highestNight + 1;
}
