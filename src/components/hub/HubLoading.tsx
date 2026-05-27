import { useTranslation } from 'react-i18next';

export function HubLoading({ progress }: { progress: number }) {
  const { t } = useTranslation();
  return (
    <div className="hub-bg flex min-h-screen flex-col items-center justify-center">
      <h1 className="font-display text-3xl text-white">{t('hub.title')}</h1>
      <p className="mt-2 font-mono text-xs text-zinc-500">
        {progress >= 1 ? t('loading.ready') : t('loading')}
      </p>
      <div className="mt-6 h-1 w-64 overflow-hidden rounded-full bg-zinc-900">
        <div
          className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
