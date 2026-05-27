/**
 * @fileoverview Runtime localization with fallback to English.
 * Supports dynamic locale switching and parameterized strings.
 */

import { GameConfig } from '../config/GameConfig.js';

class LocalizationManagerClass {
  constructor() {
    /** @type {Object<string,string>} */
    this._strings = {};
    this._locale  = GameConfig.DEFAULT_LOCALE;
  }

  /**
   * Load locale strings. Call at startup.
   * @param {string} locale
   */
  async load(locale = GameConfig.DEFAULT_LOCALE) {
    this._locale = locale;
    try {
      const mod = await import(`../localization/${locale}.js`);
      this._strings = mod.default;
    } catch {
      console.warn(`[Localization] Locale "${locale}" not found, falling back to "en".`);
      const mod = await import('../localization/en.js');
      this._strings = mod.default;
    }
  }

  /**
   * Translate a key with optional parameter substitution.
   * @param {string} key
   * @param {Object} [params]  e.g. { name: 'Freddy' }
   * @returns {string}
   */
  t(key, params) {
    let str = this._strings[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replaceAll(`{${k}}`, v);
      }
    }
    return str;
  }
}

export const LocalizationManager = new LocalizationManagerClass();

/** Convenience shorthand */
export const t = (key, params) => LocalizationManager.t(key, params);
