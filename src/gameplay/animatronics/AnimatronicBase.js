/**
 * @fileoverview Abstract base class for all animatronic AI characters.
 * Subclasses override behavioral hooks while the base handles the
 * movement graph, AI tick, and jumpscare execution.
 *
 * Movement graph (shared topology):
 *   Stage → Dining → [Hallway] → [DoorCorner] → Office → JUMPSCARE
 *
 * Each animatronic has a unique path through this graph.
 */

import { EventSystem, Events } from '../../core/EventSystem.js';
import { PowerSystem }         from '../PowerSystem.js';

/**
 * @typedef {Object} Location
 * @property {string} id
 * @property {string} label
 * @property {string[]} next  - IDs this location can advance to
 */

/** Canonical location graph */
export const LOCATION_GRAPH = Object.freeze({
  stage:         { id: 'stage',         label: 'Show Stage',        next: ['dining', 'backstage'] },
  dining:        { id: 'dining',        label: 'Dining Area',       next: ['hallway_west', 'hallway_east', 'kitchen'] },
  backstage:     { id: 'backstage',     label: 'Backstage',         next: ['dining'] },
  kitchen:       { id: 'kitchen',       label: 'Kitchen',           next: ['dining', 'hallway_east'] },
  pirate_cove:   { id: 'pirate_cove',   label: 'Pirate Cove',       next: ['hallway_west'] },
  hallway_west:  { id: 'hallway_west',  label: 'West Hall',         next: ['corner_west', 'dining'] },
  hallway_east:  { id: 'hallway_east',  label: 'East Hall',         next: ['corner_east', 'dining'] },
  corner_west:   { id: 'corner_west',   label: 'West Hall Corner',  next: ['office', 'hallway_west'] },
  corner_east:   { id: 'corner_east',   label: 'East Hall Corner',  next: ['office', 'hallway_east'] },
  office:        { id: 'office',        label: 'Security Office',   next: ['attack'] },
  attack:        { id: 'attack',        label: '—',                 next: [] },
});

export class AnimatronicBase {
  /**
   * @param {string} id          - Unique ID e.g. 'freddy'
   * @param {string} displayName
   * @param {string} startNode   - Location ID where this animatronic begins
   * @param {string[]} path      - Ordered preferred movement path
   */
  constructor(id, displayName, startNode, path) {
    this.id          = id;
    this.displayName = displayName;

    /** 0–20 AI aggression level */
    this.aiLevel     = 0;

    /** Current location node */
    this.location    = startNode;

    /** Preferred movement path */
    this._path       = path;
    this._pathIndex  = 0;

    /** Ticks since last successful move */
    this._stalledTicks = 0;
    this._maxStall     = 5;

    /** Whether currently in jumpscare sequence */
    this._attacking = false;

    /** Cumulative stalk audio intensity 0–1 */
    this.threatLevel = 0;
  }

  /**
   * Called once per AI tick. Override to add unique behavioral logic.
   * @param {number} nightMultiplier
   */
  onTick(nightMultiplier) {
    if (this._attacking) return;
    if (this.aiLevel === 0) return;

    // Probability of moving this tick
    const chance = (this.aiLevel * nightMultiplier) / 20;
    if (Math.random() < chance) {
      this._attemptMove();
    }
  }

  /**
   * Attempt to move to the next location in this animatronic's path.
   * @protected
   */
  _attemptMove() {
    const nextNodeId = this._getNextNode();
    if (!nextNodeId) return;

    const prevLocation = this.location;
    this.location      = nextNodeId;
    this._pathIndex    = this._path.indexOf(nextNodeId);
    this._stalledTicks = 0;

    EventSystem.emit(Events.AI_MOVED, {
      animatronic: this.id,
      from:        prevLocation,
      location:    nextNodeId,
    });

    // If animatronic reaches office door without it being closed → attack
    if (nextNodeId === 'office') {
      this._evaluateOfficeEntry();
    }
  }

  /**
   * Get the next preferred node.
   * Subclasses can override for unique routing.
   * @returns {string|null}
   * @protected
   */
  _getNextNode() {
    const nextIndex = this._pathIndex + 1;
    if (nextIndex >= this._path.length) return null;
    return this._path[nextIndex];
  }

  /**
   * Check if the relevant door is closed.
   * If not, execute jumpscare.
   * @protected
   */
  _evaluateOfficeEntry() {
    const doorBlocked = this._isDoorBlocking();
    if (!doorBlocked) {
      this._executeJumpscare();
    } else {
      // Blocked — back off to hallway
      this._retreat();
      EventSystem.emit(Events.AI_MOVED, {
        animatronic: this.id,
        from:        'office',
        location:    this._getRetreatNode(),
        blocked:     true,
      });
    }
  }

  /**
   * Override per character to check the correct door.
   * @returns {boolean}
   * @protected
   */
  _isDoorBlocking() { return false; }

  /** @protected */
  _getRetreatNode() { return 'hallway_west'; }

  _retreat() {
    const retreatNode = this._getRetreatNode();
    this.location  = retreatNode;
    this._pathIndex = this._path.indexOf(retreatNode);
    this._stalledTicks = 0;
  }

  _executeJumpscare() {
    if (this._attacking) return;
    this._attacking = true;
    this.location   = 'attack';

    EventSystem.emit(Events.JUMPSCARE, { animatronic: this.id, source: 'ai' });
    EventSystem.emit(Events.AI_ATTACK, { animatronic: this.id });
    EventSystem.emit(Events.NIGHT_END_FAIL);
  }

  reset() {
    this.location      = this._path[0] ?? 'stage';
    this._pathIndex    = 0;
    this.aiLevel       = 0;
    this._attacking    = false;
    this.threatLevel   = 0;
    this._stalledTicks = 0;
    EventSystem.emit(Events.AI_RESET, { animatronic: this.id });
  }

  /** Visual silhouette mesh (optional — populated by SceneManager integration) */
  get mesh() { return this._mesh ?? null; }
  set mesh(m) { this._mesh = m; }
}
