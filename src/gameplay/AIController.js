/**
 * @fileoverview Central AI orchestrator.
 * Manages all animatronic instances, the global AI tick timer,
 * night-specific aggression levels, and hallucination events.
 *
 * Night aggression table (per-animatronic AI levels 0–20):
 *   Night 1:  Bonnie=0, Chica=0, Foxy=0, Freddy=0  (tutorial — almost safe)
 *   Night 2:  Bonnie=3, Chica=1, Foxy=1, Freddy=0
 *   Night 3:  Bonnie=5, Chica=3, Foxy=2, Freddy=1
 *   Night 4:  Bonnie=7, Chica=5, Foxy=4, Freddy=2  (ramps hard)
 *   Night 5:  Bonnie=10,Chica=8, Foxy=6, Freddy=4
 *   Night 6:  Bonnie=15,Chica=12,Foxy=10,Freddy=8  (nightmare)
 *   Night 7:  Custom (configurable)
 */

import { GameConfig }           from '../config/GameConfig.js';
import { EventSystem, Events }  from '../core/EventSystem.js';

import { Freddy } from './animatronics/Freddy.js';
import { Bonnie } from './animatronics/Bonnie.js';
import { Chica  } from './animatronics/Chica.js';
import { Foxy   } from './animatronics/Foxy.js';

/** Night aggression configuration */
const NIGHT_AI_LEVELS = [
  null,                                           // index 0 unused
  { freddy: 0,  bonnie: 0,  chica: 0,  foxy: 0  },  // Night 1
  { freddy: 0,  bonnie: 3,  chica: 1,  foxy: 1  },  // Night 2
  { freddy: 1,  bonnie: 5,  chica: 3,  foxy: 2  },  // Night 3
  { freddy: 2,  bonnie: 7,  chica: 5,  foxy: 4  },  // Night 4
  { freddy: 4,  bonnie: 10, chica: 8,  foxy: 6  },  // Night 5
  { freddy: 8,  bonnie: 15, chica: 12, foxy: 10 },  // Night 6
  { freddy: 10, bonnie: 20, chica: 20, foxy: 20 },  // Night 7 (max)
];

class AIControllerClass {
  constructor() {
    this.freddy = new Freddy();
    this.bonnie = new Bonnie();
    this.chica  = new Chica();
    this.foxy   = new Foxy();

    this._animatronics = [this.freddy, this.bonnie, this.chica, this.foxy];

    this._tickInterval   = GameConfig.AI.TICK_INTERVAL_MS / 1000;  // seconds
    this._tickAccumulator = 0;
    this._nightMultiplier = 1;
    this._nightIndex      = 1;

    // Hallucination timer
    this._hallucinationCooldown = 0;
  }

  init() {
    // Wire Foxy's sprint update into the global update loop
    EventSystem.on(Events.NIGHT_START, ({ night }) => {
      this.configureForNight(night);
    });
  }

  /**
   * Configure AI for the given night.
   * @param {number} night
   */
  configureForNight(night) {
    this._nightIndex = night;
    this._nightMultiplier = 1 + (night - 1) * 0.15;

    const levels = NIGHT_AI_LEVELS[Math.min(night, 7)] ?? NIGHT_AI_LEVELS[7];

    this.freddy.aiLevel = levels.freddy;
    this.bonnie.aiLevel = levels.bonnie;
    this.chica.aiLevel  = levels.chica;
    this.foxy.aiLevel   = levels.foxy;

    for (const a of this._animatronics) a.reset();

    EventSystem.emit(Events.AI_AGGRESSION_CHANGED, { night, levels });
  }

  /**
   * @param {number} delta
   * @param {number} elapsed
   */
  update(delta, elapsed) {
    // Foxy sprint is frame-rate sensitive
    this.foxy.update(delta);

    // Global AI tick
    this._tickAccumulator += delta;
    if (this._tickAccumulator >= this._tickInterval) {
      this._tickAccumulator -= this._tickInterval;
      this._runAITick();
    }

    // Hallucination events
    this._hallucinationCooldown = Math.max(0, this._hallucinationCooldown - delta);
    this._maybeHallucinate(elapsed);
  }

  // ── Private ───────────────────────────────────────────────

  _runAITick() {
    EventSystem.emit(Events.AI_TICK, { night: this._nightIndex });

    for (const animatronic of this._animatronics) {
      animatronic.onTick(this._nightMultiplier);
    }

    // Escalate global threat level for audio
    const maxThreat = Math.max(...this._animatronics.map(a => {
      return this._threatForLocation(a.location);
    }));
    EventSystem.emit(Events.AUDIO_TENSION_CHANGED, { tension: maxThreat });
  }

  _threatForLocation(location) {
    const levels = {
      stage:        0.05,
      backstage:    0.10,
      dining:       0.20,
      kitchen:      0.30,
      pirate_cove:  0.15,
      hallway_west: 0.45,
      hallway_east: 0.45,
      corner_west:  0.70,
      corner_east:  0.70,
      office:       0.95,
      attack:       1.00,
    };
    return levels[location] ?? 0;
  }

  _maybeHallucinate(elapsed) {
    if (this._hallucinationCooldown > 0) return;
    if (this._nightIndex < 3) return;  // hallucinations begin on night 3
    if (Math.random() < GameConfig.HALLUCINATION_CHANCE) {
      this._hallucinationCooldown = 30;  // 30-second cooldown
      EventSystem.emit(Events.HALLUCINATION_START, {
        type: this._randomHallucinationType(),
      });
      setTimeout(() => {
        EventSystem.emit(Events.HALLUCINATION_END);
      }, 800 + Math.random() * 1200);
    }
  }

  _randomHallucinationType() {
    const types = ['shadow', 'face', 'text', 'silhouette', 'eye'];
    return types[Math.floor(Math.random() * types.length)];
  }

  /** @returns {AnimatronicBase[]} */
  getAll() { return this._animatronics; }
}

export const AIController = new AIControllerClass();
