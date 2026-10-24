import { Bite } from '@three/deconstruct';
import { Bowl, seeded } from '@three/scenes';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

/** A bowl of chole: chickpeas and coriander in a glossy gravy. */
function Chole(props: { position?: [number, number, number]; scale?: number }) {
  const peas = useRef<THREE.InstancedMesh>(null);
  const herbs = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 20, 14).scale(1, 0.88, 0.92), []);
  const leaf = useMemo(() => new THREE.CircleGeometry(1, 7), []);
  useLayoutEffect(() => {
    const random = seeded(17);
    const dummy = new THREE.Object3D();
    for (let index = 0; index < 34; index++) {
      const radius = 0.78 * Math.sqrt(random());
      const angle = random() * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * radius, 0.2 + random() * 0.06, Math.sin(angle) * radius);
      dummy.rotation.set(random() * 3, random() * 3, random() * 3);
      dummy.scale.setScalar(0.085 + random() * 0.02);
      dummy.updateMatrix();
      peas.current?.setMatrixAt(index, dummy.matrix);
    }
    for (let index = 0; index < 14; index++) {
      const radius = 0.7 * Math.sqrt(random());
      const angle = random() * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * radius, 0.29, Math.sin(angle) * radius);
      dummy.rotation.set(-Math.PI / 2 + (random() - 0.5) * 0.6, 0, random() * 6);
      dummy.scale.setScalar(0.04 + random() * 0.03);
      dummy.updateMatrix();
      herbs.current?.setMatrixAt(index, dummy.matrix);
    }
    if (peas.current) peas.current.instanceMatrix.needsUpdate = true;
    if (herbs.current) herbs.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group {...props}>
      <Bowl />
      <mesh position={[0, 0.17, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.97, 64]} />
        <meshPhysicalMaterial color="#8E3F17" roughness={0.3} clearcoat={0.8} clearcoatRoughness={0.15} />
      </mesh>
      <instancedMesh ref={peas} args={[geometry, undefined, 34]} castShadow>
        <meshPhysicalMaterial color="#D8A45C" roughness={0.45} clearcoat={0.4} />
      </instancedMesh>
      <instancedMesh ref={herbs} args={[leaf, undefined, 14]}>
        <meshStandardMaterial color="#3E8C3A" roughness={0.6} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}

/** Chole bhature, the whole dish: a puffed, blistered bhatura beside a bowl of chole. */
export function CholeBhature() {
  return (
    <group>
      <Bite color="#D99A48" position={[-0.6, 0.05, 0]} scale={[1.15, 0.8, 1.05]} rotation={[0.15, 0.4, 0.1]} />
      <Chole position={[0.95, -0.35, 0.25]} scale={0.62} />
    </group>
  );
}
