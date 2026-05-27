import { GAME, NIGHT_AI } from '@/game/constants';
import { animatronicList, createAnimatronics } from './animatronics';
import type { AIHandlers, AnimatronicId, AnimatronicState, LocationId } from './types';
import { LOCATION_TO_CAMERA, THREAT_BY_LOCATION } from './types';

export const DEFAULT_ANIMATRONICS: Record<AnimatronicId, AnimatronicState> = {
  freddy: { location: 'stage', coveStage: 0, sprinting: false },
  bonnie: { location: 'stage', coveStage: 0, sprinting: false },
  chica: { location: 'stage', coveStage: 0, sprinting: false },
  foxy: { location: 'pirate_cove', coveStage: 0, sprinting: false },
};

/** Runs animatronic AI ticks for the active night. */
export class NightAIController {
  private roster = createAnimatronics(this.handlers);
  private tickAcc = 0;
  private nightMultiplier = 1;

  constructor(private handlers: AIHandlers) {}

  configureForNight(night: number) {
    this.nightMultiplier = 1 + (night - 1) * 0.15;
    const levels = NIGHT_AI[Math.min(7, Math.max(1, night))] ?? NIGHT_AI[7];
    this.roster.freddy.aiLevel = levels.freddy;
    this.roster.bonnie.aiLevel = levels.bonnie;
    this.roster.chica.aiLevel = levels.chica;
    this.roster.foxy.aiLevel = levels.foxy;
    animatronicList(this.roster).forEach((a) => a.reset());
  }

  update(delta: number) {
    const snap = this.handlers.getSnapshot();
    this.roster.freddy.setWatching(snap.activeCamera, snap.cameraOpen);
    this.roster.foxy.setWatching(snap.activeCamera, snap.cameraOpen);
    this.roster.foxy.update(delta);

    this.tickAcc += delta;
    if (this.tickAcc < GAME.AI_TICK_MS / 1000) return;
    this.tickAcc -= GAME.AI_TICK_MS / 1000;

    for (const a of animatronicList(this.roster)) {
      a.onTick(this.nightMultiplier);
    }

    const maxThreat = Math.max(
      ...animatronicList(this.roster).map((a) => THREAT_BY_LOCATION[a.location] ?? 0)
    );
    this.handlers.onTension(maxThreat);
  }

  getStates(): Record<AnimatronicId, AnimatronicState> {
    return {
      freddy: { location: this.roster.freddy.location, coveStage: 0, sprinting: false },
      bonnie: { location: this.roster.bonnie.location, coveStage: 0, sprinting: false },
      chica: { location: this.roster.chica.location, coveStage: 0, sprinting: false },
      foxy: {
        location: this.roster.foxy.location,
        coveStage: this.roster.foxy.coveStage,
        sprinting: this.roster.foxy.sprinting,
      },
    };
  }
}

export function isAtDoorSide(
  id: AnimatronicId,
  location: LocationId,
  side: 'left' | 'right'
): boolean {
  if (side === 'left') {
    return (
      (id === 'bonnie' || id === 'foxy') &&
      (location === 'corner_west' || location === 'office' || (id === 'foxy' && location === 'hallway_west'))
    );
  }
  return (id === 'chica' || id === 'freddy') && (location === 'corner_east' || location === 'office');
}

export function animatronicAtCamera(
  states: Record<AnimatronicId, AnimatronicState>,
  feedId: string
): AnimatronicId[] {
  return (Object.keys(states) as AnimatronicId[]).filter((id) => {
    const loc = states[id].location;
    if (id === 'foxy' && loc === 'pirate_cove' && states.foxy.coveStage > 0) {
      return feedId === 'cam1c';
    }
    return LOCATION_TO_CAMERA[loc] === feedId;
  });
}
