import { RoundedBox, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const WIDTH = 1.6;
const HEIGHT = 3.3;
const SCREEN_WIDTH = 1.47;
const SCREEN_HEIGHT = 3.17;

/** A rounded-rectangle plane with 0-1 UVs, for the display. */
function roundedScreen(width: number, height: number, radius: number) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  const geometry = new THREE.ShapeGeometry(shape, 16);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let index = 0; index < position.count; index++) {
    uv.setXY(index, (position.getX(index) - x) / width, (position.getY(index) - y) / height);
  }
  return geometry;
}

/**
 * A titanium phone whose display crossfades between app screenshots.
 * `screen` is read every frame so scroll can drive it without re-rendering.
 */
export function Phone({ screens, screen }: { screens: string[]; screen: { current: number } }) {
  const textures = useTexture(screens);
  useMemo(() => {
    textures.forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
    });
  }, [textures]);
  const geometry = useMemo(() => roundedScreen(SCREEN_WIDTH, SCREEN_HEIGHT, 0.2), []);
  const materials = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  useFrame((_, delta) => {
    materials.current.forEach((material, index) => {
      if (!material) return;
      const target = index === Math.round(screen.current) ? 1 : 0;
      material.opacity = THREE.MathUtils.damp(material.opacity, target, 9, delta);
    });
  });

  return (
    <group>
      <RoundedBox args={[WIDTH, HEIGHT, 0.17]} radius={0.24} smoothness={10} castShadow>
        <meshPhysicalMaterial color="#2a312d" metalness={0.92} roughness={0.32} clearcoat={0.6} />
      </RoundedBox>
      <RoundedBox args={[WIDTH - 0.04, HEIGHT - 0.04, 0.172]} radius={0.22} smoothness={10}>
        <meshStandardMaterial color="#050807" roughness={0.4} />
      </RoundedBox>
      {textures.map((texture, index) => (
        <mesh key={index} geometry={geometry} position={[0, 0, 0.0875 + index * 0.0004]} renderOrder={index + 1}>
          <meshBasicMaterial
            ref={(material) => {
              materials.current[index] = material;
            }}
            map={texture}
            transparent
            opacity={index === 0 ? 1 : 0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
      {/* Dynamic Island */}
      <mesh position={[0, HEIGHT / 2 - 0.16, 0.092]} rotation={[0, 0, Math.PI / 2]} renderOrder={20}>
        <capsuleGeometry args={[0.05, 0.2, 8, 16]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      {/* Glass sheen */}
      <mesh geometry={geometry} position={[0, 0, 0.094]} renderOrder={30}>
        <meshPhysicalMaterial transparent opacity={0.08} roughness={0.05} clearcoat={1} color="#ffffff" depthWrite={false} />
      </mesh>
    </group>
  );
}
