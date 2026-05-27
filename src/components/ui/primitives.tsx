import { useTranslation } from 'react-i18next';

const HOUR_KEYS = ['hour.12', 'hour.1', 'hour.2', 'hour.3', 'hour.4', 'hour.5', 'hour.6'] as const;

export function useHourLabel(hour: number) {
  const { t } = useTranslation();
  return t(HOUR_KEYS[Math.min(hour, 6)] ?? 'hour.6');
}

export function MenuButton({
  children,
  onClick,
  primary = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`font-body min-w-[220px] border px-8 py-2.5 text-xs tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
        primary
          ? 'border-horror-red/60 text-horror-red hover:border-horror-red hover:bg-horror-red/10 hover:shadow-[0_0_16px_rgba(139,0,0,0.35)]'
          : 'border-[#1a1a1a] text-[#555] hover:border-[#333] hover:text-[#888]'
      }`}
    >
      {children}
    </button>
  );
}

export function ScreenOverlay({
  children,
  opaque = true,
}: {
  children: React.ReactNode;
  opaque?: boolean;
}) {
  return (
    <div
      className={`fixed inset-0 z-20 flex flex-col items-center justify-center ${
        opaque ? 'bg-[#050507]/92' : 'bg-[#050507]/55 pointer-events-none'
      }`}
    >
      <div className={opaque ? '' : 'pointer-events-auto'}>{children}</div>
    </div>
  );
}
