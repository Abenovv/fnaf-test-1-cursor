/**
 * @fileoverview Type-safe, priority-ordered event bus.
 * All inter-system communication flows through here — no direct coupling.
 *
 * Usage:
 *   EventSystem.on(Events.POWER_DEPLETED, handler, priority);
 *   EventSystem.emit(Events.POWER_DEPLETED, { ... });
 *   EventSystem.off(Events.POWER_DEPLETED, handler);
 */

/** Exhaustive catalogue of all game events — never use raw strings. */
export const Events = Object.freeze({
  // ── Engine lifecycle ──────────────────────────────────────
  ENGINE_READY:            'engine:ready',
  ENGINE_PAUSED:           'engine:paused',
  ENGINE_RESUMED:          'engine:resumed',
  SCENE_LOADED:            'scene:loaded',
  SCENE_UNLOADED:          'scene:unloaded',

  // ── Night lifecycle ───────────────────────────────────────
  NIGHT_START:             'night:start',
  NIGHT_END_SURVIVE:       'night:end:survive',
  NIGHT_END_FAIL:          'night:end:fail',
  HOUR_CHANGED:            'night:hour:changed',

  // ── Power ─────────────────────────────────────────────────
  POWER_CHANGED:           'power:changed',
  POWER_DEPLETED:          'power:depleted',
  POWER_RESTORED:          'power:restored',

  // ── Doors & Lights ────────────────────────────────────────
  DOOR_LEFT_TOGGLED:       'door:left:toggled',
  DOOR_RIGHT_TOGGLED:      'door:right:toggled',
  LIGHT_LEFT_TOGGLED:      'light:left:toggled',
  LIGHT_RIGHT_TOGGLED:     'light:right:toggled',

  // ── Cameras ───────────────────────────────────────────────
  CAMERA_OPENED:           'camera:opened',
  CAMERA_CLOSED:           'camera:closed',
  CAMERA_SWITCHED:         'camera:switched',
  CAMERA_GLITCH:           'camera:glitch',

  // ── AI ────────────────────────────────────────────────────
  AI_TICK:                 'ai:tick',
  AI_MOVED:                'ai:moved',
  AI_ATTACK:               'ai:attack',
  AI_RESET:                'ai:reset',
  AI_AGGRESSION_CHANGED:   'ai:aggression:changed',

  // ── Audio ─────────────────────────────────────────────────
  AUDIO_TENSION_CHANGED:   'audio:tension:changed',
  AUDIO_JUMPSCARE:         'audio:jumpscare',
  AUDIO_PHONE_CALL:        'audio:phone:call',

  // ── UI ────────────────────────────────────────────────────
  UI_MENU_OPEN:            'ui:menu:open',
  UI_MENU_CLOSE:           'ui:menu:close',
  UI_SCREEN_TRANSITION:    'ui:screen:transition',
  UI_NOTIFICATION:         'ui:notification',

  // ── Settings ──────────────────────────────────────────────
  SETTINGS_CHANGED:        'settings:changed',
  QUALITY_CHANGED:         'quality:changed',

  // ── Horror / atmosphere ───────────────────────────────────
  HALLUCINATION_START:     'horror:hallucination:start',
  HALLUCINATION_END:       'horror:hallucination:end',
  AMBIENT_EVENT:           'horror:ambient:event',
  JUMPSCARE:               'horror:jumpscare',
  LIGHT_FLICKER:           'horror:light:flicker',
  SCREEN_GLITCH:           'horror:screen:glitch',

  // ── Debug ─────────────────────────────────────────────────
  DEBUG_TOGGLED:           'debug:toggled',
  PERF_REPORT:             'debug:perf:report',
});

/**
 * @typedef {Object} Listener
 * @property {Function} callback
 * @property {number}   priority - Higher = called first
 * @property {boolean}  once
 */

class EventSystemClass {
  constructor() {
    /** @type {Map<string, Listener[]>} */
    this._listeners = new Map();

    /** Emit history for late subscribers (shallow ring buffer, max 32) */
    this._history   = [];
    this._maxHistory = 32;
  }

  /**
   * Subscribe to an event.
   * @param {string}   event
   * @param {Function} callback
   * @param {number}   [priority=0]
   * @returns {Function} unsubscribe
   */
  on(event, callback, priority = 0) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    const list = this._listeners.get(event);
    list.push({ callback, priority, once: false });
    list.sort((a, b) => b.priority - a.priority);
    return () => this.off(event, callback);
  }

  /**
   * Subscribe once — auto-removed after first emission.
   * @param {string}   event
   * @param {Function} callback
   * @param {number}   [priority=0]
   */
  once(event, callback, priority = 0) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    const list = this._listeners.get(event);
    list.push({ callback, priority, once: true });
    list.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Unsubscribe a specific callback.
   * @param {string}   event
   * @param {Function} callback
   */
  off(event, callback) {
    const list = this._listeners.get(event);
    if (!list) return;
    const idx = list.findIndex(l => l.callback === callback);
    if (idx !== -1) list.splice(idx, 1);
  }

  /**
   * Emit an event synchronously.
   * @param {string} event
   * @param {*}      [data]
   */
  emit(event, data) {
    // Record in history ring buffer
    this._history.push({ event, data, ts: performance.now() });
    if (this._history.length > this._maxHistory) this._history.shift();

    const list = this._listeners.get(event);
    if (!list || list.length === 0) return;

    // Snapshot to allow safe mutation during iteration
    const snapshot = list.slice();
    for (const listener of snapshot) {
      try {
        listener.callback(data);
      } catch (err) {
        console.error(`[EventSystem] Error in "${event}" handler:`, err);
      }
      if (listener.once) this.off(event, listener.callback);
    }
  }

  /**
   * Remove all listeners for an event (or all events if omitted).
   * @param {string} [event]
   */
  clear(event) {
    if (event) this._listeners.delete(event);
    else        this._listeners.clear();
  }

  /**
   * Return recent event history (useful for debugging).
   * @returns {Array}
   */
  getHistory() {
    return [...this._history];
  }
}

// Singleton export — shared across all modules
export const EventSystem = new EventSystemClass();
