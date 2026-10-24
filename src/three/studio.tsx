import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Soft studio lighting: a key light, a cool rim and a warm fill, plus a
 * reflection environment generated in code (no HDR file to download). The
 * environment is built after the canvas mounts, and skipped where the GL
 * context can't build it.
 */
export function Studio({ intensity = 1 }: { intensity?: number }) {
  const get = useThree((state) => state.get);

  useEffect(() => {
    const { gl, scene } = get();
    let generator: THREE.PMREMGenerator | undefined;
    let texture: THREE.Texture | undefined;
    try {
      generator = new THREE.PMREMGenerator(gl);
      texture = generator.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = texture;
      scene.environmentIntensity = 0.55;
    } catch (error) {
      console.warn('Studio environment unavailable', error);
    }
    return () => {
      if (scene.environment === texture) scene.environment = null;
      texture?.dispose();
      generator?.dispose();
    };
  }, [get]);

  return (
    <>
      <ambientLight intensity={0.35 * intensity} />
      <directionalLight position={[3, 5, 4]} intensity={2.2 * intensity} color="#fff6e8" castShadow />
      <directionalLight position={[-4, 2, -3]} intensity={1.4 * intensity} color="#a9ffd2" />
      <pointLight position={[0, -2, 3]} intensity={6 * intensity} distance={10} color="#ffd9b0" />
    </>
  );
}
