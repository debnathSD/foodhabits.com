import { useFrame } from '@react-three/fiber';
import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';

import { deconstructPhase, type Part, type PartKind } from '../lib/deconstruct';
import { seeded } from './scenes';

const MINT = '#57E39A';
const CORAL = '#FF6B5B';
/** The ring the parts spread into, tilted so the ones behind peek over the front. */
const RING_RADIUS = 1.9;
const RING_TILT = 0.2;
/** The whole dish is a little flatter than a ball. */
const FLATTEN = 0.78;

type Finish = 'gloss' | 'matte' | 'clear';
type Shape = 'sphere' | 'granule' | 'crystal' | 'cube' | 'capsule' | 'tetra';
type Look =
  | { shape: 'strands' | 'coils'; color: string }
  | { shape: Shape; color: string | string[]; count: number; size: [number, number]; finish: Finish };

/** How each part looks at micro scale. */
const LOOKS: Record<PartKind, Look> = {
  fiber: { shape: 'strands', color: '#A7D46A' },
  protein: { shape: 'coils', color: '#E59A82' },
  probiotics: { shape: 'capsule', color: '#7BE3A8', count: 16, size: [0.1, 0.14], finish: 'gloss' },
  goodFats: { shape: 'sphere', color: '#F5C84C', count: 12, size: [0.07, 0.14], finish: 'gloss' },
  vitamins: {
    shape: 'sphere',
    color: ['#FF7A59', '#FFC94A', '#7FD1AE', '#B07CFF', '#FF5E8A'],
    count: 22,
    size: [0.05, 0.08],
    finish: 'gloss',
  },
  water: { shape: 'sphere', color: '#7CC8FF', count: 16, size: [0.06, 0.12], finish: 'clear' },
  oil: { shape: 'sphere', color: '#E3A12F', count: 16, size: [0.06, 0.15], finish: 'gloss' },
  starch: { shape: 'granule', color: '#F3E6C6', count: 44, size: [0.05, 0.085], finish: 'matte' },
  sugar: { shape: 'crystal', color: '#FFFFFF', count: 26, size: [0.06, 0.09], finish: 'clear' },
  salt: { shape: 'cube', color: '#F1F4F6', count: 22, size: [0.05, 0.08], finish: 'matte' },
  satFat: { shape: 'granule', color: '#F3E7C2', count: 14, size: [0.08, 0.13], finish: 'matte' },
  additives: { shape: 'tetra', color: ['#B983FF', '#FF6FB5', '#6FD3FF'], count: 16, size: [0.06, 0.09], finish: 'gloss' },
  alcohol: { shape: 'sphere', color: '#E3F5FF', count: 20, size: [0.04, 0.11], finish: 'clear' },
};

function makeMaterial(finish: Finish, color: string) {
  if (finish === 'clear') {
    return new THREE.MeshPhysicalMaterial({ color, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.6 });
  }
  if (finish === 'matte') return new THREE.MeshPhysicalMaterial({ color, roughness: 0.75 });
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 });
}

function makeGeometry(shape: Shape): THREE.BufferGeometry {
  switch (shape) {
    case 'sphere':
      return new THREE.SphereGeometry(1, 24, 16);
    case 'granule':
      return new THREE.SphereGeometry(1, 20, 14).scale(1, 0.72, 0.84);
    case 'crystal':
      return new THREE.BoxGeometry(1, 0.62, 0.8);
    case 'cube':
      return new THREE.BoxGeometry(1, 1, 1);
    case 'capsule':
      return new THREE.CapsuleGeometry(0.4, 1.1, 6, 14);
    case 'tetra':
      return new THREE.TetrahedronGeometry(1);
  }
}

/** Many small pieces packed into a ball: granules, droplets, crystals or microbes. */
function Particles({ look, amount, material, seed }: { look: Extract<Look, { count: number }>; amount: number; material: THREE.Material; seed: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = Math.max(4, Math.round(look.count * (0.6 + 0.4 * amount)));
  const geometry = useMemo(() => makeGeometry(look.shape), [look.shape]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useLayoutEffect(() => {
    const node = mesh.current;
    if (!node) return;
    const random = seeded(seed);
    const dummy = new THREE.Object3D();
    const colors = Array.isArray(look.color) ? look.color.map((color) => new THREE.Color(color)) : null;
    const [min, max] = look.size;
    for (let index = 0; index < count; index++) {
      // A point inside a ball, denser towards the middle.
      const radius = 0.42 * Math.cbrt(random());
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      dummy.position.set(radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi) * 0.85, radius * Math.sin(phi) * Math.sin(theta));
      dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
      dummy.scale.setScalar(min + random() * (max - min));
      dummy.updateMatrix();
      node.setMatrixAt(index, dummy.matrix);
      if (colors) node.setColorAt(index, colors[index % colors.length]);
    }
    node.instanceMatrix.needsUpdate = true;
    if (node.instanceColor) node.instanceColor.needsUpdate = true;
  }, [count, look, seed]);

  return <instancedMesh ref={mesh} args={[geometry, material, count]} castShadow />;
}

/** Plant fibre at micro scale: a twisted bundle of strands with fine fibrils around it. */
function Strands({ material }: { material: THREE.Material }) {
  const geometries = useMemo(() => {
    const random = seeded(5);
    const strand = (radius: number, thickness: number, twist: number, offset: number, wobble: number) => {
      const points = Array.from({ length: 28 }, (_, step) => {
        const y = -0.52 + (step / 27) * 1.04;
        const angle = offset + y * twist * Math.PI;
        return new THREE.Vector3(
          Math.cos(angle) * radius + Math.sin(y * 6 + offset) * wobble,
          y,
          Math.sin(angle) * radius + Math.cos(y * 5 + offset) * wobble,
        );
      });
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 96, thickness, 10, false);
    };
    const main = Array.from({ length: 9 }, (_, index) =>
      strand(0.05 + random() * 0.11, 0.02 + random() * 0.01, 1.6 + random() * 0.6, (index / 9) * Math.PI * 2, 0.015),
    );
    const fibrils = Array.from({ length: 16 }, (_, index) =>
      strand(0.18 + random() * 0.14, 0.005 + random() * 0.003, 1 + random() * 1.2, (index / 16) * Math.PI * 2, 0.05),
    );
    return [...main, ...fibrils];
  }, []);
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);
  return (
    <group rotation={[0.35, 0, 0.55]}>
      {geometries.map((geometry, index) => (
        <mesh key={index} geometry={geometry} material={material} castShadow />
      ))}
    </group>
  );
}

/** Protein at micro scale: folded chains coiled into helices. */
function Coils({ material }: { material: THREE.Material }) {
  const geometries = useMemo(
    () =>
      [0, 1, 2].map((index) => {
        const points = Array.from({ length: 160 }, (_, step) => {
          const s = step / 159;
          const angle = s * Math.PI * 2 * 7;
          // A helix wound around a gently bent backbone.
          const backbone = new THREE.Vector3(Math.sin(s * Math.PI + index) * 0.18, -0.42 + s * 0.84, Math.cos(s * 2 + index) * 0.1);
          return backbone.add(new THREE.Vector3(Math.cos(angle) * 0.07, 0, Math.sin(angle) * 0.07));
        });
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 360, 0.022, 10, false);
      }),
    [],
  );
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);
  return (
    <group>
      {geometries.map((geometry, index) => (
        <mesh
          key={index}
          geometry={geometry}
          material={material}
          position={[(index - 1) * 0.2, 0, (index % 2) * 0.12]}
          rotation={[0, index * 2.1, (index - 1) * 0.4]}
          castShadow
        />
      ))}
    </group>
  );
}

/** Gentle lumps with a fine blistered crust, the same on both halves so they close without a seam. */
function lump(x: number, y: number, z: number) {
  return (
    1 +
    0.05 * Math.sin(3.1 * x + 1.7 * y) * Math.sin(2.3 * z + 0.9 * x) +
    0.025 * Math.sin(7.3 * x) * Math.sin(6.1 * y + 1) * Math.sin(5.7 * z) +
    0.012 * Math.sin(19 * x + 2) * Math.sin(17 * y) * Math.sin(21 * z + 1)
  );
}

/** Browning: darker where the crust blisters, lighter in the hollows. */
function browning(x: number, y: number, z: number) {
  // Mixed, off-axis frequencies, so the browning never lines up into a grid.
  const blisters = Math.sin(11 * x + 5.3 * y + 1) * Math.sin(9.7 * y - 6.1 * z + 2) * Math.sin(12.3 * z + 4.4 * x);
  const patches = Math.sin(4.3 * x - 2.1 * z + 0.4 * y) * Math.sin(3.7 * y + 1.9 * x + 0.6);
  return 1 - Math.max(0, blisters) * 0.35 - Math.max(0, patches) * 0.18;
}

/** Crumb: a pale inside with scattered darker pores. */
function crumb(y: number, z: number) {
  const pores = Math.sin(23 * y + 1) * Math.sin(29 * z + 2) + Math.sin(31 * y - 7 * z);
  return pores > 1.2 ? 0.72 : 0.94 + 0.06 * Math.sin(13 * y) * Math.sin(11 * z);
}

/**
 * One half of the whole dish (split along x) in the crust colour, and the cut
 * face showing its crumb. Colours are baked into the vertices.
 */
function halfGeometries(side: 1 | -1, color: string) {
  const crust = new THREE.Color(color);
  const inside = crust.clone().lerp(new THREE.Color('#F7E9CC'), 0.62);
  const tint = new THREE.Color();

  const shell = new THREE.SphereGeometry(1, 160, 112, side > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI);
  const position = shell.attributes.position;
  const shellColors: number[] = [];
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const radius = lump(x, y, z);
    position.setXYZ(index, x * radius, y * radius * FLATTEN, z * radius);
    tint.copy(crust).multiplyScalar(browning(x, y, z));
    shellColors.push(tint.r, tint.g, tint.b);
  }
  shell.setAttribute('color', new THREE.Float32BufferAttribute(shellColors, 3));
  shell.computeVertexNormals();

  // The cut face: rings out to the lumpy edge, so the crumb can carry detail.
  const segments = 128;
  const rings = 28;
  const vertices = [0, 0, 0];
  const normals = [-side, 0, 0];
  const colors = [inside.r, inside.g, inside.b];
  const indices: number[] = [];
  for (let ring = 1; ring <= rings; ring++) {
    for (let step = 0; step < segments; step++) {
      const angle = (step / segments) * Math.PI * 2;
      const edge = lump(0, Math.cos(angle), Math.sin(angle)) * 0.99;
      const reach = (ring / rings) * edge;
      const y = Math.cos(angle) * reach * FLATTEN;
      const z = Math.sin(angle) * reach;
      vertices.push(0, y, z);
      normals.push(-side, 0, 0);
      // A thin baked rim just inside the crust.
      tint.copy(ring === rings ? crust : inside).multiplyScalar(ring === rings ? 0.9 : crumb(y, z));
      colors.push(tint.r, tint.g, tint.b);
      const current = 1 + (ring - 1) * segments + step;
      const next = 1 + (ring - 1) * segments + ((step + 1) % segments);
      if (ring === 1) indices.push(0, current, next);
      else {
        const below = current - segments;
        const belowNext = next - segments;
        indices.push(below, current, next, below, next, belowNext);
      }
    }
  }
  const cap = new THREE.BufferGeometry();
  cap.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  cap.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  cap.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  cap.setIndex(indices);
  return { shell, cap };
}

const BEAM_VERTEX = `
varying vec2 vUv;
varying float vFacing;
void main() {
  vUv = uv;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vFacing = abs(dot(normalize(normalMatrix * normal), normalize(-view.xyz)));
  gl_Position = projectionMatrix * view;
}`;
const BEAM_FRAGMENT = `
uniform vec3 color;
uniform float opacity;
varying vec2 vUv;
varying float vFacing;
void main() {
  float alpha = opacity * pow(vFacing, 2.0) * mix(0.08, 0.9, vUv.y);
  gl_FragColor = vec4(color, alpha);
}`;
const POOL_FRAGMENT = `
uniform vec3 color;
uniform float opacity;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float alpha = opacity * pow(max(0.0, 1.0 - d), 2.0);
  gl_FragColor = vec4(color, alpha);
}`;
const POOL_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

function glowMaterial(vertexShader: string, fragmentShader: string) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(MINT) }, opacity: { value: 0 } },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

/** A whole crusted bite in `color`, closed: the default dish, also usable as part of a custom whole. */
export function Bite({ color = '#C9A46A', ...props }: { color?: string; position?: [number, number, number]; rotation?: [number, number, number]; scale?: number | [number, number, number] }) {
  const halves = useMemo(() => ({ left: halfGeometries(-1, color), right: halfGeometries(1, color) }), [color]);
  const material = useMemo(
    () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.28 }),
    [],
  );
  useEffect(
    () => () => {
      [halves.left, halves.right].forEach(({ shell, cap }) => {
        shell.dispose();
        cap.dispose();
      });
    },
    [halves],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <group {...props}>
      <mesh geometry={halves.left.shell} material={material} castShadow receiveShadow />
      <mesh geometry={halves.right.shell} material={material} castShadow receiveShadow />
    </group>
  );
}

/** How many glowing specks a custom whole dish breaks into. */
const DUST = 2600;
const EDGE = '#D4F25C';

/** Value noise, written the same way in JS and GLSL so the specks leave the surface exactly where it burns away. */
function dHash(x: number, y: number, z: number) {
  const fx = ((x * 0.3183099 + 0.1) % 1 + 1) % 1 * 17;
  const fy = ((y * 0.3183099 + 0.1) % 1 + 1) % 1 * 17;
  const fz = ((z * 0.3183099 + 0.1) % 1 + 1) % 1 * 17;
  const value = fx * fy * fz * (fx + fy + fz);
  return value - Math.floor(value);
}
function dNoise(x: number, y: number, z: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const ease = (t: number) => t * t * (3 - 2 * t);
  const fx = ease(x - ix);
  const fy = ease(y - iy);
  const fz = ease(z - iz);
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  const corner = (dx: number, dy: number, dz: number) => dHash(ix + dx, iy + dy, iz + dz);
  return mix(
    mix(mix(corner(0, 0, 0), corner(1, 0, 0), fx), mix(corner(0, 1, 0), corner(1, 1, 0), fx), fy),
    mix(mix(corner(0, 0, 1), corner(1, 0, 1), fx), mix(corner(0, 1, 1), corner(1, 1, 1), fx), fy),
    fz,
  );
}
/** 0-1: when each point of the whole dish burns away (lower goes first). */
function dissolveField(x: number, y: number, z: number) {
  const n = 0.65 * dNoise(x * 2.2, y * 2.2, z * 2.2) + 0.35 * dNoise(x * 5.5, y * 5.5, z * 5.5);
  return Math.min(1, Math.max(0, (n - 0.2) / 0.6));
}
const DISSOLVE_GLSL = `
uniform float uDissolve;
uniform vec3 uEdge;
varying vec3 vWholePos;
float dHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1) * 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float dNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(dHash(i), dHash(i + vec3(1, 0, 0)), f.x), mix(dHash(i + vec3(0, 1, 0)), dHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(dHash(i + vec3(0, 0, 1)), dHash(i + vec3(1, 0, 1)), f.x), mix(dHash(i + vec3(0, 1, 1)), dHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float dField(vec3 p) {
  return clamp((0.65 * dNoise(p * 2.2) + 0.35 * dNoise(p * 5.5) - 0.2) / 0.6, 0.0, 1.0);
}
`;

type DissolveUniforms = { dissolve: { value: number }; edge: { value: THREE.Color } };

/** A copy of `material` that burns away with a glowing edge as `uDissolve` rises from 0 to 1. */
function dissolving(material: THREE.Material, uniforms: DissolveUniforms, toWhole: THREE.Matrix4) {
  const patched = material.clone();
  patched.side = THREE.DoubleSide;
  patched.onBeforeCompile = (shader) => {
    shader.uniforms.uDissolve = uniforms.dissolve;
    shader.uniforms.uEdge = uniforms.edge;
    shader.uniforms.uToWhole = { value: toWhole };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uToWhole;\nvarying vec3 vWholePos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWholePos = (uToWhole * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${DISSOLVE_GLSL}`)
      .replace(
        '#include <clipping_planes_fragment>',
        '#include <clipping_planes_fragment>\nfloat dissolveAt = dField(vWholePos);\nif (dissolveAt < uDissolve) discard;',
      )
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uEdge * smoothstep(uDissolve + 0.07, uDissolve, dissolveAt) * step(0.001, uDissolve) * 4.0;',
      );
  };
  patched.customProgramCacheKey = () => 'foodhabits-dissolve';
  return patched;
}

/** Per-speck data for the dust a custom whole dish breaks into, built once it has loaded. */
type Dust = {
  start: Float32Array;
  normal: Float32Array;
  offset: Float32Array;
  swirl: Float32Array;
  part: Uint8Array;
  threshold: Float32Array;
  size: Float32Array;
};

/**
 * The take-apart scene. `progress` (0-1, read every frame) runs the sequence:
 * the whole dish splits open, its parts spread into a ring at micro scale, a
 * spotlight visits each (mint for good, coral for bad), and it all comes back
 * together. `label` can add something (an HTML tag on the web) above each part.
 *
 * By default the dish is a crusted bite that splits open. Pass `whole` (any
 * meshes, such as a photoscan) to have it burn away into glowing specks that
 * stream into the parts, and re-form from them at the end.
 */
export function Deconstruct({
  parts,
  progress,
  color = '#C9A46A',
  label,
  whole: custom,
  time,
}: {
  parts: Part[];
  progress: { current: number };
  color?: string;
  label?: (index: number) => ReactNode;
  whole?: ReactNode;
  /**
   * Seconds to animate by, instead of the render clock. With it every frame is
   * a pure function of `progress` and `time`, so video renders repeat exactly.
   */
  time?: { current: number };
}) {
  const root = useRef<THREE.Group>(null);
  const whole = useRef<THREE.Group>(null);
  const dustMesh = useRef<THREE.InstancedMesh>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Group>(null);
  const clusters = useRef<(THREE.Group | null)[]>([]);
  const spot = useRef<THREE.SpotLight>(null);
  const count = parts.length;
  const step = (Math.PI * 2) / Math.max(count, 1);

  const halves = useMemo(() => ({ left: halfGeometries(-1, color), right: halfGeometries(1, color) }), [color]);
  const shellMaterial = useMemo(
    () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.28 }),
    [],
  );
  const capMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }), []);
  const materials = useMemo(
    () =>
      parts.map((part) => {
        const look = LOOKS[part.kind];
        const finish = 'finish' in look ? look.finish : 'gloss';
        const base = Array.isArray(look.color) ? '#ffffff' : look.color;
        const material = makeMaterial(finish, base);
        material.emissive = new THREE.Color(part.good ? MINT : CORAL);
        material.emissiveIntensity = 0;
        return material;
      }),
    [parts],
  );
  const dustGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const dustMaterial = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const beam = useMemo(() => glowMaterial(BEAM_VERTEX, BEAM_FRAGMENT), []);
  const pool = useMemo(() => glowMaterial(POOL_VERTEX, POOL_FRAGMENT), []);
  const target = useMemo(() => new THREE.Object3D(), []);
  // Objects the frame loop changes are reached through refs.
  const beamMesh = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  const poolMesh = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  const live = useRef({
    materials: [] as THREE.MeshPhysicalMaterial[],
    light: new THREE.Color(MINT),
    wanted: new THREE.Color(),
    dust: null as Dust | null,
    uniforms: { dissolve: { value: 0 }, edge: { value: new THREE.Color(EDGE).multiplyScalar(1.4) } } as DissolveUniforms,
    matrix: new THREE.Matrix4(),
  });
  useEffect(() => {
    live.current.materials = materials;
  }, [materials]);

  useEffect(
    () => () => {
      [halves.left, halves.right].forEach(({ shell, cap }) => {
        shell.dispose();
        cap.dispose();
      });
    },
    [halves],
  );
  useEffect(
    () => () => [shellMaterial, capMaterial, dustMaterial, beam, pool].forEach((material) => material.dispose()),
    [shellMaterial, capMaterial, dustMaterial, beam, pool],
  );
  useEffect(() => () => dustGeometry.dispose(), [dustGeometry]);
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);

  // The spotlight's spot: the front of the tilted ring.
  const focusY = -Math.sin(RING_TILT) * RING_RADIUS;
  const focusZ = Math.cos(RING_TILT) * RING_RADIUS;
  const lightHeight = 3.3;

  /** Once the custom whole has loaded: make its materials burnable and scatter specks over its surface. */
  function initDust() {
    const group = whole.current;
    const state = live.current;
    if (!group || !root.current) return;
    const meshes: THREE.Mesh[] = [];
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
    });
    if (!meshes.length) return;
    root.current.updateWorldMatrix(true, true);
    const toGroup = new THREE.Matrix4().copy(group.matrixWorld).invert();
    const random = seeded(99);
    const totalWeight = parts.reduce((sum, part) => sum + 0.5 + part.amount, 0);
    const dust: Dust = {
      start: new Float32Array(DUST * 3),
      normal: new Float32Array(DUST * 3),
      offset: new Float32Array(DUST * 3),
      swirl: new Float32Array(DUST * 3),
      part: new Uint8Array(DUST),
      threshold: new Float32Array(DUST),
      size: new Float32Array(DUST),
    };
    const point = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const color = new THREE.Color();
    const samplers = meshes.map((mesh) => {
      const toWhole = new THREE.Matrix4().multiplyMatrices(toGroup, mesh.matrixWorld);
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((material) => dissolving(material, state.uniforms, toWhole))
        : dissolving(mesh.material, state.uniforms, toWhole);
      return { sampler: new MeshSurfaceSampler(mesh).build(), toWhole, normalMatrix: new THREE.Matrix3().getNormalMatrix(toWhole) };
    });
    for (let index = 0; index < DUST; index++) {
      const { sampler, toWhole, normalMatrix } = samplers[index % samplers.length];
      sampler.sample(point, normal);
      point.applyMatrix4(toWhole);
      normal.applyMatrix3(normalMatrix).normalize();
      dust.start.set([point.x, point.y, point.z], index * 3);
      dust.normal.set([normal.x, normal.y, normal.z], index * 3);
      dust.threshold[index] = dissolveField(point.x, point.y, point.z);
      // Share the specks out by how much of each part there is.
      let pick = random() * totalWeight;
      let part = 0;
      while (part < parts.length - 1 && (pick -= 0.5 + parts[part].amount) > 0) part++;
      dust.part[index] = part;
      const radius = 0.38 * Math.cbrt(random());
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      dust.offset.set([radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta)], index * 3);
      dust.swirl.set([random() - 0.5, random() * 0.6, random() - 0.5], index * 3);
      dust.size[index] = 0.011 + random() * 0.014;
      const look = LOOKS[parts[part].kind];
      color.set(Array.isArray(look.color) ? look.color[index % look.color.length] : look.color).multiplyScalar(1.5);
      dustMesh.current?.setColorAt(index, color);
    }
    if (dustMesh.current?.instanceColor) dustMesh.current.instanceColor.needsUpdate = true;
    state.dust = dust;
  }

  /** Burns the whole dish away (or back) and moves each speck between its surface and its part. */
  function updateDust(phase: ReturnType<typeof deconstructPhase>) {
    const state = live.current;
    if (!state.dust) initDust();
    const dust = state.dust;
    const mesh = dustMesh.current;
    if (!dust || !mesh || !whole.current || !ring.current) return;
    const burn = phase.split * 1.06;
    state.uniforms.dissolve.value = burn;
    const travel = phase.spread * phase.spread * (3 - 2 * phase.spread);
    const spin = whole.current.rotation.y;
    const spinCos = Math.cos(spin);
    const spinSin = Math.sin(spin);
    const ringAngle = ring.current.rotation.y;
    const tiltCos = Math.cos(RING_TILT);
    const tiltSin = Math.sin(RING_TILT);
    const matrix = state.matrix;
    for (let index = 0; index < DUST; index++) {
      const released = (burn - dust.threshold[index]) / 0.12;
      if (released <= 0) {
        matrix.makeScale(0, 0, 0);
        mesh.setMatrixAt(index, matrix);
        continue;
      }
      const burst = Math.min(1, released);
      const i3 = index * 3;
      // From the surface (turning with the dish), pushed out a little as it burns...
      const lx = dust.start[i3] + dust.normal[i3] * 0.22 * burst;
      const ly = dust.start[i3 + 1] + dust.normal[i3 + 1] * 0.22 * burst;
      const lz = dust.start[i3 + 2] + dust.normal[i3 + 2] * 0.22 * burst;
      const sx = lx * spinCos + lz * spinSin;
      const sz = -lx * spinSin + lz * spinCos;
      // ...to a spot in its part's cluster on the turning, tilted ring.
      const angle = dust.part[index] * step + ringAngle;
      const cx = Math.sin(angle) * RING_RADIUS + dust.offset[i3];
      const cy = dust.offset[i3 + 1];
      const cz = Math.cos(angle) * RING_RADIUS + dust.offset[i3 + 2];
      const ex = cx;
      const ey = cy * tiltCos - cz * tiltSin;
      const ez = cy * tiltSin + cz * tiltCos;
      const arc = Math.sin(Math.PI * travel) * 0.9;
      const x = sx + (ex - sx) * travel + dust.swirl[i3] * arc;
      const y = ly + (ey - ly) * travel + dust.swirl[i3 + 1] * arc;
      const z = sz + (ez - sz) * travel + dust.swirl[i3 + 2] * arc;
      const scale = dust.size[index] * burst * (1 - THREE.MathUtils.smoothstep(travel, 0.8, 1));
      matrix.makeScale(scale, scale, scale).setPosition(x, y, z);
      mesh.setMatrixAt(index, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  useFrame(({ clock }, frameDelta) => {
    const fixed = time !== undefined;
    const now = fixed ? time.current : clock.getElapsedTime();
    const delta = fixed ? 1 : frameDelta;
    // Live, values ease towards their targets; on a fixed clock they land exactly.
    const settle = (current: number, target: number, lambda: number) => (fixed ? target : THREE.MathUtils.damp(current, target, lambda, delta));
    const phase = deconstructPhase(progress.current, count);

    if (whole.current) {
      // Turn slowly while whole; square up to the viewer to open.
      const rotation = whole.current.rotation;
      if (fixed) {
        const spin = now * 0.35;
        rotation.y = THREE.MathUtils.lerp(spin, Math.round(spin / (Math.PI * 2)) * Math.PI * 2, phase.split);
      } else if (phase.split > 0.02) rotation.y = settle(rotation.y, Math.round(rotation.y / (Math.PI * 2)) * Math.PI * 2, 4);
      else rotation.y += delta * 0.35;
    }
    // The halves part, then shrink away entirely while the parts are out.
    if (custom) {
      updateDust(phase);
    }
    const apart = 0.12 + phase.split * 0.75 + phase.spread * 0.5;
    const shrink = Math.max(0.001, 1 - phase.spread);
    [left.current, right.current].forEach((half, index) => {
      if (!half) return;
      const side = index === 0 ? -1 : 1;
      half.position.x = side * apart * phase.split;
      // Each half swings its cut face towards the viewer.
      half.rotation.y = side * 0.7 * phase.split;
      half.scale.setScalar(shrink);
    });

    if (ring.current) ring.current.rotation.y = settle(ring.current.rotation.y, -phase.turn * step, 6);
    clusters.current.forEach((node, index) => {
      if (!node) return;
      const angle = index * step;
      const radius = RING_RADIUS * phase.spread;
      node.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
      const focused = index === phase.focus;
      // With dust, each part takes shape as its specks arrive.
      const grown = custom ? THREE.MathUtils.smoothstep(phase.spread, 0.55, 1) : phase.spread;
      const size = grown * (focused ? 1 + 0.65 * phase.light : phase.focus >= 0 ? 0.72 : 1);
      node.scale.setScalar(settle(node.scale.x, Math.max(0.001, size), 6));
      node.rotation.y = now * 0.35 + index;
      const material = live.current.materials[index];
      if (material) material.emissiveIntensity = focused ? 0.28 * phase.light : 0;
    });

    const part = parts[phase.focus];
    const { light, wanted } = live.current;
    wanted.set(part ? (part.good ? MINT : CORAL) : MINT);
    if (fixed) light.copy(wanted);
    else light.lerp(wanted, 1 - Math.exp(-8 * delta));
    if (spot.current) {
      spot.current.color.copy(light);
      spot.current.intensity = 70 * phase.light;
    }
    const beamUniforms = beamMesh.current?.material.uniforms;
    if (beamUniforms) {
      beamUniforms.color.value.copy(light);
      beamUniforms.opacity.value = 0.42 * phase.light;
    }
    const poolUniforms = poolMesh.current?.material.uniforms;
    if (poolUniforms) {
      poolUniforms.color.value.copy(light);
      poolUniforms.opacity.value = 0.75 * phase.light;
    }
  });

  return (
    <group ref={root}>
      <group ref={whole}>
        {custom ?? (
          <>
            <group ref={left}>
              <mesh geometry={halves.left.shell} material={shellMaterial} castShadow />
              <mesh geometry={halves.left.cap} material={capMaterial} />
            </group>
            <group ref={right}>
              <mesh geometry={halves.right.shell} material={shellMaterial} castShadow />
              <mesh geometry={halves.right.cap} material={capMaterial} />
            </group>
          </>
        )}
      </group>
      {custom && <instancedMesh ref={dustMesh} args={[dustGeometry, dustMaterial, DUST]} frustumCulled={false} />}

      <group rotation={[RING_TILT, 0, 0]}>
        <group ref={ring}>
          {parts.map((part, index) => {
            const look = LOOKS[part.kind];
            return (
              <group
                key={`${part.kind}-${index}`}
                scale={0.001}
                ref={(node) => {
                  clusters.current[index] = node;
                }}>
                {'count' in look ? (
                  <Particles look={look} amount={part.amount} material={materials[index]} seed={index * 31 + 7} />
                ) : look.shape === 'strands' ? (
                  <Strands material={materials[index]} />
                ) : (
                  <Coils material={materials[index]} />
                )}
                {label?.(index)}
              </group>
            );
          })}
        </group>
      </group>

      {/* The spotlight, its visible beam and the pool of light it throws. */}
      <primitive object={target} position={[0, focusY, focusZ]} />
      <spotLight ref={spot} position={[0, lightHeight, focusZ + 0.3]} target={target} angle={0.34} penumbra={0.7} intensity={0} distance={9} castShadow />
      <mesh ref={beamMesh} position={[0, (lightHeight + focusY) / 2, focusZ]} material={beam} renderOrder={10}>
        <coneGeometry args={[0.85, lightHeight - focusY, 64, 1, true]} />
      </mesh>
      <mesh ref={poolMesh} position={[0, focusY - 0.62, focusZ]} rotation={[-Math.PI / 2, 0, 0]} material={pool} renderOrder={9}>
        <circleGeometry args={[1.25, 64]} />
      </mesh>
    </group>
  );
}
