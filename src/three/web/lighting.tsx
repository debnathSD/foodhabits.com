import { Environment, Lightformer } from '@react-three/drei';

import { webAsset } from './assets';

/** A real photo studio (CC0 HDRI) plus soft boxes, for true reflections on food, glass and ceramic. */
export function StudioLighting({ dim = false }: { dim?: boolean }) {
  const level = dim ? 0.45 : 1;
  return (
    <>
      <ambientLight intensity={0.25 * level} />
      <directionalLight position={[4, 6, 5]} intensity={2.3 * level} color="#fff4e6" />
      <directionalLight position={[-5, 2, -2]} intensity={0.9 * level} color="#cfe9dc" />
      <Environment files={webAsset('hdri/studio_small_09_1k.hdr')} resolution={512} environmentIntensity={dim ? 0.4 : 0.85}>
        <Lightformer form="rect" intensity={3} position={[0, 5, -3]} scale={[12, 3, 1]} />
        <Lightformer form="rect" intensity={1.8} color="#ffffff" position={[-6, 1, 1]} rotation={[0, Math.PI / 2, 0]} scale={[8, 4, 1]} />
        <Lightformer form="ring" intensity={2.2} color="#ffffff" position={[2, 3, 6]} scale={3} />
      </Environment>
    </>
  );
}
