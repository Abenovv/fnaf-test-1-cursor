import { useTranslation } from 'react-i18next';
import { useGameStore } from '@/store/gameStore';
import { MenuButton, ScreenOverlay } from '../ui/primitives';

export function MainMenu() {
  const { t } = useTranslation();
  const setScreen = useGameStore((s) => s.setScreen);
  const startNight = useGameStore((s) => s.startNight);
  const currentNight = useGameStore((s) => s.currentNight);

  return (
    <ScreenOverlay opaque={false}>
      <div className="pointer-events-auto select-none text-center">
        <h1 className="font-horror mb-1 text-5xl tracking-[0.2em] text-horror-red drop-shadow-[0_0_24px_rgba(139,0,0,0.5)] md:text-6xl">
          {t('app.title')}
        </h1>
        <p className="font-body mb-10 text-[0.7rem] tracking-[0.15em] text-[#444]">{t('app.subtitle')}</p>
        <div className="flex flex-col items-center gap-3">
          <MenuButton
            primary
            onClick={() => startNight(currentNight)}
          >
            {t('menu.play')}
          </MenuButton>
          <MenuButton onClick={() => setScreen('nightSelect')}>{t('menu.nights')}</MenuButton>
          <MenuButton onClick={() => setScreen('settings')}>{t('menu.settings')}</MenuButton>
        </div>
        <p className="font-body mt-12 max-w-md text-[0.55rem] tracking-wider text-[#222]">
          {t('menu.disclaimer')}
        </p>
      </div>
    </ScreenOverlay>
  );
}
