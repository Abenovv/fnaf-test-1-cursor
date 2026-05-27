import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GAMES, type GameId, type PlayerMode } from '@/hub/types';
import { useHubStore } from '@/hub/hubStore';
import { playSound, resumeAudio } from '@/audio/soundManager';

export function HubMenu() {
  const { t } = useTranslation();
  const launchGame = useHubStore((s) => s.launchGame);
  const setScreen = useHubStore((s) => s.setScreen);
  const [picking, setPicking] = useState<GameId | null>(null);

  return (
    <div className="hub-bg min-h-screen overflow-auto px-4 py-8">
      <header className="mx-auto mb-10 max-w-5xl text-center">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.35em] text-violet-400/80">
          {t('hub.tagline')}
        </p>
        <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl">
          {t('hub.title')}
        </h1>
        <p className="mt-3 text-sm text-zinc-500">{t('hub.subtitle')}</p>
      </header>

      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
        {GAMES.map((game) => (
          <button
            key={game.id}
            type="button"
            className="hub-card group text-left"
            style={{ '--accent': game.accent } as React.CSSProperties}
            onMouseEnter={() => playSound('ui_hover')}
            onClick={() => {
              resumeAudio();
              playSound('ui_click');
              if (game.id === 'fnaf') {
                setScreen('fnafSelect');
                return;
              }
              if (game.players.length === 1) {
                launchGame(game.id, 1);
              } else {
                setPicking(game.id);
              }
            }}
          >
            <span className="text-3xl">{game.icon}</span>
            <h2 className="mt-3 font-display text-xl text-white group-hover:text-[var(--accent)]">
              {t(game.titleKey)}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">{t(game.descKey)}</p>
            <p className="mt-3 font-mono text-[10px] text-zinc-600">
              {game.soloOnly ? t('hub.solo') : `${game.players.join('–')} ${t('hub.playersLabel')}`}
            </p>
          </button>
        ))}
      </div>

      <div className="mx-auto mt-8 flex max-w-5xl justify-center gap-3">
        <button
          type="button"
          className="hub-btn-secondary"
          onClick={() => {
            playSound('ui_click');
            setScreen('settings');
          }}
        >
          {t('menu.settings')}
        </button>
      </div>

      {picking && (
        <PlayerPicker
          gameId={picking}
          onClose={() => setPicking(null)}
          onPick={(n) => {
            launchGame(picking, n);
            setPicking(null);
          }}
        />
      )}
    </div>
  );
}

function PlayerPicker({
  gameId,
  onClose,
  onPick,
}: {
  gameId: GameId;
  onClose: () => void;
  onPick: (n: PlayerMode) => void;
}) {
  const { t } = useTranslation();
  const meta = GAMES.find((g) => g.id === gameId)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="hub-panel w-[min(360px,92vw)] p-6">
        <h3 className="font-display text-lg text-white">{t(meta.titleKey)}</h3>
        <p className="mt-1 text-xs text-zinc-500">{t('hub.pickPlayers')}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {meta.players.map((n) => (
            <button
              key={n}
              type="button"
              className="hub-btn min-w-[70px] flex-1"
              onClick={() => {
                playSound('ui_click');
                onPick(n);
              }}
            >
              {n}P
            </button>
          ))}
        </div>
        <button type="button" className="hub-btn-secondary mt-4 w-full" onClick={onClose}>
          {t('back')}
        </button>
      </div>
    </div>
  );
}
