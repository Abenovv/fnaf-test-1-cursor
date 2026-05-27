import type { AIHandlers, AnimatronicId, LocationId } from './types';

export abstract class AnimatronicBase {
  readonly id: AnimatronicId;
  readonly displayName: string;
  aiLevel = 0;
  location: LocationId;
  protected path: LocationId[];
  protected pathIndex = 0;
  protected attacking = false;
  protected handlers: AIHandlers;

  constructor(
    id: AnimatronicId,
    displayName: string,
    start: LocationId,
    path: LocationId[],
    handlers: AIHandlers
  ) {
    this.id = id;
    this.displayName = displayName;
    this.location = start;
    this.path = path;
    this.pathIndex = 0;
    this.handlers = handlers;
  }

  onTick(nightMultiplier: number) {
    if (this.attacking || this.aiLevel === 0) return;
    const chance = (this.aiLevel * nightMultiplier) / 20;
    if (Math.random() < chance) this.attemptMove();
  }

  protected attemptMove() {
    const next = this.getNextNode();
    if (!next) return;
    const from = this.location;
    this.location = next;
    this.pathIndex = this.path.indexOf(next);
    this.handlers.onMove(this.id, next);
    if (next === 'office') this.evaluateOfficeEntry(from);
  }

  protected getNextNode(): LocationId | null {
    const idx = this.pathIndex + 1;
    return idx < this.path.length ? this.path[idx] : null;
  }

  protected evaluateOfficeEntry(_from: LocationId) {
    if (!this.isDoorBlocking()) {
      this.executeJumpscare();
    } else {
      const retreat = this.getRetreatNode();
      this.location = retreat;
      this.pathIndex = this.path.indexOf(retreat);
      this.handlers.onMove(this.id, retreat);
    }
  }

  protected abstract isDoorBlocking(): boolean;
  protected getRetreatNode(): LocationId {
    return 'hallway_west';
  }

  protected executeJumpscare() {
    if (this.attacking) return;
    this.attacking = true;
    this.location = 'attack';
    this.handlers.onJumpscare(this.id);
  }

  reset() {
    this.location = this.path[0] ?? 'stage';
    this.pathIndex = 0;
    this.attacking = false;
  }
}
