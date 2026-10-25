import { useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * The finishing pass: bloom on the brightest highlights, neutral filmic tone
 * mapping (true food colours) and a soft vignette. Paint a backdrop inside the
 * scene: the pass makes the canvas opaque.
 */
export function Effects({ bloom = 0.6 }: { bloom?: number }) {
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const drawn = useMemo(() => new THREE.Vector2(), []);
  // The composer library shares one size vector between canvases; keep this canvas at its own size.
  useFrame(() => {
    gl.getSize(drawn);
    if (drawn.x !== size.width || drawn.y !== size.height) gl.setSize(size.width, size.height);
  }, -1);
  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur luminanceThreshold={0.82} luminanceSmoothing={0.25} intensity={bloom} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <Vignette offset={0.32} darkness={0.55} />
    </EffectComposer>
  );
}
