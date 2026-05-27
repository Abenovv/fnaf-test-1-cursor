import { useGameStore } from '@/store/gameStore';
import { threatVisibleAtSide } from '@/game/ai/visibility';

interface Props {
  side: 'left' | 'right';
  lightOn: boolean;
  powerOut: boolean;
}

export function Hallway({ side, lightOn, powerOut }: Props) {
  const animatronics = useGameStore((s) => s.animatronics);
  const threat = threatVisibleAtSide(animatronics, side);
  const showThreat = !!threat && lightOn && !powerOut;
  const x = side === 'left' ? -5.2 : 5.2;
  const rotY = side === 'left' ? Math.PI / 2 : -Math.PI / 2;

  const hallLight = powerOut ? 0 : lightOn ? 2.2 : 0.15;
  const hallColor = lightOn && !powerOut ? '#ffcc88' : '#223344';

  return (
    <group position={[x, 0, -0.3]} rotation={[0, rotY, 0]}>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 2.5]}>
        <planeGeometry args={[2, 5]} />
        <meshStandardMaterial color="#0c0c10" roughness={0.95} />
      </mesh>
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 2.8, 2.5]}>
        <planeGeometry args={[2, 5]} />
        <meshStandardMaterial color="#08080a" />
      </mesh>
      {/* Side walls */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s, 1.4, 2.5]} receiveShadow>
          <planeGeometry args={[5, 2.8]} />
          <meshStandardMaterial color="#101014" roughness={0.9} />
        </mesh>
      ))}
      {/* End wall */}
      <mesh position={[0, 1.4, 5]} receiveShadow>
        <planeGeometry args={[2, 2.8]} />
        <meshStandardMaterial color="#0a0a0e" />
      </mesh>
      {/* Hall light */}
      <pointLight
        position={[0, 2.5, 2]}
        intensity={hallLight}
        color={hallColor}
        distance={8}
        decay={2}
      />
      {showThreat && (
        <group position={[0, 1.1, 4.2]}>
          <mesh castShadow>
            <boxGeometry args={[0.55, 1.8, 0.35]} />
            <meshStandardMaterial color="#0a0a0a" roughness={1} />
          </mesh>
          <mesh position={[0, 1.5, 0.2]}>
            <sphereGeometry args={[0.22, 8, 8]} />
            <meshStandardMaterial
              color="#111"
              emissive="#8b0000"
              emissiveIntensity={0.35}
            />
          </mesh>
          <pointLight position={[0, 1.2, 0.5]} intensity={0.6} color="#ff4444" distance={3} />
        </group>
      )}
      {/* Window frame into office (visible from inside) */}
      <mesh position={[side === 'left' ? 1.01 : -1.01, 1.2, -2.55]}>
        <boxGeometry args={[0.06, 2.2, 1.2]} />
        <meshStandardMaterial color="#1a1a20" metalness={0.5} roughness={0.6} />
      </mesh>
    </group>
  );
}
