import { Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { useGameStore } from '@/store/gameStore';

export function GameEffects() {
  const bloom = useGameStore((s) => s.bloom);
  const filmGrain = useGameStore((s) => s.filmGrain);
  const quality = useGameStore((s) => s.quality);

  if (quality === 'low') return null;

  return (
    <>
      {bloom && <Bloom intensity={0.35} luminanceThreshold={0.75} mipmapBlur />}
      <Vignette eskil={false} offset={0.35} darkness={0.65} />
      {filmGrain && <Noise opacity={0.04} />}
    </>
  );
}
