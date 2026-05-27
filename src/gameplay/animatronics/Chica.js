/**
 * @fileoverview Chica AI.
 *
 * Behavioral identity: DISORIENTING / RIGHT-SIDE CONFUSION
 * - Irregular movement timing — hard to predict
 * - Moves in erratic bursts and then goes quiet
 * - Uses the kitchen (audio-only) as a staging area creating tension via sound
 * - Attacks from the right door
 * - Fake-out: appears at door but backs into hallway randomly
 *
 * Path: Stage → Dining → Kitchen (staging) → East Hall → East Hall Corner → Office
 */

import { AnimatronicBase }     from './AnimatronicBase.js';
import { EventSystem, Events } from '../../core/EventSystem.js';
import { PowerSystem }         from '../PowerSystem.js';

const CHICA_PATH = [
  'stage', 'dining', 'kitchen', 'hallway_east', 'corner_east', 'office',
];

export class Chica extends AnimatronicBase {
  constructor() {
    super('chica', 'Chica', 'stage', CHICA_PATH);

    /** Chica lingers in the kitchen — audio-only presence creates tension */
    this._kitchenLinger     = 0;
    this._kitchenLingerMax  = 3;  // ticks spent in kitchen
    this._kitchenNoiseTimer = 0;

    /** Burst behavior: occasional double-move in one tick */
    this._burstChance = 0.15;
  }

  /** @override */
  onTick(nightMultiplier) {
    if (this._attacking) return;
    if (this.aiLevel === 0) return;

    // Linger in kitchen with audio-only presence
    if (this.location === 'kitchen') {
      this._kitchenLinger++;
      // Make noise even while stationary
      EventSystem.emit('audio:play:sfx', {
        id:     'sfx_chica_kitchen',
        volume: 0.2 + Math.random() * 0.3,
      });

      if (this._kitchenLinger < this._kitchenLingerMax) return;
      this._kitchenLinger = 0;
    }

    const chance = (this.aiLevel * nightMultiplier) / 20;
    if (Math.random() < chance) {
      this._attemptMove();
      // Burst: small chance to move twice in one tick
      if (Math.random() < this._burstChance) {
        this._attemptMove();
      }
    }
  }

  /** @override */
  _isDoorBlocking() {
    return PowerSystem.isDoorRightClosed;
  }

  /** @override */
  _getRetreatNode() { return 'corner_east'; }

  reset() {
    super.reset();
    this._kitchenLinger = 0;
  }
}
