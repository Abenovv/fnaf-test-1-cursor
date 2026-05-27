/**
 * @fileoverview Freddy Fazbear AI.
 *
 * Behavioral identity: DARKNESS PREDATOR
 * - Almost entirely inactive until cameras stop being watched
 * - Weaponizes prolonged camera neglect
 * - Moves only when CAMS are DOWN and the player is not watching him
 * - Moves silently through the right side
 * - Plays his jingle when he reaches the East Hall Corner (psychological pressure)
 * - Power-out fallback: guaranteed attack
 *
 * Threat escalation:
 *   Stage → Dining → East Hall → East Hall Corner → Office → JUMPSCARE
 */

import { AnimatronicBase }     from './AnimatronicBase.js';
import { EventSystem, Events } from '../../core/EventSystem.js';
import { CameraSystem }        from '../../rendering/CameraSystem.js';
import { PowerSystem }         from '../PowerSystem.js';

const FREDDY_PATH = [
  'stage', 'dining', 'hallway_east', 'corner_east', 'office',
];

export class Freddy extends AnimatronicBase {
  constructor() {
    super('freddy', 'Freddy Fazbear', 'stage', FREDDY_PATH);

    /** Freddy only moves when cams are down AND he's not being watched */
    this._camsWereDown     = 0;   // consecutive ticks cams were down
    this._camsDownThreshold = 2;

    /** Whether the player was watching his camera this tick */
    this._beingWatched = false;

    // Track camera state
    EventSystem.on(Events.CAMERA_SWITCHED, ({ feedId }) => {
      this._beingWatched = this._isOnCamera(feedId);
    });
    EventSystem.on(Events.CAMERA_CLOSED, () => {
      this._beingWatched = false;
    });

    // Corner jingle event
    this._jinglePlayed = false;
  }

  /**
   * @override
   * Freddy respects a stronger camera-watching constraint.
   */
  onTick(nightMultiplier) {
    if (this._attacking) return;
    if (this.aiLevel === 0) return;

    const camsOpen = CameraSystem.isCameraOpen;

    // Track how long cams have been down
    if (!camsOpen) {
      this._camsWereDown++;
    } else {
      this._camsWereDown = Math.max(0, this._camsWereDown - 1);
    }

    // Freddy only moves when:
    //  1. Cameras are not open, OR cams have been down for several consecutive ticks
    //  2. Player is not actively watching him
    const camsNeglected = !camsOpen || this._camsWereDown >= this._camsDownThreshold;
    const notWatched    = !this._beingWatched;

    if (camsNeglected && notWatched) {
      const chance = (this.aiLevel * nightMultiplier * 1.2) / 20;
      if (Math.random() < chance) {
        this._attemptMove();
      }
    }

    // Corner: play musical jingle as warning / psychological dread
    if (this.location === 'corner_east' && !this._jinglePlayed) {
      this._jinglePlayed = true;
      EventSystem.emit(Events.AUDIO_TENSION_CHANGED, {
        tension: 0.9, trigger: 'freddy_corner'
      });
      // Play jingle via AudioManager
      EventSystem.emit('audio:play:sfx', { id: 'sfx_freddy_jingle', volume: 0.6 });
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
    this._camsWereDown = 0;
    this._jinglePlayed = false;
    this._beingWatched = false;
  }

  _isOnCamera(feedId) {
    return ['cam1a', 'cam1b', 'cam4a', 'cam4b'].includes(feedId);
  }
}
