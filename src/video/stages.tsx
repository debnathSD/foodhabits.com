/**
 * The 3D side of each explainer scene. Everything is computed from the
 * current frame (Remotion), so the video plays, scrubs and renders the same.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';

import type { SceneKind } from '../lib/describe';
import { Bite, Deconstruct } from '../three/deconstruct';
import { DishModel, dishTilt } from '../three/dish-models';
import { Avocado, Broccoli, Tomato } from '../three/food';
import { PhotoDish } from '../three/photo-dish';
import { GutScene, HeartScene, ScoreOrb } from '../three/scenes';
import { bakeMicrobes, bakePlate, poseAt } from './physics';
import type { ExplainerVideoProps } from './props';

const MINT = '#57E39A';
const CORAL = '#FF6B5B';
const SEED = '#D4F25C';

/** A dark pedestal with a glowing rim, for the dish to land on. Its origin is the top face. */
function Pedestal({ radius = 1.3 }: { radius?: number }) {
  return (
    <group>
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[radius, radius * 1.04, 0.36, 96]} />
        <meshPhysicalMaterial color="#0f1d16" roughness={0.35} metalness={0.2} clearcoat={0.6} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.995, 0.014, 12, 160]} />
        <meshBasicMaterial color={SEED} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** How far the meal photo leans back to face the camera, like a plate on a display stand. */
const PHOTO_TILT = 1.2;

/**
 * Intro: the dish drops onto the pedestal and leans back to face the viewer:
 * the meal's own photo on a plate, or a 3D model of the dish when there is no
 * photo.
 */
function IntroStage({ props, local }: { props: ExplainerVideoProps; local: number }) {
  const { fps } = useVideoConfig();
  const drop = spring({ frame: local, fps, config: { damping: 13, mass: 0.9 } });
  const sway = Math.sin((local / fps) * 0.8) * 0.12;
  const tilt = props.photo ? PHOTO_TILT : dishTilt(props.look);
  // Tilting about its base sinks the front edge; lift it back onto the pedestal.
  const lift = Math.sin(tilt) * 1.05 + 0.02;
  return (
    <group position={[0, -0.75, 0]} scale={0.62}>
      <Pedestal />
      <group position={[0, lift + (1 - drop) * 3.6, 0]} rotation={[tilt * drop, sway, 0]}>
        {props.photo ? <PhotoDish uri={props.photo} /> : <DishModel look={props.look} />}
      </group>
    </group>
  );
}

/** Inside: the shared take-apart scene on the video's clock. The meal's photo, or its 3D model, burns away into its parts. */
function InsideStage({ props, progress }: { props: ExplainerVideoProps; progress: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progressRef = useRef(progress);
  const timeRef = useRef(frame / fps);
  useLayoutEffect(() => {
    progressRef.current = progress;
    timeRef.current = frame / fps;
  });
  return (
    <group position={[0, 0.1, 0]} scale={0.55}>
      <Deconstruct
        parts={props.parts}
        progress={progressRef}
        time={timeRef}
        color={props.dishColor}
        whole={
          props.photo ? (
            <PhotoDish uri={props.photo} radius={1.1} rotation={[PHOTO_TILT, 0, 0]} />
          ) : (
            <DishModel look={props.look} rotation={[dishTilt(props.look), 0, 0]} />
          )
        }
        facing
      />
    </group>
  );
}

/** Gut: friendly and troublemaker microbes pour into a glass capsule. */
function GutStage({ props, local, frames }: { props: ExplainerVideoProps; local: number; frames: number }) {
  const { fps } = useVideoConfig();
  const total = 70;
  const friendly = Math.round(total * props.gutHealth);
  const baked = useMemo(() => bakeMicrobes(friendly, total - friendly, frames, fps), [friendly, frames, fps]);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 20, 14), []);
  useLayoutEffect(() => {
    const node = mesh.current;
    if (!node) return;
    const color = new THREE.Color();
    baked.friendly.forEach((good, index) => node.setColorAt(index, color.set(good ? MINT : CORAL)));
    if (node.instanceColor) node.instanceColor.needsUpdate = true;
  }, [baked]);
  useLayoutEffect(() => {
    const node = mesh.current;
    if (!node) return;
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    for (let index = 0; index < baked.bodies; index++) {
      const pose = poseAt(baked, index, local);
      position.set(...pose.position);
      // Parked microbes (still waiting to drop) sit far above: hide them.
      const scale = position.y > 10 ? 0 : 0.13;
      matrix.compose(position, quaternion.set(...pose.quaternion), new THREE.Vector3(scale, scale, scale));
      node.setMatrixAt(index, matrix);
    }
    node.instanceMatrix.needsUpdate = true;
  });
  return (
    <group position={[0, 0.15, 0]} rotation={[0.22, (local / fps) * 0.25, 0]} scale={0.62}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[1.08, 1.08, 3.3, 64, 1, true]} />
        <meshPhysicalMaterial color="#d8fff0" transparent opacity={0.14} roughness={0.05} clearcoat={1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, -1.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.08, 64]} />
        <meshPhysicalMaterial color="#0f1d16" roughness={0.5} />
      </mesh>
      {/* Bounds change as microbes drop in, so don't let three.js cull them from stale bounds. */}
      <instancedMesh ref={mesh} args={[geometry, undefined, baked.bodies]} frustumCulled={false}>
        <meshPhysicalMaterial roughness={0.25} clearcoat={0.8} emissive="#ffffff" emissiveIntensity={0.08} />
      </instancedMesh>
    </group>
  );
}

const EAT_PIECES = [Broccoli, Tomato, Avocado];

/** Next meal: the foods to avoid are flicked off the plate, better ones drop on. */
function NextStage({ props, local, frames }: { props: ExplainerVideoProps; local: number; frames: number }) {
  const { fps } = useVideoConfig();
  const avoid = Math.max(1, props.avoid.length);
  const eat = Math.max(1, props.eat.length);
  const baked = useMemo(() => bakePlate(avoid, eat, frames, fps), [avoid, eat, frames, fps]);
  return (
    <group position={[0, -0.6, 0]} rotation={[0.35, 0, 0]}>
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[1.25, 1.1, 0.2, 64]} />
        <meshPhysicalMaterial color="#f4f1e8" roughness={0.25} clearcoat={1} />
      </mesh>
      {Array.from({ length: avoid + eat }, (_, index) => {
        const pose = poseAt(baked, index, local);
        if (pose.position[1] > 10) return null;
        const Piece = EAT_PIECES[(index - avoid) % EAT_PIECES.length];
        return (
          <group key={index} position={pose.position} quaternion={pose.quaternion}>
            {index < avoid ? <Bite color="#C98A3E" scale={0.3} /> : <Piece scale={0.42} />}
          </group>
        );
      })}
    </group>
  );
}

/** Each scene's 3D, growing in with a spring as the scene starts. */
export function Stage({ kind, props, local, frames }: { kind: SceneKind; props: ExplainerVideoProps; local: number; frames: number }) {
  const { fps } = useVideoConfig();
  const enter = spring({ frame: local, fps, config: { damping: 16, mass: 0.8 } });
  const progress = Math.min(1, local / Math.max(1, frames - 1));
  let content: React.ReactNode = null;
  switch (kind) {
    case 'intro':
      content = <IntroStage props={props} local={local} />;
      break;
    case 'inside':
      content = <InsideStage props={props} progress={progress} />;
      break;
    case 'gut':
      content = <GutStage props={props} local={local} frames={frames} />;
      break;
    case 'body':
      content = (
        <group scale={0.75}>
          <HeartScene strain={props.body.some((item) => item.effect === 'bad')} />
        </group>
      );
      break;
    case 'risks':
      content = (
        <group rotation={[0.25, -0.35, 0]} scale={0.5} position={[0, 0.9, -1]}>
          <GutScene health={props.risks.length ? 0.12 : 0.85} speed={1.4} />
        </group>
      );
      break;
    case 'next':
      content = <NextStage props={props} local={local} frames={frames} />;
      break;
    case 'outro':
      content = (
        <group position={[0, 0.5, 0]} scale={0.8}>
          <ScoreOrb score={props.score} color={props.color} />
        </group>
      );
      break;
  }
  return (
    <group scale={0.6 + 0.4 * enter} rotation={[0, (1 - enter) * -0.9, 0]}>
      {content}
    </group>
  );
}
