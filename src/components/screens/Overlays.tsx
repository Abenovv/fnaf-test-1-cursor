import { useTranslation } from 'react-i18next';
import { useGameStore } from '@/store/gameStore';
import { MenuButton, ScreenOverlay } from '../ui/primitives';

export function LoadingScreen({ progress }: { progress: number }) {
  const { t } = useTranslation();
  return (
    <ScreenOverlay>
      <div className="select-none text-center">
        <h1 className="font-horror mb-4 text-5xl tracking-[0.2em] text-horror-red drop-shadow-[0_0_20px_rgba(139,0,0,0.5)]">
          {t('app.title')}
        </h1>
        <p className="font-body mb-8 text-[0.7rem] tracking-[0.15em] text-[#444]">
          {progress >= 1 ? t('loading.ready') : t('loading')}
        </p>
        <div className="mx-auto h-0.5 w-80 bg-[#111]">
          <div
            className="h-full bg-horror-red shadow-[0_0_8px_#8b0000] transition-all duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    </ScreenOverlay>
  );
}

export function DeathScreen() {
  const { t } = useTranslation();
  const resetShift = useGameStore((s) => s.resetShift);
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <ScreenOverlay>
      <div className="select-none text-center">
        <h1 className="font-horror text-5xl tracking-widest text-horror-red drop-shadow-[0_0_30px_#8b0000]">
          {t('death.title')}
        </h1>
        <p className="font-body mt-2 text-[0.65rem] tracking-wider text-[#333]">{t('death.sub')}</p>
        <div className="mt-10 flex justify-center gap-4">
          <MenuButton primary onClick={resetShift}>
            {t('death.retry')}
          </MenuButton>
          <MenuButton onClick={() => setScreen('menu')}>{t('back')}</MenuButton>
        </div>
      </div>
    </ScreenOverlay>
  );
}

export function SurviveScreen() {
  const { t } = useTranslation();
  const setScreen = useGameStore((s) => s.setScreen);
  const startNight = useGameStore((s) => s.startNight);
  const currentNight = useGameStore((s) => s.currentNight);

  return (
    <ScreenOverlay>
      <div className="select-none text-center">
        <h1 className="font-horror text-6xl tracking-[0.3em] text-[#667755] drop-shadow-[0_0_16px_rgba(102,119,85,0.3)]">
          {t('survive.title')}
        </h1>
        <p className="font-body mt-2 text-[0.6rem] tracking-wider text-[#444]">{t('survive.sub')}</p>
        <div className="mt-10 flex justify-center gap-4">
          <MenuButton primary onClick={() => startNight(currentNight)}>
            {t('survive.next')}
          </MenuButton>
          <MenuButton onClick={() => setScreen('menu')}>{t('back')}</MenuButton>
        </div>
      </div>
    </ScreenOverlay>
  );
}
