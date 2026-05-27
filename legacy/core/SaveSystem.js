/**
 * @fileoverview Persistent save/load system backed by LocalStorage.
 * Versioned schema with automatic migration support.
 */

import { GameConfig } from '../config/GameConfig.js';
import { EventSystem, Events } from './EventSystem.js';

const SCHEMA_VERSION = 1;

/** @typedef {Object} SaveData */
const DEFAULT_SAVE = {
  schemaVersion: SCHEMA_VERSION,
  currentNight:  1,
  highestNight:  0,
  totalDeaths:   0,
  nightsBeaten:  [],
  stats: {
    totalPlaytime:   0,     // seconds
    totalCameraUses: 0,
    totalDoorCloses: 0,
    closestCall:     100,   // lowest power % survived
  },
  settings: {},
  lastSaved: null,
};

class SaveSystemClass {
  constructor() {
    this._key  = GameConfig.SAVE_KEY;
    this._data = null;
  }

  /** Load save data from LocalStorage, applying migration as needed. */
  load() {
    try {
      const raw = localStorage.getItem(this._key);
      if (!raw) { this._data = this._fresh(); return; }

      const parsed = JSON.parse(raw);
      this._data   = this._migrate(parsed);
    } catch (err) {
      console.warn('[SaveSystem] Corrupt save data — resetting.', err);
      this._data = this._fresh();
    }
  }

  /** Persist current save state. */
  save() {
    this._data.lastSaved = new Date().toISOString();
    try {
      localStorage.setItem(this._key, JSON.stringify(this._data));
    } catch (err) {
      console.error('[SaveSystem] Failed to write save:', err);
    }
  }

  /** Hard-reset save data. */
  reset() {
    this._data = this._fresh();
    this.save();
  }

  /** @returns {SaveData} */
  getData() {
    return this._data;
  }

  /**
   * Update a top-level field or nested path.
   * @param {string} key   - dot-delimited path e.g. "stats.totalDeaths"
   * @param {*}      value
   */
  set(key, value) {
    const parts = key.split('.');
    let   node  = this._data;
    for (let i = 0; i < parts.length - 1; i++) {
      node = node[parts[i]];
    }
    node[parts.at(-1)] = value;
  }

  /**
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    const parts = key.split('.');
    let   node  = this._data;
    for (const p of parts) {
      if (node == null) return undefined;
      node = node[p];
    }
    return node;
  }

  // ── Private ───────────────────────────────────────────────

  _fresh() {
    return JSON.parse(JSON.stringify(DEFAULT_SAVE));
  }

  _migrate(data) {
    // Future: add case blocks here as schema evolves
    if (!data.schemaVersion || data.schemaVersion < SCHEMA_VERSION) {
      console.info('[SaveSystem] Migrating save data to schema v' + SCHEMA_VERSION);
      return { ...this._fresh(), ...data, schemaVersion: SCHEMA_VERSION };
    }
    return data;
  }
}

export const SaveSystem = new SaveSystemClass();
