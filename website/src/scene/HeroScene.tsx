import { ContactShadows, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { asset } from '../links';
import { CONTACT_SHADOW_RESOLUTION } from '../quality';
import { sinceReveal } from '../motion';
import { Backdrop, BACKDROPS } from './Backdrop';
import { Effects, type Focus } from './Effects';
import { Frame } from './Frame';
import { Lighting } from './Lighting';
import { Phone } from './Phone';
import { Plinth } from './Plinth';
import { Scan } from './Scan';
import type { ScanName } from './scans';


const SCREENS = ['home', 'camera', 'result', 'next', 'explainer'].map((name) => asset(`screens/${name}.jpg`));

/**
 * Glass callouts for each story screen (the hero has none), [label, value]. They sit
 * left of the phone, between it and the copy, so they never run off the right edge.
 */
const CALLOUTS: [string, string][][] = [
  [],
  [
    ['Dishes it knows', '2,250+'],
    ['Works', 'Offline'],
  ],
  [
    ['Gut score', '5 / 10'],
    ['Why', 'Deep-fried'],
  ],
  [
    ['Avoid next', 'More fried food'],
    ['Instead', 'Dal and greens'],
  ],
  [
    ['Narrated in', '22 languages'],
    ['Every meal', '3D explainer'],
  ],
];
const ANCHORS: [number, number, number][] = [
  [-0.74, 0.78, 0.1],
  [-0.74, -0.5, 0.1],
];

/**
 * Food floating around the phone, kept to its sides and behind it so it never
 * crosses the copy. Positions are in phone units (the phone is 3.3 tall).
 */
const FOOD: { name: ScanName; position: [number, number, number]; size: number; spin: number }[] = [
  { name: 'food_pomegranate_01', position: [1.45, 1.0, -0.7], size: 0.62, spin: 0.25 },
  { name: 'food_avocado_01', position: [1.35, -0.9, 0.35], size: 0.72, spin: -0.2 },
  { name: 'food_lime_01', position: [-1.2, 1.5, -1.3], size: 0.5, spin: 0.3 },
  { name: 'food_kiwi_01', position: [-1.1, -1.2, 0.55], size: 0.5, spin: -0.28 },
];

/** Seconds the opening takes: the phone rises onto its plinth while the food drifts in. */
const INTRO = 2.2;
const easeOut = (t: number) => 1 - Math.pow(1 - THREE.MathUtils.clamp(t, 0, 1), 3);

const PLINTH_TOP = -1.65 - 0.1;

const smooth = (from: number, to: number, value: number) => {
  const t = THREE.MathUtils.clamp((value - from) / (to - from), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Photoscanned produce floating around the phone; it drifts in from further out as the page opens. */
function FloatingFood() {
  const pieces = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const arrive = easeOut((sinceReveal() - 0.1) / INTRO);
    pieces.current.forEach((piece, index) => {
      if (!piece) return;
      const { position, spin } = FOOD[index];
      const out = 1 + (1 - arrive) * 1.6;
      piece.position.set(position[0] * out, position[1] * out + Math.sin(time * 0.7 + index * 1.9) * 0.1, position[2] - (1 - arrive) * 2);
      piece.rotation.set(Math.sin(time * 0.3 + index) * 0.35, time * spin + index, Math.sin(time * 0.35 + index) * 0.25);
    });
  });
  return FOOD.map(({ name, size }, index) => (
    <group
      key={name}
      ref={(node) => {
        pieces.current[index] = node;
      }}>
      <Scan name={name} size={size} />
    </group>
  ));
}

/** Glass chips on leader lines; only the current screen's pair is shown. */
function Callouts({ screen }: { screen: { current: number } }) {
  const nodes = useRef<(HTMLDivElement | null)[]>([]);
  useFrame(() => {
    // Checked every frame: the chips mount a frame or two after the scene.
    const index = Math.round(screen.current);
    nodes.current.forEach((node, nodeIndex) => node?.classList.toggle('is-on', Math.floor(nodeIndex / 2) === index));
  });
  return CALLOUTS.flatMap((pair, screenIndex) =>
    pair.map(([label, value], side) => (
      <Html key={`${screenIndex}-${side}`} position={ANCHORS[side]} zIndexRange={[4, 0]}>
        <div
          ref={(node) => {
            nodes.current[screenIndex * 2 + side] = node;
          }}
          className="callout">
          <span className="callout__dot" />
          <span className="callout__line" />
          <span className="callout__chip">
            <small>{label}</small>
            {value}
          </span>
        </div>
      </Html>
    )),
  );
}

/** Maps stage scroll progress to the phone's pose and which screen it shows. */
function Choreography({ progress, compact, focus }: { progress: { current: number }; compact: boolean; focus: THREE.Vector3 }) {
  const stage = useRef<THREE.Group>(null);
  const phone = useRef<THREE.Group>(null);
  const screen = useRef(0);
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock, pointer, camera }, delta) => {
    const p = progress.current;
    const story = smooth(0.08, 0.2, p);
    const time = clock.getElapsedTime();
    const rise = easeOut(sinceReveal() / INTRO);

    // The camera eases in through the story and drifts with the pointer, so the scene has real parallax.
    const dolly = THREE.MathUtils.lerp(7.6, 6.9, story) - (1 - rise) * -1.2;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.x * 0.35, 2.5, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 0.25 + pointer.y * 0.2 + (1 - story) * 0.1, 2.5, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, dolly, 3, delta);
    if (stage.current) look.set(stage.current.position.x * 0.12, 0.05, 0);
    camera.lookAt(look);
    // Hero shows the home screen; the four story steps show screens 1-4.
    screen.current = p < 0.16 ? 0 : 1 + Math.min(3, Math.floor(((p - 0.16) / 0.8) * 4));

    if (stage.current) {
      const x = compact ? 0 : THREE.MathUtils.lerp(1.55, 1.72, story);
      // On phones the stage sits above the copy, and grows once the shorter step copy replaces the hero.
      // On phones the hero copy fills the lower half, so the phone starts higher and a little smaller.
      const y = compact ? THREE.MathUtils.lerp(1.2, 0.7, story) : 0.24;
      const scale = compact ? THREE.MathUtils.lerp(0.4, 0.6, story) : 0.86;
      stage.current.position.x = THREE.MathUtils.damp(stage.current.position.x, x, 4, delta);
      stage.current.position.y = THREE.MathUtils.damp(stage.current.position.y, y, 4, delta);
      stage.current.scale.setScalar(THREE.MathUtils.damp(stage.current.scale.x, scale, 4, delta));
    }
    if (phone.current) {
      const turn = THREE.MathUtils.lerp(-0.42, -0.14, story) + Math.sin(time * 0.5) * 0.05 + pointer.x * 0.1;
      phone.current.position.y = Math.sin(time * 0.9) * 0.04 - (1 - rise) * 1.4;
      phone.current.rotation.y = THREE.MathUtils.damp(phone.current.rotation.y, turn, 4, delta);
      phone.current.rotation.x = THREE.MathUtils.damp(phone.current.rotation.x, 0.06 - pointer.y * 0.05, 4, delta);
      phone.current.getWorldPosition(focus);
    }
  });

  return (
    <group ref={stage}>
      <group ref={phone}>
        <Phone screens={SCREENS} screen={screen} />
        {!compact && <Callouts screen={screen} />}
      </group>
      <group position={[0, PLINTH_TOP, 0]}>
        <Plinth radius={1.25} height={0.32} rim="#D4F25C" />
        <ContactShadows position={[0, -0.33, 0]} opacity={0.55} scale={6} blur={2.6} far={2} color="#010805" resolution={CONTACT_SHADOW_RESOLUTION} />
      </group>
      <FloatingFood />
    </group>
  );
}

export function HeroScene({ progress, compact }: { progress: { current: number }; compact: boolean }) {
  const focus = useMemo<Focus>(() => ({ target: new THREE.Vector3(1.6, 0.2, 0), blur: { current: compact ? 0 : 1.6 } }), [compact]);
  return (
    <Frame className="stage__canvas" camera={[0, 0.25, 8.8]}>
      <Backdrop layers={compact ? BACKDROPS.heroCompact : BACKDROPS.hero} />
      <Suspense fallback={null}>
        <Lighting />
        <Choreography progress={progress} compact={compact} focus={focus.target} />
        <Effects focus={compact ? undefined : focus} bloom={0.7} />
      </Suspense>
    </Frame>
  );
}
