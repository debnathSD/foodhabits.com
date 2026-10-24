import { Environment, Lightformer } from '@react-three/drei';

import { asset } from '../links';

/**
 * Studio lighting that gives the phone, ceramic and food real reflections.
 * The fill is mint on dark sections; `paper` keeps it neutral so whites stay white.
 */
export function Lighting({ warm = false, paper = false, dim = false }: { warm?: boolean; paper?: boolean; dim?: boolean }) {
  // Neutral fill on paper and in the dimmed studio, so food keeps its true colour.
  const fill = paper ? '#fff6ea' : dim ? '#dfe8f2' : '#9effc9';
  // Dim keeps the studio low so a spotlight can carry the scene.
  const level = dim ? 0.4 : 1;
  return (
    <>
      <ambientLight intensity={(paper ? 0.45 : 0.25) * level} />
      <directionalLight position={[4, 6, 5]} intensity={2.4 * level} color={warm || paper ? '#fff1dc' : '#ffffff'} castShadow />
      <directionalLight position={[-5, 2, -2]} intensity={(paper ? 0.7 : 1.2) * level} color={fill} />
      {/* A real photo studio (CC0 HDRI from Poly Haven) plus soft boxes for crisp highlights. */}
      <Environment files={asset('hdri/studio_small_09_1k.hdr')} resolution={512} environmentIntensity={dim ? 0.4 : 0.9}>
        <Lightformer form="rect" intensity={3} position={[0, 5, -3]} scale={[12, 3, 1]} />
        <Lightformer form="rect" intensity={2.2} color={paper || dim ? '#ffffff' : '#b8ffd8'} position={[-6, 1, 1]} rotation={[0, Math.PI / 2, 0]} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#fff0d4" position={[6, 0, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 4, 1]} />
        <Lightformer form="ring" intensity={2.5} color="#ffffff" position={[2, 3, 6]} scale={3} />
      </Environment>
    </>
  );
}
