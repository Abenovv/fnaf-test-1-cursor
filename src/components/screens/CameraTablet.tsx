import { useTranslation } from 'react-i18next';
import { CAMERA_FEEDS, type CameraFeedId } from '@/game/constants';
import { useGameStore } from '@/store/gameStore';
import { cameraHasThreat } from '@/game/ai/visibility';

const CAM_LABEL: Record<CameraFeedId, string> = {
  cam1a: 'cam.1a',
  cam1b: 'cam.1b',
  cam1c: 'cam.1c',
  cam2a: 'cam.2a',
  cam2b: 'cam.2b',
  cam3: 'cam.3',
  cam4a: 'cam.4a',
  cam4b: 'cam.4b',
  cam5: 'cam.5',
  cam6: 'cam.6',
};

/** Facility layout for camera tablet minimap */
const MAP_ROOMS: { id: CameraFeedId; x: number; y: number; w: number; h: number }[] = [
  { id: 'cam1a', x: 42, y: 8, w: 16, h: 12 },
  { id: 'cam1b', x: 38, y: 24, w: 24, h: 14 },
  { id: 'cam1c', x: 8, y: 8, w: 14, h: 18 },
  { id: 'cam2a', x: 8, y: 32, w: 18, h: 10 },
  { id: 'cam2b', x: 8, y: 46, w: 14, h: 10 },
  { id: 'cam3', x: 28, y: 42, w: 12, h: 10 },
  { id: 'cam4a', x: 74, y: 32, w: 18, h: 10 },
  { id: 'cam4b', x: 78, y: 46, w: 14, h: 10 },
  { id: 'cam5', x: 58, y: 8, w: 14, h: 14 },
  { id: 'cam6', x: 42, y: 42, w: 16, h: 14 },
];

function FacilityMap({
  active,
  onSelect,
}: {
  active: CameraFeedId;
  onSelect: (id: CameraFeedId) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="mt-3 w-full">
      <div className="font-body mb-1 text-[0.5rem] tracking-wider text-[#444]">{t('camera.map')}</div>
      <svg viewBox="0 0 100 60" className="w-full border border-[#1a1a1a] bg-[#030305]">
        {/* Office */}
        <rect x="44" y="52" width="12" height="6" fill="#1a1020" stroke="#333" strokeWidth="0.3" />
        <text x="50" y="56" textAnchor="middle" fill="#8b0000" fontSize="2.5">
          OFFICE
        </text>
        {MAP_ROOMS.map((room) => (
          <g key={room.id} onClick={() => onSelect(room.id)} className="cursor-pointer">
            <rect
              x={room.x}
              y={room.y}
              width={room.w}
              height={room.h}
              fill={active === room.id ? '#3a1010' : '#101014'}
              stroke={active === room.id ? '#8b0000' : '#222'}
              strokeWidth={active === room.id ? 0.6 : 0.3}
            />
            <text
              x={room.x + room.w / 2}
              y={room.y + room.h / 2 + 1}
              textAnchor="middle"
              fill={active === room.id ? '#8b0000' : '#444'}
              fontSize="2.2"
            >
              {room.id.replace('cam', '').toUpperCase()}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function CameraTablet() {
  const { t } = useTranslation();
  const activeCamera = useGameStore((s) => s.activeCamera);
  const animatronics = useGameStore((s) => s.animatronics);
  const switchCamera = useGameStore((s) => s.switchCamera);
  const closeCamera = useGameStore((s) => s.closeCamera);
  const threats = cameraHasThreat(animatronics, activeCamera);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4">
      <div className="w-[min(640px,96vw)]">
        <div className="relative aspect-[4/3] border border-[#1a1a1a] bg-[#050507]">
          <div className="absolute inset-0 opacity-20">
            <div className="h-full w-full animate-pulse bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.03)_2px,rgba(255,255,255,0.03)_4px)]" />
          </div>
          <div className="font-body absolute left-2 top-2 text-[0.55rem] tracking-wider text-horror-red">
            {t(CAM_LABEL[activeCamera])} — {activeCamera.toUpperCase()}
          </div>
          <div className="font-body absolute right-2 top-2 flex items-center gap-1 text-[0.5rem] text-horror-red">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-horror-red" />
            {t('camera.rec')}
          </div>
          <div className="flex h-full items-center justify-center">
            {threats.length > 0 ? (
              <div className="text-center">
                <p className="font-body animate-pulse text-sm tracking-[0.3em] text-horror-red">
                  {t('camera.motion')}
                </p>
                <p className="font-body mt-2 text-[0.55rem] text-[#444]">
                  {threats.map((id) => id.toUpperCase()).join(' · ')}
                </p>
              </div>
            ) : (
              <p className="font-body text-[0.65rem] tracking-wider text-[#222]">
                {t('camera.title')} — {t(CAM_LABEL[activeCamera])}
              </p>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap justify-center gap-1">
          {CAMERA_FEEDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => switchCamera(id)}
              className={`font-body border px-2 py-1 text-[0.45rem] tracking-wider ${
                activeCamera === id
                  ? 'border-horror-red text-horror-red'
                  : 'border-[#1a1a1a] text-[#444] hover:border-horror-red/40'
              }`}
            >
              {id.replace('cam', 'CAM ').toUpperCase()}
            </button>
          ))}
        </div>

        <FacilityMap active={activeCamera} onSelect={switchCamera} />

        <button
          type="button"
          onClick={closeCamera}
          className="font-body mt-3 w-full text-center text-[0.55rem] tracking-wider text-[#444] hover:text-horror-red"
        >
          {t('camera.close')} [C]
        </button>
      </div>
    </div>
  );
}
