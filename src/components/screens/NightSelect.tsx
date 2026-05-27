import { useTranslation } from 'react-i18next';
import { useGameStore, isNightUnlocked } from '@/store/gameStore';
import { ScreenOverlay } from '../ui/primitives';

export function NightSelect() {
  const { t } = useTranslation();
  const setScreen = useGameStore((s) => s.setScreen);
  const startNight = useGameStore((s) => s.startNight);
  const highestNight = useGameStore((s) => s.highestNight);
  const nightsBeaten = useGameStore((s) => s.nightsBeaten);

  return (
    <ScreenOverlay>
      <div className="select-none text-center">
        <h2 className="font-horror mb-8 text-3xl tracking-widest text-horror-red">{t('night.select')}</h2>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => {
            const locked = !isNightUnlocked(n, highestNight);
            const beaten = nightsBeaten.includes(n);
            return (
              <button
                key={n}
                type="button"
                disabled={locked}
                onClick={() => startNight(n)}
                className="font-body min-w-[260px] border border-[#1a0000] px-6 py-2 text-left text-xs tracking-wider text-horror-red transition hover:border-horror-red disabled:cursor-not-allowed disabled:opacity-30"
              >
                {t('night.label', { n })}
                {beaten ? ` — ${t('night.beaten')}` : locked ? ` — ${t('night.locked')}` : ''}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setScreen('menu')}
          className="font-body mt-8 text-[0.65rem] tracking-wider text-[#444] hover:text-[#888]"
        >
          {t('back')}
        </button>
      </div>
    </ScreenOverlay>
  );
}
