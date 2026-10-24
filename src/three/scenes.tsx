/**
 * Composed 3D scenes used by the marketing site, the app's home screen and the
 * meal explainer. Plain three.js + react-three-fiber only, so they render with
 * WebGL on the web and expo-gl on phones.
 */
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { Avocado, Blueberry, Broccoli, Carrot, Chili, FOOD_PIECES, Leaf, LemonSlice, Tomato } from './food';
import { PALETTE } from './palette';

/** A glazed ceramic bowl turned on a lathe. */
export function Bowl({ color = PALETTE.ceramic }: { color?: string }) {
  const geometry = useMemo(() => {
    const profile = [
      [0.0, -0.42],
      [0.42, -0.42],
      [0.46, -0.38],
      [0.5, -0.36],
      [0.78, -0.2],
      [1.0, 0.08],
      [1.08, 0.28],
      [1.1, 0.34],
      [1.04, 0.34],
      [0.98, 0.18],
      [0.8, -0.06],
      [0.5, -0.24],
      [0.0, -0.28],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(profile, 96);
  }, []);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial color={color} roughness={0.22} clearcoat={1} clearcoatRoughness={0.1} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Deterministic pseudo-random numbers, so scenes look the same on every render. */
export function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

/** Small round ingredients (chickpeas, quinoa) scattered over the salad. */
function Scatter({ count, radius, size, color, seed, height = 0.22 }: { count: number; radius: number; size: number; color: string; seed: number; height?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const placed = useRef(false);
  useFrame(() => {
    if (placed.current || !mesh.current) return;
    const random = seeded(seed);
    const dummy = new THREE.Object3D();
    for (let index = 0; index < count; index++) {
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * radius;
      dummy.position.set(Math.cos(angle) * distance, height + random() * 0.08 - distance * 0.12, Math.sin(angle) * distance);
      dummy.rotation.set(random() * 3, random() * 3, random() * 3);
      dummy.scale.set(1, 0.85 + random() * 0.3, 1);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(index, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    placed.current = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} castShadow>
      <icosahedronGeometry args={[size, 2]} />
      <meshPhysicalMaterial color={color} roughness={0.55} clearcoat={0.3} />
    </instancedMesh>
  );
}

function Cucumber(props: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <group {...props}>
      <mesh castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.05, 32]} />
        <meshPhysicalMaterial color="#2F6B2E" roughness={0.4} clearcoat={0.6} />
      </mesh>
      <mesh position={[0, 0.026, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.002, 32]} />
        <meshPhysicalMaterial color="#D6EBA8" roughness={0.3} clearcoat={0.5} />
      </mesh>
    </group>
  );
}

/** A gut-friendly bowl: greens, avocado, chickpeas, quinoa, cucumber, tomatoes and berries. */
export function SaladBowl({ spin = 0.18 }: { spin?: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * spin;
  });
  const leaves = useMemo(() => {
    const random = seeded(7);
    // Three rings of overlapping leaves, so the bed of greens reads as leaves, not a flat disc.
    return Array.from({ length: 26 }, (_, index) => {
      const angle = (index / 26) * Math.PI * 2 * 3 + random() * 0.5;
      const ring = [0.2, 0.46, 0.68][index % 3];
      return {
        position: [Math.cos(angle) * ring, 0.17 + random() * 0.08, Math.sin(angle) * ring] as [number, number, number],
        rotation: [-1.2 + random() * 0.5, angle + Math.PI / 2, 0.1 + random() * 0.5] as [number, number, number],
        scale: 0.46 + random() * 0.22,
        color: ['#5FAF4E', '#3E8C3A', '#86C76A', '#2F6E2C', '#9BCF6E'][index % 5],
      };
    });
  }, []);
  return (
    <group ref={group}>
      <Bowl />
      <group position={[0, 0.1, 0]}>
        <mesh scale={[0.9, 0.08, 0.9]} position={[0, -0.05, 0]}>
          <sphereGeometry args={[1, 48, 24]} />
          <meshPhysicalMaterial color="#13260E" roughness={0.95} />
        </mesh>
        {leaves.map((leaf, index) => (
          <Leaf key={index} position={leaf.position} rotation={leaf.rotation} scale={leaf.scale} color={leaf.color} />
        ))}
        <Scatter count={14} radius={0.42} size={0.055} color="#E3C48D" seed={11} />
        <Scatter count={70} radius={0.6} size={0.018} color="#F1E6C8" seed={23} height={0.2} />
        <Avocado position={[-0.32, 0.3, 0.08]} rotation={[-1.25, 0.3, 0.2]} scale={0.55} />
        <Tomato position={[0.36, 0.24, -0.16]} scale={0.26} />
        <Tomato position={[0.22, 0.22, 0.4]} scale={0.24} />
        <Tomato position={[-0.08, 0.24, -0.5]} scale={0.22} />
        <Cucumber position={[0.48, 0.24, 0.16]} rotation={[0.5, 0.3, 0.2]} />
        <Cucumber position={[0.02, 0.27, 0.12]} rotation={[0.2, 0.8, -0.3]} />
        <Cucumber position={[-0.45, 0.2, -0.32]} rotation={[-0.4, 0.2, 0.4]} />
        <LemonSlice position={[0.12, 0.3, -0.3]} rotation={[0.9, 0.2, 0.3]} scale={0.3} />
        <Blueberry position={[-0.1, 0.28, 0.44]} scale={0.42} />
        <Blueberry position={[-0.02, 0.27, 0.52]} scale={0.38} />
        <Blueberry position={[-0.6, 0.22, -0.05]} scale={0.4} />
        <Blueberry position={[0.55, 0.2, -0.38]} scale={0.38} />
      </group>
    </group>
  );
}

/**
 * Food floating in a slow orbit around the centre, bobbing out of phase.
 * `radius` is the orbit size; pieces cycle through the eight foods.
 */
export function FoodOrbit({ count = 8, radius = 2.4, speed = 0.12, tilt = 0.35 }: { count?: number; radius?: number; speed?: number; tilt?: number }) {
  const group = useRef<THREE.Group>(null);
  const pieces = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (group.current) group.current.rotation.y = time * speed;
    pieces.current.forEach((piece, index) => {
      if (!piece) return;
      piece.position.y = Math.sin(time * 0.8 + index * 1.7) * 0.18 + (index % 3 - 1) * 0.5;
      piece.rotation.x = time * 0.25 + index;
      piece.rotation.z = Math.sin(time * 0.4 + index) * 0.4;
    });
  });
  return (
    <group rotation={[tilt, 0, 0]}>
      <group ref={group}>
        {Array.from({ length: count }, (_, index) => {
          const Piece = FOOD_PIECES[index % FOOD_PIECES.length];
          const angle = (index / count) * Math.PI * 2;
          return (
            <group key={index} position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}>
              <group ref={(node) => { pieces.current[index] = node; }}>
                <Piece scale={0.55} />
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
}

/** A loop of gut with microbes drifting through it; `health` (0-1) sets how many are friendly. */
export function GutScene({ health = 0.7, speed = 1 }: { health?: number; speed?: number }) {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          [-2.2, 1.0, 0],
          [-0.8, 1.3, 0.4],
          [0.8, 1.0, -0.2],
          [1.9, 0.4, 0.3],
          [1.2, -0.3, 0.6],
          [-0.4, -0.1, -0.3],
          [-1.7, -0.6, 0.2],
          [-1.0, -1.3, 0.5],
          [0.6, -1.2, -0.2],
          [2.0, -1.0, 0.3],
        ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
        false,
        'catmullrom',
        0.5,
      ),
    [],
  );
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 400, 0.34, 40, false), [curve]);

  const microbeCount = 90;
  const microbes = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => {
    const random = seeded(42);
    return Array.from({ length: microbeCount }, (_, index) => ({
      offset: index / microbeCount,
      angle: random() * Math.PI * 2,
      lane: 0.12 + random() * 0.16,
      size: 0.05 + random() * 0.05,
      good: index / microbeCount < health,
    }));
  }, [health]);
  // Colours are set per seed list, so changing `health` recolours the microbes.
  const coloredFor = useRef<typeof seeds | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tangent = useMemo(() => new THREE.Vector3(), []);
  const normal = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const binormal = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const mesh = microbes.current;
    if (!mesh) return;
    if (coloredFor.current !== seeds) {
      const good = new THREE.Color(PALETTE.mint);
      const bad = new THREE.Color(PALETTE.coral);
      seeds.forEach((seed, index) => mesh.setColorAt(index, seed.good ? good : bad));
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      coloredFor.current = seeds;
    }
    const time = clock.getElapsedTime() * 0.03 * speed;
    seeds.forEach((seed, index) => {
      const t = (seed.offset + time) % 1;
      const point = curve.getPointAt(t);
      curve.getTangentAt(t, tangent);
      normal.crossVectors(tangent, up).normalize();
      binormal.crossVectors(tangent, normal);
      const angle = seed.angle + clock.getElapsedTime() * 0.6;
      point.addScaledVector(normal, Math.cos(angle) * seed.lane).addScaledVector(binormal, Math.sin(angle) * seed.lane);
      dummy.position.copy(point);
      const pulse = seed.good ? 1 + Math.sin(clock.getElapsedTime() * 3 + index) * 0.15 : 0.8;
      dummy.scale.setScalar(seed.size * pulse * 10);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={tube}>
        <meshPhysicalMaterial
          color={PALETTE.gut}
          roughness={0.35}
          transparent
          opacity={0.55}
          sheen={1}
          sheenColor="#ffd8cc"
          clearcoat={0.6}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <instancedMesh ref={microbes} args={[undefined, undefined, microbeCount]} key={health}>
        <sphereGeometry args={[0.1, 16, 12]} />
        <meshPhysicalMaterial roughness={0.2} clearcoat={1} emissive="#0a3320" emissiveIntensity={0.4} />
      </instancedMesh>
    </group>
  );
}

/** An extruded heart that beats; faster and redder under strain. */
export function HeartScene({ strain = false }: { strain?: boolean }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.9);
    shape.bezierCurveTo(-0.2, -0.65, -1.1, -0.2, -1.1, 0.35);
    shape.bezierCurveTo(-1.1, 0.85, -0.55, 1.05, 0, 0.62);
    shape.bezierCurveTo(0.55, 1.05, 1.1, 0.85, 1.1, 0.35);
    shape.bezierCurveTo(1.1, -0.2, 0.2, -0.65, 0, -0.9);
    const extruded = new THREE.ExtrudeGeometry(shape, {
      depth: 0.5,
      bevelEnabled: true,
      bevelThickness: 0.28,
      bevelSize: 0.22,
      bevelSegments: 12,
      curveSegments: 48,
    });
    extruded.center();
    return extruded;
  }, []);
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const rate = strain ? 2.6 : 1.4;
    const beat = Math.pow(Math.max(0, Math.sin(clock.getElapsedTime() * rate * Math.PI)), 8);
    mesh.current.scale.setScalar(1 + beat * 0.12);
    mesh.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.45;
  });
  return (
    <mesh ref={mesh} geometry={geometry} castShadow>
      <meshPhysicalMaterial color={strain ? '#E0453C' : '#E86A7A'} roughness={0.25} clearcoat={1} clearcoatRoughness={0.12} sheen={0.6} sheenColor="#ffc2c8" />
    </mesh>
  );
}

/** The gut score as a glowing orb inside a ring that fills to the score. */
export function ScoreOrb({ score, color }: { score: number; color: string }) {
  const ring = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ring.current) ring.current.rotation.z = -clock.getElapsedTime() * 0.2;
  });
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.9, 64, 48]} />
        <meshPhysicalMaterial color={color} roughness={0.15} clearcoat={1} emissive={color} emissiveIntensity={0.35} />
      </mesh>
      <group ref={ring}>
        <mesh>
          <torusGeometry args={[1.35, 0.06, 16, 128, (Math.PI * 2 * score) / 10]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} roughness={0.3} />
        </mesh>
        <mesh>
          <torusGeometry args={[1.35, 0.025, 12, 128]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.15} />
        </mesh>
      </group>
    </group>
  );
}

/** Foods sliding in a row, e.g. "avoid these, eat these". */
export function FoodRow({ items, color }: { items: number[]; color: string }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    group.current?.children.forEach((child, index) => {
      child.position.y = Math.sin(clock.getElapsedTime() * 1.2 + index) * 0.08;
      child.rotation.y = clock.getElapsedTime() * 0.4 + index;
    });
  });
  return (
    <group ref={group}>
      {items.map((item, index) => {
        const Piece = FOOD_PIECES[item % FOOD_PIECES.length];
        return (
          <group key={index} position={[(index - (items.length - 1) / 2) * 1.2, 0, 0]}>
            <Piece scale={0.75} />
            <mesh position={[0, -0.62, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.38, 0.46, 48]} />
              <meshBasicMaterial color={color} transparent opacity={0.7} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export { Avocado, Blueberry, Broccoli, Carrot, Chili, Leaf, LemonSlice, Tomato };
