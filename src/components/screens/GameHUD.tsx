import { useTranslation } from 'react-i18next';
import { useGameStore } from '@/store/gameStore';
import { useHourLabel } from '../ui/primitives';

function HudButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-body border px-3 py-2 text-[0.55rem] tracking-wider transition ${
        active
          ? 'border-horror-red bg-horror-red/20 text-horror-red'
          : 'border-[#222] text-[#666] hover:border-horror-red/50 hover:text-horror-red'
      }`}
    >
      {label}
    </button>
  );
}

export function GameHUD() {
  const { t } = useTranslation();
  const power = useGameStore((s) => s.power);
  const hour = useGameStore((s) => s.hour);
  const night = useGameStore((s) => s.night);
  const powerOut = useGameStore((s) => s.powerOut);
  const doorLeft = useGameStore((s) => s.doorLeft);
  const doorRight = useGameStore((s) => s.doorRight);
  const lightLeft = useGameStore((s) => s.lightLeft);
  const lightRight = useGameStore((s) => s.lightRight);
  const cameraOpen = useGameStore((s) => s.cameraOpen);
  const getUsageBars = useGameStore((s) => s.getUsageBars);
  const toggleDoorLeft = useGameStore((s) => s.toggleDoorLeft);
  const toggleDoorRight = useGameStore((s) => s.toggleDoorRight);
  const toggleLightLeft = useGameStore((s) => s.toggleLightLeft);
  const toggleLightRight = useGameStore((s) => s.toggleLightRight);
  const openCamera = useGameStore((s) => s.openCamera);
  const closeCamera = useGameStore((s) => s.closeCamera);

  const hourLabel = useHourLabel(hour);
  const bars = getUsageBars();
  const powerColor = power > 50 ? '#888' : power > 25 ? '#b8860b' : '#8b0000';

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {powerOut && (
        <div className="font-body absolute left-1/2 top-4 -translate-x-1/2 text-xs tracking-[0.2em] text-horror-red animate-pulse">
          {t('hud.powerOut')}
        </div>
      )}
      {power <= 20 && !powerOut && (
        <div className="font-body absolute left-1/2 top-4 -translate-x-1/2 text-[0.6rem] tracking-wider text-horror-red">
          {t('hud.powerLow')}
        </div>
      )}

      {/* Bottom bar */}
      <div className="pointer-events-auto absolute bottom-0 left-0 right-0 flex items-end justify-between p-4">
        <div>
          <div className="font-body text-[0.5rem] tracking-wider text-[#444]">{t('hud.power')}</div>
          <div className="font-body text-xl" style={{ color: powerColor }}>
            {Math.round(power)}%
          </div>
          <div className="mt-1 flex gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                className="inline-block h-2.5 w-1.5"
                style={{ background: i < bars ? powerColor : '#111' }}
              />
            ))}
          </div>
        </div>

        <div className="text-center">
          <div className="font-horror text-3xl tracking-widest text-horror-red drop-shadow-[0_0_12px_rgba(139,0,0,0.4)]">
            {hourLabel}
          </div>
          <div className="font-body text-[0.5rem] text-[#333]">{t('hud.night', { n: night })}</div>
        </div>

        <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2">
          <HudButton label="1 · L" active={doorLeft} onClick={toggleDoorLeft} />
          <HudButton label="2 · R" active={doorRight} onClick={toggleDoorRight} />
          <HudButton label="Q · ◀" active={lightLeft} onClick={toggleLightLeft} />
          <HudButton label="E · ▶" active={lightRight} onClick={toggleLightRight} />
          <HudButton
            label={t('hud.cameras')}
            active={cameraOpen}
            onClick={() => (cameraOpen ? closeCamera() : openCamera())}
          />
        </div>
      </div>

      {/* Mobile touch strip */}
      <div className="pointer-events-auto fixed bottom-24 left-0 right-0 flex justify-between px-3 md:hidden">
        <div className="flex flex-col gap-1">
          <HudButton label="◀ DOOR" active={doorLeft} onClick={toggleDoorLeft} />
          <HudButton label="◀ LIGHT" active={lightLeft} onClick={toggleLightLeft} />
        </div>
        <HudButton
          label="CAM"
          active={cameraOpen}
          onClick={() => (cameraOpen ? closeCamera() : openCamera())}
        />
        <div className="flex flex-col gap-1">
          <HudButton label="DOOR ▶" active={doorRight} onClick={toggleDoorRight} />
          <HudButton label="LIGHT ▶" active={lightRight} onClick={toggleLightRight} />
        </div>
      </div>
    </div>
  );
}
