import { ContactShadows, PresentationControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { GutScene, SaladBowl } from '@three/scenes';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { Backdrop, BACKDROPS } from './Backdrop';
import { Effects, type Focus } from './Effects';
import { Frame } from './Frame';
import { Lighting } from './Lighting';
import { Phone } from './Phone';
import { asset } from '../links';
import { CONTACT_SHADOW_RESOLUTION } from '../quality';
import { Plinth } from './Plinth';
import { Scan } from './Scan';
import type { ScanName } from './scans';

/** The gut with its microbes; `health` 0-1 sets the friendly share. */
export function GutCanvas({ health }: { health: number }) {
  return (
    <Frame className="gut__canvas" camera={[0, 0.2, 7.2]}>
      <Backdrop layers={BACKDROPS.gut} />
      <Lighting warm />
      <GutStage health={health} />
      <Effects bloom={0.5} />
    </Frame>
  );
}

/** The gut across the right two-thirds on wide screens, above the copy on phones. */
function GutStage({ health }: { health: number }) {
  const compact = useThree((state) => state.size.width < 860);
  return (
    <PresentationControls global={false} snap polar={[-0.3, 0.3]} azimuth={[-0.6, 0.6]}>
      <group position={compact ? [0, 1.1, 0] : [1.5, 0, 0]} rotation={[0.2, -0.3, 0]} scale={compact ? 0.5 : 0.86}>
        <GutScene health={health} />
      </group>
    </PresentationControls>
  );
}

/** Photoscanned ingredients hanging above the bowl in an exploded view, bobbing gently. */
const LIFTED: { name: ScanName; position: [number, number, number]; size: number }[] = [
  { name: 'food_lime_01', position: [-0.7, 1.0, 0.3], size: 0.42 },
  { name: 'food_pomegranate_01', position: [0.65, 1.25, -0.1], size: 0.55 },
  { name: 'food_kiwi_01', position: [-0.15, 1.65, 0.35], size: 0.42 },
  { name: 'food_avocado_01', position: [-0.95, 1.85, -0.35], size: 0.62 },
  { name: 'food_ginger_01', position: [0.35, 2.15, -0.25], size: 0.5 },
  { name: 'food_apple_01', position: [1.05, 1.95, 0.1], size: 0.45 },
];

function Lifted() {
  const pieces = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    pieces.current.forEach((piece, index) => {
      if (!piece) return;
      piece.position.y = LIFTED[index].position[1] + Math.sin(time * 0.8 + index * 1.3) * 0.07;
      piece.rotation.y = time * 0.3 + index;
      piece.rotation.z = Math.sin(time * 0.5 + index) * 0.3;
    });
  });
  return LIFTED.map(({ name, position, size }, index) => (
    <group
      key={name}
      position={position}
      ref={(node) => {
        pieces.current[index] = node;
      }}>
      <Scan name={name} size={size} />
    </group>
  ));
}

/** The gut-friendly bowl on a dark plinth under a warm key light, its ingredients lifting out. */
export function PlateCanvas() {
  return (
    <Frame className="plate__art" camera={[0, 1.6, 7.6]}>
      <Lighting warm />
      <group position={[0, -0.95, 0]}>
        <group position={[0, 0.42, 0]}>
          <SaladBowl spin={0.12} />
        </group>
        <Lifted />
        <Plinth radius={1.5} height={0.5} color="#221b14" rim="#F2B24C" />
        <ContactShadows position={[0, 0.01, 0]} opacity={0.6} scale={4} blur={2} far={1.2} color="#000000" resolution={CONTACT_SHADOW_RESOLUTION} />
      </group>
      <Effects bloom={0} vignette={false} />
    </Frame>
  );
}

/** The closing shot: the phone on its lit plinth. */
export function FinaleCanvas() {
  const compact = useThree((state) => state.size.width < 860);
  const phone = useRef<THREE.Group>(null);
  const screen = useRef(0);
  useFrame(({ clock, pointer }, delta) => {
    if (!phone.current) return;
    const time = clock.getElapsedTime();
    phone.current.position.y = Math.sin(time * 0.9) * 0.04;
    phone.current.rotation.y = THREE.MathUtils.damp(phone.current.rotation.y, -0.3 + Math.sin(time * 0.4) * 0.12 + pointer.x * 0.12, 3, delta);
  });
  return (
    <>
      <Lighting />
      <group position={compact ? [0, -1.25, 0] : [1.75, 0.3, 0]} scale={compact ? 0.5 : 0.88}>
        <group ref={phone}>
          <Phone screens={[asset('screens/home.jpg')]} screen={screen} />
        </group>
        <group position={[0, -1.75, 0]}>
          <Plinth radius={1.25} height={0.32} rim="#D4F25C" />
          <ContactShadows position={[0, -0.33, 0]} opacity={0.55} scale={6} blur={2.6} far={2} color="#010805" resolution={CONTACT_SHADOW_RESOLUTION} />
        </group>
        <Scan name="food_pomegranate_01" size={0.6} position={[1.4, 0.95, -0.7]} rotation={[0.3, 0.8, 0.1]} />
        <Scan name="food_lime_01" size={0.48} position={[-1.25, -0.85, 0.45]} rotation={[0.5, -0.4, 0.2]} />
      </group>
    </>
  );
}

export function FinaleScene() {
  const focus = useMemo<Focus>(() => ({ target: new THREE.Vector3(0, 0.3, 0), blur: { current: 1.4 } }), []);
  return (
    <Frame className="finale__art" camera={[0, 0.2, 7.6]}>
      <Backdrop layers={BACKDROPS.finale} />
      <FinaleCanvas />
      <Effects focus={focus} bloom={0.7} />
    </Frame>
  );
}
