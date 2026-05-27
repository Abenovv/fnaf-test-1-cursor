import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useGameStore, type LocaleCode } from '@/store/gameStore';
import { MenuButton, ScreenOverlay } from '../ui/primitives';

const LOCALES: { code: LocaleCode; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'kk', label: 'Қазақша' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
  { code: 'zh', label: '中文' },
];

export function SettingsScreen() {
  const { t } = useTranslation();
  const setScreen = useGameStore((s) => s.setScreen);
  const locale = useGameStore((s) => s.locale);
  const setLocale = useGameStore((s) => s.setLocale);
  const quality = useGameStore((s) => s.quality);
  const masterVolume = useGameStore((s) => s.masterVolume);
  const filmGrain = useGameStore((s) => s.filmGrain);
  const bloom = useGameStore((s) => s.bloom);

  const changeLocale = (code: LocaleCode) => {
    setLocale(code);
    void i18n.changeLanguage(code);
  };

  return (
    <ScreenOverlay>
      <div className="w-[min(420px,92vw)] select-none">
        <h2 className="font-horror mb-6 text-center text-3xl tracking-widest text-horror-red">
          {t('settings.title')}
        </h2>

        <label className="font-body mb-4 block text-[0.55rem] tracking-wider text-[#444]">
          {t('settings.language')}
          <select
            value={locale}
            onChange={(e) => changeLocale(e.target.value as LocaleCode)}
            className="font-body mt-1 w-full border border-[#1a1a1a] bg-[#0a0a0f] px-2 py-2 text-xs text-[#888]"
          >
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </label>

        <label className="font-body mb-4 block text-[0.55rem] tracking-wider text-[#444]">
          {t('settings.quality')}
          <select
            value={quality}
            onChange={(e) =>
              useGameStore.setState({ quality: e.target.value as 'low' | 'medium' | 'high' })
            }
            className="font-body mt-1 w-full border border-[#1a1a1a] bg-[#0a0a0f] px-2 py-2 text-xs text-[#888]"
          >
            <option value="low">{t('quality.low')}</option>
            <option value="medium">{t('quality.medium')}</option>
            <option value="high">{t('quality.high')}</option>
          </select>
        </label>

        <label className="font-body mb-4 block text-[0.55rem] tracking-wider text-[#444]">
          {t('settings.volume')} — {Math.round(masterVolume * 100)}%
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterVolume}
            onChange={(e) => useGameStore.setState({ masterVolume: parseFloat(e.target.value) })}
            className="mt-1 w-full accent-horror-red"
          />
        </label>

        <div className="mb-4 flex flex-wrap gap-4 text-[0.55rem] text-[#666]">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filmGrain}
              onChange={(e) => useGameStore.setState({ filmGrain: e.target.checked })}
              className="accent-horror-red"
            />
            {t('settings.grain')}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={bloom}
              onChange={(e) => useGameStore.setState({ bloom: e.target.checked })}
              className="accent-horror-red"
            />
            {t('settings.bloom')}
          </label>
        </div>

        <div className="flex justify-center gap-3">
          <MenuButton onClick={() => setScreen('menu')}>{t('back')}</MenuButton>
        </div>
      </div>
    </ScreenOverlay>
  );
}
