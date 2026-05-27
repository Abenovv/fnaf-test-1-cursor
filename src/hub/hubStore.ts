import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameId, HubScreen, PlayerMode } from './types';

interface HubState {
  screen: HubScreen;
  activeGame: GameId | null;
  playerCount: PlayerMode;
  locale: string;
  masterVolume: number;
  sfxEnabled: boolean;
  musicEnabled: boolean;
  /** FNAF — all nights unlocked */
  fnafNight: number;
  fnafBeaten: number[];

  setScreen: (s: HubScreen) => void;
  launchGame: (id: GameId, players: PlayerMode) => void;
  exitGame: () => void;
  setVolume: (v: number) => void;
  setFnafNight: (n: number) => void;
  markFnafBeaten: (n: number) => void;
}

export const useHubStore = create<HubState>()(
  persist(
    (set, get) => ({
      screen: 'loading',
      activeGame: null,
      playerCount: 1,
      locale: 'en',
      masterVolume: 0.85,
      sfxEnabled: true,
      musicEnabled: true,
      fnafNight: 1,
      fnafBeaten: [],

      setScreen: (screen) => set({ screen }),
      launchGame: (id, players) =>
        set({ activeGame: id, playerCount: players, screen: 'playing' }),
      exitGame: () => set({ activeGame: null, screen: 'hub' }),
      setVolume: (masterVolume) => set({ masterVolume }),
      setFnafNight: (fnafNight) => set({ fnafNight }),
      markFnafBeaten: (n) => {
        const beaten = get().fnafBeaten.includes(n) ? get().fnafBeaten : [...get().fnafBeaten, n];
        set({ fnafBeaten: beaten });
      },
    }),
    {
      name: 'pixel_arcade_hub_v1',
      partialize: (s) => ({
        locale: s.locale,
        masterVolume: s.masterVolume,
        sfxEnabled: s.sfxEnabled,
        musicEnabled: s.musicEnabled,
        fnafNight: s.fnafNight,
        fnafBeaten: s.fnafBeaten,
      }),
    }
  )
);

/** All 7 FNAF nights unlocked */
export function isFnafNightUnlocked(_night: number) {
  return true;
}
