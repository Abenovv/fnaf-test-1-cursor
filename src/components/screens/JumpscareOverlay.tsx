import { useGameStore } from '@/store/gameStore';

const LABELS: Record<string, string> = {
  freddy: 'FREDDY',
  bonnie: 'BONNIE',
  chica: 'CHICA',
  foxy: 'FOXY',
};

export function JumpscareOverlay() {
  const jumpscare = useGameStore((s) => s.jumpscare);
  if (!jumpscare) return null;

  return (
    <div className="fixed inset-0 z-[100] animate-pulse bg-black">
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background: 'radial-gradient(circle at center, #8b0000 0%, #000 70%)',
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="font-horror text-[clamp(4rem,18vw,12rem)] tracking-widest text-black drop-shadow-[0_0_40px_#ff0000]"
          style={{ textShadow: '0 0 60px #ff0000, 0 0 120px #8b0000' }}
        >
          {LABELS[jumpscare] ?? jumpscare.toUpperCase()}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,0,0,0.08)_2px,rgba(255,0,0,0.08)_4px)]" />
    </div>
  );
}
