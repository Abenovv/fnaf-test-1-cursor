import { useTranslation } from 'react-i18next';
import { useHubStore } from '@/hub/hubStore';
import { playSound } from '@/audio/soundManager';

/** All 7 nights unlocked */
export function FnafNightSelect() {
  const { t } = useTranslation();
  const setScreen = useHubStore((s) => s.setScreen);
  const setFnafNight = useHubStore((s) => s.setFnafNight);
  const launchGame = useHubStore((s) => s.launchGame);
  const beaten = useHubStore((s) => s.fnafBeaten);

  return (
    <div className="hub-bg flex min-h-screen flex-col items-center justify-center px-4">
      <div className="hub-panel w-[min(400px,94vw)] p-8">
        <h2 className="font-display text-2xl text-red-500">{t('games.fnaf.title')}</h2>
        <p className="mt-1 text-xs text-zinc-500">{t('hub.allNightsUnlocked')}</p>
        <div className="mt-6 flex flex-col gap-2">
          {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className="hub-card flex items-center justify-between px-4 py-3"
              style={{ '--accent': '#8b0000' } as React.CSSProperties}
              onClick={() => {
                playSound('ui_click');
                setFnafNight(n);
                launchGame('fnaf', 1);
              }}
            >
              <span className="font-mono text-sm text-red-400">
                {t('night.label', { n })}
              </span>
              {beaten.includes(n) && (
                <span className="text-[10px] text-zinc-500">{t('night.beaten')}</span>
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="hub-btn-secondary mt-6 w-full"
          onClick={() => {
            playSound('ui_back');
            setScreen('hub');
          }}
        >
          {t('back')}
        </button>
      </div>
    </div>
  );
}
