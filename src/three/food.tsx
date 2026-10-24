/**
 * Stylised 3D food, built from primitives so it needs no model files and runs
 * the same on the web (WebGL) and on phones (expo-gl). Each piece is centred
 * on the origin at roughly unit size; position and scale them with a <group>.
 */
import { useMemo } from 'react';
import * as THREE from 'three';

import { PALETTE } from './palette';

type GroupProps = { position?: [number, number, number]; rotation?: [number, number, number]; scale?: number };

/** Glossy skin, e.g. tomato, chili, berry. */
function Gloss({ color, roughness = 0.28 }: { color: string; roughness?: number }) {
  return <meshPhysicalMaterial color={color} roughness={roughness} clearcoat={1} clearcoatRoughness={0.18} />;
}

/** Matte plant surface with a soft sheen, e.g. leaves, broccoli. */
function Plant({ color, roughness = 0.6 }: { color: string; roughness?: number }) {
  return <meshPhysicalMaterial color={color} roughness={roughness} sheen={1} sheenColor="#d8ffd0" sheenRoughness={0.5} side={THREE.DoubleSide} />;
}

export function Tomato(props: GroupProps) {
  return (
    <group {...props}>
      <mesh scale={[1, 0.84, 1]} castShadow>
        <sphereGeometry args={[0.5, 64, 48]} />
        <Gloss color={PALETTE.tomato} />
      </mesh>
      {[0, 1, 2, 3, 4].map((index) => (
        <mesh
          key={index}
          position={[Math.cos((index / 5) * Math.PI * 2) * 0.1, 0.41, Math.sin((index / 5) * Math.PI * 2) * 0.1]}
          rotation={[Math.PI / 2 - 0.25, 0, -(index / 5) * Math.PI * 2 + Math.PI / 2]}
          scale={[1, 1, 0.35]}>
          <coneGeometry args={[0.07, 0.3, 6]} />
          <Plant color={PALETTE.leafDark} />
        </mesh>
      ))}
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.022, 0.03, 0.12, 12]} />
        <Plant color={PALETTE.leafDark} />
      </mesh>
    </group>
  );
}

export function Blueberry(props: GroupProps) {
  return (
    <group {...props}>
      <mesh castShadow>
        <sphereGeometry args={[0.2, 40, 32]} />
        <meshPhysicalMaterial color={PALETTE.berry} roughness={0.55} sheen={0.6} sheenColor="#a9b6ff" />
      </mesh>
      <mesh position={[0, 0.19, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.045, 0.018, 8, 16]} />
        <meshStandardMaterial color="#1e2346" roughness={0.8} />
      </mesh>
    </group>
  );
}

/** A lemon wheel: rind, pith and eight juicy segments, all geometry. */
export function LemonSlice(props: GroupProps) {
  const segments = 8;
  return (
    <group {...props}>
      <mesh castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.1, 64]} />
        <Gloss color={PALETTE.lemon} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.052, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.01, 64]} />
        <meshStandardMaterial color="#FFF8DC" roughness={0.7} />
      </mesh>
      {Array.from({ length: segments }, (_, index) => (
        <mesh key={index} position={[0, 0.058, 0]} rotation={[0, (index / segments) * Math.PI * 2, 0]}>
          <cylinderGeometry args={[0.41, 0.41, 0.012, 24, 1, false, 0.06, (Math.PI * 2) / segments - 0.12]} />
          <meshPhysicalMaterial color={PALETTE.lemonFlesh} roughness={0.25} transmission={0} clearcoat={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/** A curved basil-style leaf. */
export function Leaf({ color = PALETTE.leaf, ...props }: GroupProps & { color?: string }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.5);
    shape.bezierCurveTo(0.34, -0.3, 0.32, 0.25, 0, 0.5);
    shape.bezierCurveTo(-0.32, 0.25, -0.34, -0.3, 0, -0.5);
    const shaped = new THREE.ShapeGeometry(shape, 24);
    // Cup the leaf so it catches light like a real one.
    const position = shaped.attributes.position;
    for (let index = 0; index < position.count; index++) {
      const x = position.getX(index);
      const y = position.getY(index);
      position.setZ(index, x * x * 0.9 - y * y * 0.15);
    }
    shaped.computeVertexNormals();
    return shaped;
  }, []);
  return (
    <group {...props}>
      <mesh geometry={geometry} castShadow>
        <Plant color={color} roughness={0.45} />
      </mesh>
      <mesh position={[0, -0.02, 0.012]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.012, 0.9, 0.006]} />
        <meshStandardMaterial color="#9fd49a" roughness={0.6} />
      </mesh>
    </group>
  );
}

export function Chili(props: GroupProps) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(0.08, 0.15, 0),
      new THREE.Vector3(0.02, -0.2, 0),
      new THREE.Vector3(-0.15, -0.48, 0),
    ]);
    const tube = new THREE.TubeGeometry(curve, 64, 0.1, 20, false);
    // Taper towards the tip.
    const position = tube.attributes.position;
    const point = new THREE.Vector3();
    for (let index = 0; index < position.count; index++) {
      point.fromBufferAttribute(position, index);
      const ring = Math.floor(index / 21) / 64;
      const centre = curve.getPointAt(Math.min(ring, 1));
      const taper = 1 - ring * 0.85;
      point.sub(centre).multiplyScalar(taper).add(centre);
      position.setXYZ(index, point.x, point.y, point.z);
    }
    tube.computeVertexNormals();
    return tube;
  }, []);
  return (
    <group {...props}>
      <mesh geometry={geometry} castShadow>
        <Gloss color={PALETTE.chili} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.03, 0.05, 0.16, 12]} />
        <Plant color={PALETTE.leafDark} />
      </mesh>
    </group>
  );
}

export function Broccoli(props: GroupProps) {
  const florets: [number, number, number, number][] = [
    [0, 0.42, 0, 0.26],
    [0.2, 0.3, 0.05, 0.2],
    [-0.2, 0.3, 0.05, 0.2],
    [0.08, 0.3, -0.2, 0.2],
    [-0.08, 0.32, 0.2, 0.19],
    [0.24, 0.16, -0.12, 0.15],
    [-0.24, 0.16, -0.1, 0.15],
  ];
  return (
    <group {...props}>
      <mesh position={[0, -0.12, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.14, 0.55, 20]} />
        <Plant color="#8CC46A" roughness={0.5} />
      </mesh>
      {florets.map(([x, y, z, radius], index) => (
        <mesh key={index} position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[radius, 2]} />
          <Plant color={index % 2 ? PALETTE.leafDark : '#357E40'} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/** Half an avocado, cut face towards +z. */
export function Avocado(props: GroupProps) {
  const fleshGeometry = useMemo(() => {
    const disc = new THREE.CircleGeometry(0.42, 64);
    disc.scale(1, 1.25, 1);
    // Fade from pale yellow in the middle to green at the edge.
    const colors: number[] = [];
    const position = disc.attributes.position;
    const centre = new THREE.Color(PALETTE.avocadoFlesh);
    const edge = new THREE.Color('#8DBB46');
    for (let index = 0; index < position.count; index++) {
      const distance = Math.min(1, Math.hypot(position.getX(index) / 0.42, position.getY(index) / 0.525));
      const color = centre.clone().lerp(edge, Math.pow(distance, 3));
      colors.push(color.r, color.g, color.b);
    }
    disc.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return disc;
  }, []);
  return (
    <group {...props}>
      <mesh scale={[1, 1.25, 0.8]} rotation={[0, Math.PI, 0]} castShadow>
        <sphereGeometry args={[0.45, 48, 32, 0, Math.PI]} />
        <meshPhysicalMaterial color={PALETTE.avocadoSkin} roughness={0.75} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={fleshGeometry} position={[0, 0, 0.001]}>
        <meshPhysicalMaterial vertexColors roughness={0.4} clearcoat={0.4} />
      </mesh>
      <mesh position={[0, -0.08, 0.02]} scale={[1, 1.1, 0.75]} castShadow>
        <sphereGeometry args={[0.18, 40, 32]} />
        <Gloss color={PALETTE.pit} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function Carrot(props: GroupProps) {
  return (
    <group {...props}>
      <mesh rotation={[Math.PI, 0, 0]} castShadow>
        <coneGeometry args={[0.16, 0.9, 32]} />
        <Gloss color={PALETTE.carrot} roughness={0.45} />
      </mesh>
      {[-0.3, 0, 0.3].map((tilt, index) => (
        <mesh key={index} position={[tilt * 0.12, 0.6, 0]} rotation={[0, 0, tilt]}>
          <coneGeometry args={[0.035, 0.38, 6]} />
          <Plant color={PALETTE.leaf} />
        </mesh>
      ))}
    </group>
  );
}

export const FOOD_PIECES = [Tomato, LemonSlice, Broccoli, Avocado, Blueberry, Chili, Leaf, Carrot] as const;
