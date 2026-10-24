import { useGLTF } from '@react-three/drei';
import type { ThreeElements } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';

import { scanUrl, type ScanName } from './scans';

/** A photoscanned food, centred on its middle and scaled so its longest side is `size`. */
export function Scan({ name, size = 1, ...props }: { name: ScanName; size?: number } & ThreeElements['group']) {
  const { scene } = useGLTF(scanUrl(name));
  const object = useMemo(() => {
    const copy = scene.clone(true);
    const box = new THREE.Box3().setFromObject(copy);
    const dimensions = box.getSize(new THREE.Vector3());
    const scale = size / Math.max(dimensions.x, dimensions.y, dimensions.z);
    copy.scale.setScalar(scale);
    copy.position.copy(box.getCenter(new THREE.Vector3())).multiplyScalar(-scale);
    copy.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return copy;
  }, [scene, size]);
  return (
    <group {...props}>
      <primitive object={object} />
    </group>
  );
}
