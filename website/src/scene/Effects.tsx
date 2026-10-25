import { useFrame, useThree } from '@react-three/fiber';
import { Bloom, DepthOfField, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { type DepthOfFieldEffect, MaskFunction, ToneMappingMode } from 'postprocessing';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { LITE } from '../quality';

/** A focus pull: the world point to keep sharp, and how strong the blur is (read every frame). */
export type Focus = { target: THREE.Vector3; blur: { current: number } };

/**
 * The finishing pass every 3D section shares: soft contact shadows (ambient
 * occlusion), bloom on the brightest highlights, optional depth of field,
 * neutral filmic tone mapping (true food colours) and a gentle vignette. Film
 * grain comes from the page itself, so it sits evenly over 3D and type.
 *
 * Phones skip the pass: they draw straight to the screen with the same tone
 * mapping (CANVAS_PROPS), as these passes are what mobile GPUs struggle with.
 */
export function Effects(props: Parameters<typeof PostEffects>[0]) {
  return LITE ? null : <PostEffects {...props} />;
}

function PostEffects({
  focus,
  bloom = 0.55,
  occlusion = true,
  vignette = true,
}: {
  focus?: Focus;
  bloom?: number;
  occlusion?: boolean;
  vignette?: boolean;
}) {
  const dof = useRef<DepthOfFieldEffect>(null);
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const drawn = useMemo(() => new THREE.Vector2(), []);
  // The composer library sizes itself from one vector shared by every canvas, so
  // when several mount together one can take another's size and shrink its
  // canvas. Put this canvas back to its own size before the composer renders.
  useFrame(() => {
    gl.getSize(drawn);
    if (drawn.x !== size.width || drawn.y !== size.height) gl.setSize(size.width, size.height);
  }, -1);
  // Blur colour only, keeping the canvas transparent so each section's own background shows.
  useLayoutEffect(() => {
    if (dof.current) dof.current.maskFunction = MaskFunction.MULTIPLY_RGB;
  });
  useFrame(() => {
    if (!dof.current || !focus) return;
    dof.current.target?.copy(focus.target);
    dof.current.bokehScale = focus.blur.current;
  });
  return (
    <EffectComposer multisampling={0}>
      {occlusion ? <N8AO aoRadius={0.5} intensity={1.4} distanceFalloff={0.5} halfRes /> : <></>}
      {bloom > 0 ? <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.25} intensity={bloom} /> : <></>}
      {focus ? <DepthOfField ref={dof} target={focus.target} worldFocusRange={2.4} bokehScale={0} /> : <></>}
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <SMAA />
      {vignette ? <Vignette offset={0.3} darkness={0.5} /> : <></>}
    </EffectComposer>
  );
}
