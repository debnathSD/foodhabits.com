import { Canvas } from '@react-three/fiber';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import * as THREE from 'three';

/** A transparent 3D view for the web build (WebGL). */
export function SceneCanvas({
  children,
  camera = [0, 0.4, 6],
  fov = 32,
  style,
}: {
  children: ReactNode;
  camera?: [number, number, number];
  fov?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={style} pointerEvents="none">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: camera, fov }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
        style={{ width: '100%', height: '100%' }}>
        {children}
      </Canvas>
    </View>
  );
}
