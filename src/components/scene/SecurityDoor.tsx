import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface Props {
  side: 'left' | 'right';
  closed: boolean;
  powerOut: boolean;
}

/** Sliding metal security door in the office doorway. */
export function SecurityDoor({ side, closed, powerOut }: Props) {
  const meshRef = useRef<THREE.Group>(null);
  const targetY = useRef(closed ? 0 : 2.4);

  const x = side === 'left' ? -3.48 : 3.48;
  const openY = 2.35;

  useFrame((_, delta) => {
    targetY.current = closed && !powerOut ? 0 : openY;
    if (!meshRef.current) return;
    meshRef.current.position.y = THREE.MathUtils.lerp(
      meshRef.current.position.y,
      targetY.current,
      delta * 8
    );
  });

  const metal = powerOut ? '#1a1a1a' : closed ? '#4a3030' : '#3a3a42';
  const stripe = closed ? '#8b0000' : '#333';

  return (
    <group ref={meshRef} position={[x, openY, -0.3]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.15, 2.25, 0.08]} />
        <meshStandardMaterial color={metal} metalness={0.6} roughness={0.45} />
      </mesh>
      {/* Warning stripes */}
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[1.0, 0.12]} />
        <meshStandardMaterial color={stripe} emissive={stripe} emissiveIntensity={0.2} />
      </mesh>
      {/* Frame */}
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[1.25, 2.35, 0.06]} />
        <meshStandardMaterial color="#151518" metalness={0.3} roughness={0.8} />
      </mesh>
    </group>
  );
}
