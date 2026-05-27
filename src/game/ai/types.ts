import type { CameraFeedId } from '@/game/constants';

export type AnimatronicId = 'freddy' | 'bonnie' | 'chica' | 'foxy';

export type LocationId =
  | 'stage'
  | 'dining'
  | 'backstage'
  | 'kitchen'
  | 'pirate_cove'
  | 'hallway_west'
  | 'hallway_east'
  | 'corner_west'
  | 'corner_east'
  | 'office'
  | 'attack';

export interface AnimatronicState {
  location: LocationId;
  coveStage: number;
  sprinting: boolean;
}

export interface AISnapshot {
  night: number;
  doorLeft: boolean;
  doorRight: boolean;
  cameraOpen: boolean;
  activeCamera: CameraFeedId;
  powerOut: boolean;
}

export interface AIHandlers {
  getSnapshot: () => AISnapshot;
  onMove: (id: AnimatronicId, location: LocationId) => void;
  onJumpscare: (id: AnimatronicId) => void;
  onTension: (level: number) => void;
  onFoxyPowerDrain: (amount: number) => void;
}

/** Which camera feed shows a given location. */
export const LOCATION_TO_CAMERA: Partial<Record<LocationId, CameraFeedId>> = {
  stage: 'cam1a',
  dining: 'cam1b',
  pirate_cove: 'cam1c',
  hallway_west: 'cam2a',
  corner_west: 'cam2b',
  backstage: 'cam5',
  kitchen: 'cam6',
  hallway_east: 'cam4a',
  corner_east: 'cam4b',
};

export const THREAT_BY_LOCATION: Record<LocationId, number> = {
  stage: 0.05,
  backstage: 0.1,
  dining: 0.2,
  kitchen: 0.3,
  pirate_cove: 0.15,
  hallway_west: 0.45,
  hallway_east: 0.45,
  corner_west: 0.7,
  corner_east: 0.7,
  office: 0.95,
  attack: 1,
};
