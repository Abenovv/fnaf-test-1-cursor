import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { SecurityDoor } from './SecurityDoor';
import { Hallway } from './Hallway';

function FlickerLight({
  position,
  baseIntensity,
  color,
  powerOut,
}: {
  position: [number, number, number];
  baseIntensity: number;
  color: string;
  powerOut: boolean;
}) {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (!ref.current || powerOut) return;
    const flicker = 0.85 + Math.sin(clock.elapsedTime * 12) * 0.08 + Math.random() * 0.02;
    ref.current.intensity = baseIntensity * flicker;
  });
  return (
    <pointLight
      ref={ref}
      position={position}
      intensity={powerOut ? 0 : baseIntensity}
      color={color}
      distance={12}
      decay={2}
      castShadow
      shadow-mapSize={[1024, 1024]}
    />
  );
}

export function OfficeWorld() {
  const doorLeft = useGameStore((s) => s.doorLeft);
  const doorRight = useGameStore((s) => s.doorRight);
  const lightLeft = useGameStore((s) => s.lightLeft);
  const lightRight = useGameStore((s) => s.lightRight);
  const powerOut = useGameStore((s) => s.powerOut);
  const screen = useGameStore((s) => s.screen);

  const showOffice = screen === 'playing' || screen === 'menu';

  if (!showOffice) return null;

  const amb = powerOut ? 0.08 : 0.38;
  const hemi = powerOut ? 0.1 : 0.55;

  return (
    <>
      <color attach="background" args={['#0a0a12']} />
      <fog attach="fog" args={['#0a0a12', 4, 22]} />

      <ambientLight intensity={amb} color="#8899bb" />
      <hemisphereLight args={['#334455', '#050508', hemi]} />

      <FlickerLight position={[0, 2.85, 0]} baseIntensity={2.4} color="#c8d4e8" powerOut={powerOut} />
      <pointLight position={[0.3, 1.1, 1.0]} intensity={powerOut ? 0 : 0.9} color="#1a5080" distance={4} />
      <spotLight
        position={[0, 3, 1.5]}
        angle={0.5}
        penumbra={0.6}
        intensity={powerOut ? 0 : 0.6}
        color="#8090a0"
        castShadow
      />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[7, 6]} />
        <meshStandardMaterial color="#141418" roughness={0.85} metalness={0.05} />
      </mesh>
      <Grid
        position={[0, 0.01, 0]}
        args={[7, 6]}
        cellSize={0.5}
        cellThickness={0.4}
        cellColor="#1e1e28"
        sectionSize={1}
        sectionThickness={0.8}
        sectionColor="#2a2030"
        fadeDistance={14}
        infiniteGrid={false}
      />

      {/* Back wall */}
      <mesh position={[0, 1.6, -3]} receiveShadow>
        <planeGeometry args={[7, 3.2]} />
        <meshStandardMaterial color="#12121a" roughness={0.9} />
      </mesh>
      {/* Poster */}
      <mesh position={[1.8, 2, -2.98]}>
        <planeGeometry args={[0.9, 0.6]} />
        <meshStandardMaterial
          color="#200808"
          emissive="#5a0000"
          emissiveIntensity={powerOut ? 0 : 0.25}
        />
      </mesh>

      {/* Side walls with door openings — built from segments */}
      <WallSegment x={-3.5} z={-1.8} w={1.4} h={3.2} rotY={Math.PI / 2} />
      <WallSegment x={-3.5} z={1.2} w={2.2} h={3.2} rotY={Math.PI / 2} />
      <WallSegment x={-3.5} z={-0.2} w={1.4} h={0.5} rotY={Math.PI / 2} y={2.75} />
      <WallSegment x={3.5} z={-1.8} w={1.4} h={3.2} rotY={-Math.PI / 2} />
      <WallSegment x={3.5} z={1.2} w={2.2} h={3.2} rotY={-Math.PI / 2} />
      <WallSegment x={3.5} z={-0.2} w={1.4} h={0.5} rotY={-Math.PI / 2} y={2.75} />

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.2, 0]}>
        <planeGeometry args={[7, 6]} />
        <meshStandardMaterial color="#0c0c10" />
      </mesh>

      {/* Desk */}
      <group position={[0, 0, 1.4]}>
        <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.6, 0.75, 0.85]} />
          <meshStandardMaterial color="#1a1208" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.78, 0]} castShadow>
          <boxGeometry args={[2.7, 0.06, 0.9]} />
          <meshStandardMaterial color="#221810" roughness={0.7} />
        </mesh>
        <mesh position={[0.25, 1.05, -0.05]} castShadow>
          <boxGeometry args={[0.75, 0.45, 0.05]} />
          <meshStandardMaterial
            color="#0a1520"
            emissive="#1a5080"
            emissiveIntensity={powerOut ? 0 : 0.7}
          />
        </mesh>
        {/* Fan */}
        <mesh position={[-0.9, 0.95, 0.1]}>
          <cylinderGeometry args={[0.05, 0.07, 0.28, 8]} />
          <meshStandardMaterial color="#222" metalness={0.5} />
        </mesh>
      </group>

      {/* Door side markers */}
      <mesh position={[-3.2, 2.5, -0.3]}>
        <planeGeometry args={[0.15, 0.15]} />
        <meshStandardMaterial color="#8b0000" emissive="#8b0000" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[3.2, 2.5, -0.3]}>
        <planeGeometry args={[0.15, 0.15]} />
        <meshStandardMaterial color="#8b0000" emissive="#8b0000" emissiveIntensity={0.4} />
      </mesh>

      <SecurityDoor side="left" closed={doorLeft} powerOut={powerOut} />
      <SecurityDoor side="right" closed={doorRight} powerOut={powerOut} />

      <Hallway side="left" lightOn={lightLeft} powerOut={powerOut} />
      <Hallway side="right" lightOn={lightRight} powerOut={powerOut} />

      {/* Distant facility blocks (map silhouette) */}
      <mesh position={[0, 1.5, -8]}>
        <boxGeometry args={[12, 3, 0.2]} />
        <meshStandardMaterial color="#08080c" />
      </mesh>
    </>
  );
}

function WallSegment({
  x,
  z,
  w,
  h,
  rotY,
  y = 1.6,
}: {
  x: number;
  z: number;
  w: number;
  h: number;
  rotY: number;
  y?: number;
}) {
  return (
    <mesh position={[x, y, z]} rotation={[0, rotY, 0]} receiveShadow castShadow>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial color="#111118" roughness={0.88} />
    </mesh>
  );
}
