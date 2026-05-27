export const GAME = {
  NIGHT_DURATION_SEC: 8 * 60,
  HOUR_DURATION_SEC: (8 * 60) / 6,
  POWER_START: 100,
  POWER_DRAIN_BASE: 0.35,
  POWER_DRAIN_CAMERA: 0.55,
  POWER_DRAIN_DOOR: 0.95,
  POWER_DRAIN_LIGHT: 0.45,
  AI_TICK_MS: 5000,
} as const;

export const NIGHT_AI: Record<number, { freddy: number; bonnie: number; chica: number; foxy: number }> = {
  1: { freddy: 0, bonnie: 0, chica: 0, foxy: 0 },
  2: { freddy: 0, bonnie: 3, chica: 1, foxy: 1 },
  3: { freddy: 1, bonnie: 5, chica: 3, foxy: 2 },
  4: { freddy: 2, bonnie: 7, chica: 5, foxy: 4 },
  5: { freddy: 4, bonnie: 10, chica: 8, foxy: 6 },
  6: { freddy: 8, bonnie: 15, chica: 12, foxy: 10 },
  7: { freddy: 10, bonnie: 20, chica: 20, foxy: 20 },
};

export const CAMERA_FEEDS = [
  'cam1a', 'cam1b', 'cam1c', 'cam2a', 'cam2b', 'cam3', 'cam4a', 'cam4b', 'cam5', 'cam6',
] as const;

export type CameraFeedId = (typeof CAMERA_FEEDS)[number];

export const SAVE_KEY = 'fnaf_save_v2';
export const SETTINGS_KEY = 'fnaf_settings_v2';
