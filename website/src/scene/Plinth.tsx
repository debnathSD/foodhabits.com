import { useMemo } from 'react';
import * as THREE from 'three';

/** A soft radial glow, drawn once into a canvas texture. */
function glowTexture(color: string) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.45, `${color}66`);
  gradient.addColorStop(1, `${color}00`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * A stone pedestal for product shots. With `rim`, its top edge glows in that
 * colour (no light of its own, so it leaves no hot spot on glossy things above it).
 * Its origin is the centre of the top face.
 */
export function Plinth({
  radius = 1.2,
  height = 0.3,
  color = '#0f1d16',
  rim,
}: {
  radius?: number;
  height?: number;
  color?: string;
  rim?: string;
}) {
  const glow = useMemo(() => (rim ? glowTexture(rim) : null), [rim]);

  return (
    <group>
      <mesh position={[0, -height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius * 1.03, height, 128]} />
        <meshPhysicalMaterial color={color} roughness={0.38} metalness={0.15} clearcoat={0.7} clearcoatRoughness={0.25} />
      </mesh>
      {/* A glossier inset top that catches reflections. */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[radius * 0.965, 128]} />
        <meshPhysicalMaterial color={color} roughness={0.22} metalness={0.3} clearcoat={0.6} envMapIntensity={rim ? 0.25 : 1} />
      </mesh>
      {rim && glow && (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius * 0.995, 0.012, 12, 160]} />
            <meshBasicMaterial color={rim} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[radius * 2.6, radius * 2.6]} />
            <meshBasicMaterial map={glow} transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        </>
      )}
    </group>
  );
}
