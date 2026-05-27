/**
 * @fileoverview Power management system.
 * Tracks usage from all power-consuming actions and drains the power supply.
 * Emits events for UI and horror-system listeners to react to.
 */

import { GameConfig }           from '../config/GameConfig.js';
import { EventSystem, Events }  from '../core/EventSystem.js';

/** Power usage flags — bitmask approach for clean state checking */
export const PowerUsage = Object.freeze({
  NONE:    0,
  CAMERA:  1 << 0,
  DOOR_L:  1 << 1,
  DOOR_R:  1 << 2,
  LIGHT_L: 1 << 3,
  LIGHT_R: 1 << 4,
  FAN:     1 << 5,
});

class PowerSystemClass {
  constructor() {
    this._power    = GameConfig.POWER_START;
    this._usage    = PowerUsage.NONE;
    this._depleted = false;

    // Door state
    this._doorLeft  = false;
    this._doorRight = false;

    // Light state (hallway peek lights)
    this._lightLeft  = false;
    this._lightRight = false;

    // Camera open state
    this._cameraOpen = false;
  }

  init() {
    EventSystem.on(Events.CAMERA_OPENED,       () => { this._cameraOpen = true;  this._rebuildUsage(); });
    EventSystem.on(Events.CAMERA_CLOSED,       () => { this._cameraOpen = false; this._rebuildUsage(); });
    EventSystem.on(Events.DOOR_LEFT_TOGGLED,   () => { this._doorLeft  = !this._doorLeft;  this._rebuildUsage(); });
    EventSystem.on(Events.DOOR_RIGHT_TOGGLED,  () => { this._doorRight = !this._doorRight; this._rebuildUsage(); });
    EventSystem.on(Events.LIGHT_LEFT_TOGGLED,  () => { this._lightLeft  = !this._lightLeft;  this._rebuildUsage(); });
    EventSystem.on(Events.LIGHT_RIGHT_TOGGLED, () => { this._lightRight = !this._lightRight; this._rebuildUsage(); });
  }

  reset() {
    this._power    = GameConfig.POWER_START;
    this._usage    = PowerUsage.NONE;
    this._depleted = false;
    this._doorLeft = this._doorRight = false;
    this._lightLeft = this._lightRight = false;
    this._cameraOpen = false;
    EventSystem.emit(Events.POWER_CHANGED, { power: this._power, usage: this._usage });
  }

  /**
   * @param {number} delta  seconds since last frame
   */
  update(delta) {
    if (this._depleted) return;

    const drain = this._calculateDrain();
    this._power = Math.max(0, this._power - drain * delta);

    EventSystem.emit(Events.POWER_CHANGED, {
      power:   this._power,
      usage:   this._usage,
      percent: this._power / GameConfig.POWER_START,
    });

    if (this._power <= 0 && !this._depleted) {
      this._depleted = true;
      EventSystem.emit(Events.POWER_DEPLETED);
    }
  }

  /** @returns {number} 0–100 */
  get power() { return this._power; }

  /** @returns {boolean} */
  get isDoorLeftClosed()  { return this._doorLeft; }
  get isDoorRightClosed() { return this._doorRight; }
  get isLightLeftOn()     { return this._lightLeft; }
  get isLightRightOn()    { return this._lightRight; }
  get isDepleted()        { return this._depleted; }

  /** Bars: 1–5 representing power display segments */
  get usageBars() {
    const drain = this._calculateDrain();
    // Map drain rate to 1–5 bars
    if (drain < 0.5)  return 1;
    if (drain < 1.0)  return 2;
    if (drain < 2.0)  return 3;
    if (drain < 3.0)  return 4;
    return 5;
  }

  // ── Private ───────────────────────────────────────────────

  _calculateDrain() {
    let rate = GameConfig.POWER_DRAIN_BASE;
    if (this._cameraOpen)  rate += GameConfig.POWER_DRAIN_CAMERA;
    if (this._doorLeft)    rate += GameConfig.POWER_DRAIN_DOOR;
    if (this._doorRight)   rate += GameConfig.POWER_DRAIN_DOOR;
    if (this._lightLeft)   rate += GameConfig.POWER_DRAIN_LIGHT;
    if (this._lightRight)  rate += GameConfig.POWER_DRAIN_LIGHT;
    return rate;
  }

  _rebuildUsage() {
    let u = PowerUsage.NONE;
    if (this._cameraOpen)  u |= PowerUsage.CAMERA;
    if (this._doorLeft)    u |= PowerUsage.DOOR_L;
    if (this._doorRight)   u |= PowerUsage.DOOR_R;
    if (this._lightLeft)   u |= PowerUsage.LIGHT_L;
    if (this._lightRight)  u |= PowerUsage.LIGHT_R;
    this._usage = u;
  }
}

export const PowerSystem = new PowerSystemClass();
