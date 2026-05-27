import type { CameraFeedId } from '@/game/constants';
import { AnimatronicBase } from './AnimatronicBase';
import type { AIHandlers, AnimatronicId, LocationId } from './types';

const FREDDY_PATH: LocationId[] = ['stage', 'dining', 'hallway_east', 'corner_east', 'office'];
const BONNIE_PATH: LocationId[] = ['stage', 'backstage', 'dining', 'hallway_west', 'corner_west', 'office'];
const CHICA_PATH: LocationId[] = ['stage', 'dining', 'kitchen', 'hallway_east', 'corner_east', 'office'];

export class Freddy extends AnimatronicBase {
  private camsDown = 0;
  private beingWatched = false;
  private jinglePlayed = false;

  constructor(h: AIHandlers) {
    super('freddy', 'Freddy', 'stage', FREDDY_PATH, h);
  }

  setWatching(feedId: CameraFeedId | null, cameraOpen: boolean) {
    this.beingWatched =
      cameraOpen && !!feedId && ['cam1a', 'cam1b', 'cam4a', 'cam4b'].includes(feedId);
  }

  onTick(nightMultiplier: number) {
    if (this.attacking || this.aiLevel === 0) return;
    const snap = this.handlers.getSnapshot();
    if (!snap.cameraOpen) this.camsDown++;
    else this.camsDown = Math.max(0, this.camsDown - 1);

    const neglected = !snap.cameraOpen || this.camsDown >= 2;
    if (neglected && !this.beingWatched) {
      const chance = (this.aiLevel * nightMultiplier * 1.2) / 20;
      if (Math.random() < chance) this.attemptMove();
    }

    if (this.location === 'corner_east' && !this.jinglePlayed) {
      this.jinglePlayed = true;
      this.handlers.onTension(0.9);
    }
  }

  protected isDoorBlocking() {
    return this.handlers.getSnapshot().doorRight;
  }

  protected getRetreatNode(): LocationId {
    return 'corner_east';
  }

  reset() {
    super.reset();
    this.camsDown = 0;
    this.jinglePlayed = false;
    this.beingWatched = false;
  }
}

export class Bonnie extends AnimatronicBase {
  private fakeOut = false;
  private fakeOutTicks = 0;

  constructor(h: AIHandlers) {
    super('bonnie', 'Bonnie', 'stage', BONNIE_PATH, h);
  }

  onTick(nightMultiplier: number) {
    if (this.attacking || this.aiLevel === 0) return;
    if (this.fakeOut) {
      this.fakeOutTicks--;
      if (this.fakeOutTicks <= 0) {
        this.fakeOut = false;
        if (this.handlers.getSnapshot().doorLeft) this.retreat();
      }
      return;
    }

    const chance = (this.aiLevel * nightMultiplier * 1.3) / 20;
    if (Math.random() < chance) {
      if (this.location === 'corner_west' && Math.random() < 0.25) {
        this.fakeOut = true;
        this.fakeOutTicks = 1 + Math.floor(Math.random() * 2);
        this.handlers.onMove(this.id, 'corner_west');
      } else {
        this.attemptMove();
      }
    }
  }

  private retreat() {
    this.location = 'corner_west';
    this.pathIndex = this.path.indexOf('corner_west');
    this.handlers.onMove(this.id, 'corner_west');
  }

  protected isDoorBlocking() {
    return this.handlers.getSnapshot().doorLeft;
  }

  protected getRetreatNode(): LocationId {
    return 'corner_west';
  }

  reset() {
    super.reset();
    this.fakeOut = false;
    this.fakeOutTicks = 0;
  }
}

export class Chica extends AnimatronicBase {
  private kitchenLinger = 0;

  constructor(h: AIHandlers) {
    super('chica', 'Chica', 'stage', CHICA_PATH, h);
  }

  onTick(nightMultiplier: number) {
    if (this.attacking || this.aiLevel === 0) return;
    if (this.location === 'kitchen') {
      this.kitchenLinger++;
      if (this.kitchenLinger < 3) return;
      this.kitchenLinger = 0;
    }

    const chance = (this.aiLevel * nightMultiplier) / 20;
    if (Math.random() < chance) {
      this.attemptMove();
      if (Math.random() < 0.15) this.attemptMove();
    }
  }

  protected isDoorBlocking() {
    return this.handlers.getSnapshot().doorRight;
  }

  protected getRetreatNode(): LocationId {
    return 'corner_east';
  }

  reset() {
    super.reset();
    this.kitchenLinger = 0;
  }
}

export class Foxy extends AnimatronicBase {
  coveStage = 0;
  sprinting = false;
  private sprintTimer = 0;
  private ticksUnwatched = 0;
  private watching = false;
  private stageThreshold = [2, 3, 2];

  constructor(h: AIHandlers) {
    super('foxy', 'Foxy', 'pirate_cove', ['pirate_cove', 'hallway_west', 'office'], h);
  }

  setWatching(feedId: CameraFeedId | null, cameraOpen: boolean) {
    this.watching = cameraOpen && feedId === 'cam1c';
    if (this.watching && this.coveStage > 0) {
      this.coveStage = Math.max(0, this.coveStage - 1);
      this.ticksUnwatched = 0;
    }
  }

  onTick(nightMultiplier: number) {
    if (this.attacking || this.aiLevel === 0 || this.sprinting) return;
    if (this.watching) return;

    this.ticksUnwatched++;
    const threshold = this.stageThreshold[this.coveStage] ?? 99;
    if (this.ticksUnwatched >= threshold) {
      this.ticksUnwatched = 0;
      this.advanceCove(nightMultiplier);
    }
  }

  update(delta: number) {
    if (!this.sprinting) return;
    this.sprintTimer -= delta;
    if (this.sprintTimer <= 0) this.arriveAtOffice();
  }

  private advanceCove(nightMultiplier: number) {
    const chance = (this.aiLevel * nightMultiplier) / 20;
    if (Math.random() > chance) return;

    if (this.coveStage < 3) {
      this.coveStage++;
      this.handlers.onMove(this.id, 'pirate_cove');
    } else {
      this.beginSprint();
    }
  }

  private beginSprint() {
    this.sprinting = true;
    this.sprintTimer = 2;
    this.location = 'hallway_west';
    this.handlers.onMove(this.id, 'hallway_west');
    this.handlers.onTension(1);
  }

  private arriveAtOffice() {
    this.sprinting = false;
    this.location = 'office';
    const snap = this.handlers.getSnapshot();
    if (!snap.doorLeft) {
      this.executeJumpscare();
    } else {
      this.handlers.onFoxyPowerDrain(8);
      this.location = 'pirate_cove';
      this.pathIndex = 0;
      this.coveStage = 0;
      this.handlers.onMove(this.id, 'pirate_cove');
    }
  }

  protected isDoorBlocking() {
    return this.handlers.getSnapshot().doorLeft;
  }

  reset() {
    super.reset();
    this.coveStage = 0;
    this.sprinting = false;
    this.sprintTimer = 0;
    this.ticksUnwatched = 0;
    this.watching = false;
  }
}

export type AnimatronicInstance = AnimatronicBase | Freddy | Bonnie | Chica | Foxy;

export function createAnimatronics(h: AIHandlers) {
  return {
    freddy: new Freddy(h),
    bonnie: new Bonnie(h),
    chica: new Chica(h),
    foxy: new Foxy(h),
  };
}

export function animatronicList(
  roster: ReturnType<typeof createAnimatronics>
): AnimatronicBase[] {
  return [roster.freddy, roster.bonnie, roster.chica, roster.foxy];
}

export function sideForAnimatronic(id: AnimatronicId): 'left' | 'right' {
  return id === 'bonnie' || id === 'foxy' ? 'left' : 'right';
}
