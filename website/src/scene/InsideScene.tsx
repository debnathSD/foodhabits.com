import { ContactShadows, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { deconstructPhase } from '@lib/deconstruct';
import { Deconstruct } from '@three/deconstruct';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { CONTACT_SHADOW_RESOLUTION } from '../quality';
import { PARTS } from '../sections/inside-parts';
import { Backdrop, BACKDROPS } from './Backdrop';
import { CholeBhature } from './CholeBhature';
import { Effects, type Focus } from './Effects';
import { Frame } from './Frame';
import { Lighting } from './Lighting';


/** The front of the deconstruct ring, where the spotlight lands (matches the shared scene). */
const SPOT = new THREE.Vector3(0, -Math.sin(0.2) * 1.9, Math.cos(0.2) * 1.9);

/** A tag above a part, shown while the spotlight is on it. */
function PartTag({ index, progress }: { index: number; progress: { current: number } }) {
  const node = useRef<HTMLDivElement>(null);
  useFrame(() => {
    const phase = deconstructPhase(progress.current, PARTS.length);
    node.current?.classList.toggle('is-on', phase.focus === index && phase.light > 0.4);
  });
  const part = PARTS[index];
  return (
    <Html position={[0, 0.78, 0]} center zIndexRange={[4, 0]}>
      <div ref={node} className={`part-tag part-tag--${part.good ? 'good' : 'bad'}`}>
        <span>{part.name}</span>
        {part.good ? 'Good' : 'Bad'}
      </div>
    </Html>
  );
}

/** Pulls focus from the whole dish to the part in the spotlight, like a macro lens. */
function FocusPull({
  progress,
  focus,
  blurRef,
  stage,
}: {
  progress: { current: number };
  focus: THREE.Vector3;
  blurRef: { current: number };
  stage: { position: THREE.Vector3; scale: number };
}) {
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, delta) => {
    const phase = deconstructPhase(progress.current, PARTS.length);
    target.copy(SPOT).multiplyScalar(phase.spread).multiplyScalar(stage.scale).add(stage.position);
    focus.lerp(target, 1 - Math.exp(-6 * delta));
    // Background parts fall out of focus only while one is in the spotlight.
    blurRef.current = THREE.MathUtils.damp(blurRef.current, phase.focus >= 0 ? 3.2 : 0, 4, delta);
  });
  return null;
}

/** The plate taken apart: scroll progress drives the shared deconstruct scene. */
export function InsideScene({ progress, compact }: { progress: { current: number }; compact: boolean }) {
  const stage = useMemo(
    () => ({ position: new THREE.Vector3(...(compact ? [0, 0.9, 0] : [1.2, 0.05, 0])), scale: compact ? 0.62 : 0.92 }),
    [compact],
  );
  const focus = useMemo<Focus>(() => ({ target: stage.position.clone(), blur: { current: 0 } }), [stage]);
  return (
    <Frame className="inside__canvas" camera={[0, 1.2, 8]}>
      <Backdrop layers={BACKDROPS.inside} />
      <Lighting dim />
      <group position={stage.position} scale={stage.scale}>
        <Deconstruct
          parts={PARTS}
          progress={progress}
          whole={<CholeBhature />}
          label={compact ? undefined : (index) => <PartTag index={index} progress={progress} />}
        />
        <ContactShadows position={[0, -1.4, 0]} opacity={0.5} scale={9} blur={2.6} far={3} color="#000" resolution={CONTACT_SHADOW_RESOLUTION} />
      </group>
      <FocusPull progress={progress} focus={focus.target} blurRef={focus.blur} stage={stage} />
      <Effects focus={compact ? undefined : focus} bloom={0.8} />
    </Frame>
  );
}
