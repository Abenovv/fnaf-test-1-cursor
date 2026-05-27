/**
 * @fileoverview Bonnie AI.
 *
 * Behavioral identity: DIRECT PRESSURE / LEFT-SIDE AGGRESSOR
 * - Most active animatronic in early nights
 * - Moves quickly and directly
 * - Attacks from the left door
 * - Disappears from cameras when he's very close (psychological tactic)
 * - Fake-out: sometimes appears at the door but retreats if the light is on
 *
 * Path: Stage → Dining → West Hall → West Hall Corner → Office
 */

import { AnimatronicBase }     from './AnimatronicBase.js';
import { EventSystem, Events } from '../../core/EventSystem.js';
import { PowerSystem }         from '../PowerSystem.js';

const BONNIE_PATH = [
  'stage', 'backstage', 'dining', 'hallway_west', 'corner_west', 'office',
];

export class Bonnie extends AnimatronicBase {
  constructor() {
    super('bonnie', 'Bonnie', 'stage', BONNIE_PATH);

    /** Bonnie has a higher base movement frequency */
    this._aggressionBonus = 1.3;

    /** Fake-out state — at door but bluffing */
    this._fakeOutActive = false;
    this._fakeOutTimer  = 0;
  }

  /** @override */
  onTick(nightMultiplier) {
    if (this._attacking) return;
    if (this.aiLevel === 0) return;

    // Resolve active fake-out
    if (this._fakeOutActive) {
      this._fakeOutTimer--;
      if (this._fakeOutTimer <= 0) {
        this._fakeOutActive = false;
        // If light is on at door, retreat
        if (PowerSystem.isLightLeftOn) {
          this._retreat();
        }
      }
      return;
    }

    const chance = (this.aiLevel * nightMultiplier * this._aggressionBonus) / 20;
    if (Math.random() < chance) {
      // Small chance for fake-out when approaching corner
      if (this.location === 'corner_west' && Math.random() < 0.25) {
        this._triggerFakeOut();
      } else {
        this._attemptMove();
      }
    }
  }

  /** @override */
  _isDoorBlocking() {
    return PowerSystem.isDoorLeftClosed;
  }

  /** @override */
  _getRetreatNode() { return 'corner_west'; }

  _triggerFakeOut() {
    this._fakeOutActive = true;
    this._fakeOutTimer  = 1 + Math.floor(Math.random() * 2);  // 1–2 additional ticks
    EventSystem.emit(Events.AI_MOVED, {
      animatronic: this.id,
      from:        this.location,
      location:    'corner_west',
      fakeOut:     true,
    });
    EventSystem.emit('audio:play:sfx', { id: 'sfx_bonnie_stare', volume: 0.4 });
  }

  reset() {
    super.reset();
    this._fakeOutActive = false;
    this._fakeOutTimer  = 0;
  }
}
