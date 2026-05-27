export type HubScreen = 'loading' | 'hub' | 'settings' | 'fnafSelect' | 'playing';

export type GameId = 'fnaf' | 'granny' | 'tanks' | 'minicraft';

export type PlayerMode = 1 | 2 | 3 | 4;

export interface GameMeta {
  id: GameId;
  titleKey: string;
  descKey: string;
  players: PlayerMode[];
  accent: string;
  icon: string;
  soloOnly?: boolean;
}

export const GAMES: GameMeta[] = [
  {
    id: 'fnaf',
    titleKey: 'games.fnaf.title',
    descKey: 'games.fnaf.desc',
    players: [1],
    accent: '#8b0000',
    icon: '🐻',
    soloOnly: true,
  },
  {
    id: 'granny',
    titleKey: 'games.granny.title',
    descKey: 'games.granny.desc',
    players: [1, 2],
    accent: '#4a6741',
    icon: '👵',
  },
  {
    id: 'tanks',
    titleKey: 'games.tanks.title',
    descKey: 'games.tanks.desc',
    players: [2, 3, 4],
    accent: '#c45c26',
    icon: '🔫',
  },
  {
    id: 'minicraft',
    titleKey: 'games.minicraft.title',
    descKey: 'games.minicraft.desc',
    players: [1, 2, 3, 4],
    accent: '#3d8b37',
    icon: '⛏️',
  },
];
