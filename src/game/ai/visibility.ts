import type { AnimatronicId, AnimatronicState } from './types';
import { animatronicAtCamera, isAtDoorSide } from './AIController';

export function threatVisibleAtSide(
  animatronics: Record<AnimatronicId, AnimatronicState>,
  side: 'left' | 'right'
): AnimatronicId | null {
  for (const id of ['bonnie', 'foxy', 'chica', 'freddy'] as AnimatronicId[]) {
    if (isAtDoorSide(id, animatronics[id].location, side)) return id;
  }
  return null;
}

export function cameraHasThreat(
  animatronics: Record<AnimatronicId, AnimatronicState>,
  feedId: string
): AnimatronicId[] {
  return animatronicAtCamera(animatronics, feedId);
}
