import { useHubStore } from '@/hub/hubStore';
import { FnafPixelGame } from '@/games/fnaf2d/FnafPixelGame';
import { GrannyPixelGame } from '@/games/granny/GrannyPixelGame';
import { TanksPixelGame } from '@/games/tanks/TanksPixelGame';
import { MinicraftPixelGame } from '@/games/minicraft/MinicraftPixelGame';
import { stopAmbience } from '@/audio/soundManager';

export function GameRouter() {
  const activeGame = useHubStore((s) => s.activeGame);
  const playerCount = useHubStore((s) => s.playerCount);
  const exitGame = useHubStore((s) => s.exitGame);

  const onExit = () => {
    stopAmbience();
    exitGame();
  };

  if (!activeGame) return null;

  switch (activeGame) {
    case 'fnaf':
      return <FnafPixelGame onExit={onExit} />;
    case 'granny':
      return <GrannyPixelGame players={playerCount <= 2 ? (playerCount as 1 | 2) : 2} onExit={onExit} />;
    case 'tanks':
      return (
        <TanksPixelGame
          players={(Math.min(4, Math.max(2, playerCount)) as 2 | 3 | 4)}
          onExit={onExit}
        />
      );
    case 'minicraft':
      return (
        <MinicraftPixelGame
          players={(Math.min(4, Math.max(1, playerCount)) as 1 | 2 | 3 | 4)}
          onExit={onExit}
        />
      );
    default:
      return null;
  }
}
