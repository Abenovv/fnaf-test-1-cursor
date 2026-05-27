/**
 * @fileoverview Central game configuration — single source of truth for all
 * tunable constants. Change values here; never hardcode them in systems.
 */

export const GameConfig = Object.freeze({

  /* ─── Identity ─────────────────────────────────────────── */
  TITLE:   'Five Nights at Freddy\'s — Analog Horror Edition',
  VERSION: '0.1.0',

  /* ─── Timing ────────────────────────────────────────────── */
  NIGHT_DURATION_SECONDS: 8 * 60,   // 8-minute real-time night
  HOUR_DURATION_SECONDS:  8 * 60 / 6,

  /* ─── Power ─────────────────────────────────────────────── */
  POWER_START:         100,
  POWER_DRAIN_BASE:    0.4,   // % per second at no usage
  POWER_DRAIN_CAMERA:  0.6,
  POWER_DRAIN_DOOR:    1.0,
  POWER_DRAIN_LIGHT:   0.5,
  POWER_DRAIN_FAN:     0.2,

  /* ─── Camera system ─────────────────────────────────────── */
  CAMERA_COUNT:        10,
  CAMERA_SWITCH_DELAY: 200,   // ms — prevents spam switching

  /* ─── Rendering ─────────────────────────────────────────── */
  SHADOW_MAP_SIZE:     1024,
  FOG_COLOR:           0x050507,
  FOG_NEAR:            2.0,
  FOG_FAR:             18.0,
  AMBIENT_INTENSITY:   0.04,
  FLICKER_INTERVAL_MS: [3000, 12000], // random range

  /* ─── Post-processing ────────────────────────────────────── */
  POST: {
    BLOOM_STRENGTH:    0.25,
    BLOOM_RADIUS:      0.35,
    BLOOM_THRESHOLD:   0.80,
    FILM_GRAIN:        0.04,
    CHROMATIC_ABER:    0.003,
    VIGNETTE_OFFSET:   0.60,
    VIGNETTE_DARKNESS: 0.90,
    CRT_BEND:          1.8,
    EXPOSURE:          0.85,
  },

  /* ─── AI base parameters ─────────────────────────────────── */
  AI: {
    TICK_INTERVAL_MS:   5000,   // global AI timer tick
    BASE_AGGRESSION:    0,      // 0–20 scale
    NIGHT_MULTIPLIER:   1,      // multiplied by night number
  },

  /* ─── Audio ─────────────────────────────────────────────── */
  AUDIO: {
    MASTER_VOLUME:    0.85,
    MUSIC_VOLUME:     0.35,
    AMBIENCE_VOLUME:  0.50,
    SFX_VOLUME:       0.80,
    VOICE_VOLUME:     1.00,
  },

  /* ─── Performance budgets ───────────────────────────────── */
  PERF: {
    TARGET_FPS:           60,
    ADAPTIVE_DPR_MIN:     0.5,
    ADAPTIVE_DPR_MAX:     1.0,
    GC_THRESHOLD_MS:      16,
    MOBILE_SHADOW_SIZE:   512,
    MOBILE_FOG_FAR:       12.0,
  },

  /* ─── Gameplay ───────────────────────────────────────────── */
  HALLUCINATION_CHANCE: 0.008,   // per-frame probability (very rare)
  JUMPSCARE_COOLDOWN:   60000,   // ms between consecutive jumpscares

  /* ─── Debug ─────────────────────────────────────────────── */
  DEBUG_DEFAULT:  false,
  DEBUG_HOTKEY:   'F3',

  /* ─── Localization ──────────────────────────────────────── */
  DEFAULT_LOCALE: 'en',

  /* ─── Save ───────────────────────────────────────────────── */
  SAVE_KEY: 'fnaf_save_v1',
});
