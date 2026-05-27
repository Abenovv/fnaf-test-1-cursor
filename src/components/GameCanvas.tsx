import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { EffectComposer } from '@react-three/postprocessing';
import { OfficeWorld } from './scene/OfficeWorld';
import { GameEffects } from './scene/GameEffects';
import { useGameStore } from '@/store/gameStore';

export function GameCanvas() {
  const quality = useGameStore((s) => s.quality);
  const dpr = quality === 'low' ? 0.75 : quality === 'medium' ? 1 : Math.min(window.devicePixelRatio, 1.5);
  const usePost = quality !== 'low';

  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        shadows
        dpr={dpr}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 1.58, 2.25], fov: 68, near: 0.1, far: 40 }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 1.45, -0.5);
        }}
      >
        <Suspense fallback={null}>
          <OfficeWorld />
          {usePost && (
            <EffectComposer multisampling={quality === 'high' ? 4 : 0}>
              <GameEffects />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
