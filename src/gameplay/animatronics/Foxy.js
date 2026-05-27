/**
 * @fileoverview Foxy AI.
 *
 * Behavioral identity: PANIC ESCALATION / RUN ATTACK
 * - Lives entirely in Pirate Cove (camera 1C)
 * - Progresses through curtain stages when NOT being watched on cameras
 * - If the player ignores him, he SPRINTS down the west hallway and attacks
 * - Cannot be stopped by the door once he's running (momentary window to close it)
 * - Watching camera 1C frequently RESETS his stage counter
 * - Creates a panic-or-monitor dilemma
 *
 * Cove stages:
 *   0: Curtain closed (idle)
 *   1: Peek out (head visible)
 *   2: Partially out
 *   3: Ready to sprint
 *   4: SPRINT (running down west hallway)
 */

import { AnimatronicBase }     from './AnimatronicBase.js';
import { EventSystem, Events } from '../../core/EventSystem.js';
import { CameraSystem }        from '../../rendering/CameraSystem.js';
import { PowerSystem }         from '../PowerSystem.js';

export class Foxy extends AnimatronicBase {
  constructor() {
    super('foxy', 'Foxy', 'pirate_cove', ['pirate_cove', 'hallway_west', 'office']);

    this._coveStage      = 0;   // 0–3
    this._sprintActive   = false;
    this._sprintTimer    = 0;   // ms
    this._sprintDuration = 2000; // 2 seconds to reach the office

    /** Ticks since cove was last observed */
    this._ticksUnwatched = 0;
    this._stageThreshold = [2, 3, 2];  // ticks needed per stage transition

    this._watching = false;
    EventSystem.on(Events.CAMERA_SWITCHED, ({ feedId }) => {
      this._watching = feedId === 'cam1c';
      if (this._watching) this._onWatched();
    });
    EventSystem.on(Events.CAMERA_CLOSED, () => { this._watching = false; });
  }

  /** @override — Foxy uses entirely different logic */
  onTick(nightMultiplier) {
    if (this._attacking) return;
    if (this.aiLevel === 0) return;
    if (this._sprintActive) return;

    if (this._watching) return;

    this._ticksUnwatched++;

    const threshold = this._stageThreshold[this._coveStage] ?? 99;
    if (this._ticksUnwatched >= threshold) {
      this._ticksUnwatched = 0;
      this._advanceCoveStage(nightMultiplier);
    }
  }

  update(delta) {
    if (!this._sprintActive) return;
    this._sprintTimer -= delta * 1000;
    if (this._sprintTimer <= 0) {
      this._sprintActive = false;
      this._arriveAtOffice();
    }
  }

  _advanceCoveStage(nightMultiplier) {
    const chance = (this.aiLevel * nightMultiplier) / 20;
    if (Math.random() > chance) return;

    if (this._coveStage < 3) {
      this._coveStage++;
      EventSystem.emit(Events.AI_MOVED, {
        animatronic: this.id,
        location:    `pirate_cove_stage${this._coveStage}`,
      });
      // Emit tease audio
      EventSystem.emit('audio:play:sfx', {
        id:     `sfx_foxy_cove_${this._coveStage}`,
        volume: 0.3 + this._coveStage * 0.1,
      });
    } else {
      // Sprint!
      this._beginSprint();
    }
  }

  _beginSprint() {
    this._sprintActive = true;
    this._sprintTimer  = this._sprintDuration;
    this.location      = 'hallway_west';

    EventSystem.emit(Events.AI_MOVED, {
      animatronic: this.id,
      from:        'pirate_cove',
      location:    'hallway_west',
      sprint:      true,
    });
    // Loud sprint sound
    EventSystem.emit('audio:play:sfx', { id: 'sfx_foxy_sprint', volume: 1.0 });
    // Global tension spike
    EventSystem.emit(Events.AUDIO_TENSION_CHANGED, { tension: 1.0, trigger: 'foxy_sprint' });
  }

  _arriveAtOffice() {
    this.location = 'office';
    const doorBlocked = PowerSystem.isDoorLeftClosed;
    if (!doorBlocked) {
      this._executeJumpscare();
    } else {
      // Door closed — Foxy drains a chunk of power and retreats
      EventSystem.emit('power:foxy_drain', { drain: 8 });
      EventSystem.emit('audio:play:sfx', { id: 'sfx_foxy_bang', volume: 0.9 });
      this._retreat();
      this._coveStage    = 0;
      this._sprintActive = false;
    }
  }

  _onWatched() {
    // Gradually push back cove stage when observed
    if (this._coveStage > 0) {
      this._coveStage = Math.max(0, this._coveStage - 1);
      this._ticksUnwatched = 0;
    }
  }

  /** @override */
  _getRetreatNode() { return 'pirate_cove'; }

  reset() {
    super.reset();
    this._coveStage      = 0;
    this._sprintActive   = false;
    this._sprintTimer    = 0;
    this._ticksUnwatched = 0;
    this._watching       = false;
  }
}
