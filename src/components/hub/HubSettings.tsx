import { useTranslation } from 'react-i18next';
import { useHubStore } from '@/hub/hubStore';
import { setMasterVolume, setSoundEnabled } from '@/audio/soundManager';
import { playSound } from '@/audio/soundManager';

export function HubSettings() {
  const { t } = useTranslation();
  const setScreen = useHubStore((s) => s.setScreen);
  const masterVolume = useHubStore((s) => s.masterVolume);
  const sfxEnabled = useHubStore((s) => s.sfxEnabled);
  const setVolume = useHubStore((s) => s.setVolume);

  return (
    <div className="hub-bg flex min-h-screen items-center justify-center px-4">
      <div className="hub-panel w-[min(420px,94vw)] p-8">
        <h2 className="font-display text-2xl text-white">{t('settings.title')}</h2>
        <label className="mt-6 block text-xs text-zinc-500">
          {t('settings.volume')} — {Math.round(masterVolume * 100)}%
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterVolume}
            className="mt-2 w-full accent-violet-500"
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              setMasterVolume(v);
            }}
          />
        </label>
        <label className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={sfxEnabled}
            onChange={(e) => {
              useHubStore.setState({ sfxEnabled: e.target.checked });
              setSoundEnabled(e.target.checked);
            }}
            className="accent-violet-500"
          />
          {t('settings.sfx')}
        </label>
        <button
          type="button"
          className="hub-btn-secondary mt-8 w-full"
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
