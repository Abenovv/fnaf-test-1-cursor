/**
 * @fileoverview Player-adjustable settings with validation and persistence.
 * All settings flow through here — other systems listen for SETTINGS_CHANGED.
 */

import { GameConfig } from '../config/GameConfig.js';
import { EventSystem, Events } from './EventSystem.js';

const SETTINGS_KEY = 'fnaf_settings_v1';

/** @enum {string} */
export const QualityPreset = Object.freeze({
  LOW:    'low',
  MEDIUM: 'medium',
  HIGH:   'high',
  ULTRA:  'ultra',
});

const DEFAULTS = {
  quality:           QualityPreset.HIGH,
  masterVolume:      GameConfig.AUDIO.MASTER_VOLUME,
  musicVolume:       GameConfig.AUDIO.MUSIC_VOLUME,
  ambienceVolume:    GameConfig.AUDIO.AMBIENCE_VOLUME,
  sfxVolume:         GameConfig.AUDIO.SFX_VOLUME,
  fullscreen:        false,
  filmGrain:         true,
  chromatic:         true,
  crtEffect:         true,
  vignette:          true,
  bloom:             true,
  shadowsEnabled:    true,
  fov:               75,
  locale:            GameConfig.DEFAULT_LOCALE,
  debugMode:         GameConfig.DEBUG_DEFAULT,
  reducedMotion:     false,
  highContrast:      false,
};

/** Quality preset → renderer configuration map */
export const QUALITY_CONFIGS = {
  [QualityPreset.LOW]: {
    dpr:          0.5,
    shadows:      false,
    shadowSize:   256,
    fogFar:       8.0,
    postProcess:  false,
    maxLights:    2,
    anisotropy:   1,
  },
  [QualityPreset.MEDIUM]: {
    dpr:          0.75,
    shadows:      true,
    shadowSize:   512,
    fogFar:       12.0,
    postProcess:  true,
    maxLights:    4,
    anisotropy:   2,
  },
  [QualityPreset.HIGH]: {
    dpr:          1.0,
    shadows:      true,
    shadowSize:   GameConfig.SHADOW_MAP_SIZE,
    fogFar:       GameConfig.FOG_FAR,
    postProcess:  true,
    maxLights:    6,
    anisotropy:   4,
  },
  [QualityPreset.ULTRA]: {
    dpr:          Math.min(window.devicePixelRatio, 2),
    shadows:      true,
    shadowSize:   2048,
    fogFar:       24.0,
    postProcess:  true,
    maxLights:    8,
    anisotropy:   8,
  },
};

class SettingsManagerClass {
  constructor() {
    this._settings = { ...DEFAULTS };
  }

  load() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this._settings = { ...DEFAULTS, ...parsed };
      }
    } catch {
      this._settings = { ...DEFAULTS };
    }

    // Auto-detect mobile and downgrade quality
    if (this._isMobile() && this._settings.quality === QualityPreset.ULTRA) {
      this._settings.quality = QualityPreset.MEDIUM;
    }
  }

  save() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this._settings));
    } catch (err) {
      console.warn('[SettingsManager] Could not persist settings:', err);
    }
  }

  /**
   * @param {string} key
   * @param {*}      value
   */
  set(key, value) {
    if (!(key in DEFAULTS)) {
      console.warn(`[SettingsManager] Unknown key: "${key}"`);
      return;
    }
    const prev = this._settings[key];
    this._settings[key] = value;
    this.save();

    EventSystem.emit(Events.SETTINGS_CHANGED, { key, value, prev });

    if (key === 'quality') {
      EventSystem.emit(Events.QUALITY_CHANGED, { preset: value, config: this.getQualityConfig() });
    }
  }

  /** @param {string} key */
  get(key) {
    return this._settings[key];
  }

  /** @returns {Object} all settings */
  getAll() {
    return { ...this._settings };
  }

  /** @returns {Object} quality config for current preset */
  getQualityConfig() {
    return QUALITY_CONFIGS[this._settings.quality] ?? QUALITY_CONFIGS[QualityPreset.HIGH];
  }

  reset() {
    this._settings = { ...DEFAULTS };
    this.save();
    EventSystem.emit(Events.SETTINGS_CHANGED, { key: '*', value: this._settings });
  }

  _isMobile() {
    return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
      || window.innerWidth < 768;
  }
}

export const SettingsManager = new SettingsManagerClass();
