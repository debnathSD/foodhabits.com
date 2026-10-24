import { Canvas } from '@react-three/fiber/native';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import * as THREE from 'three';

/** A transparent 3D view for phones (expo-gl). The web version lives in canvas.web.tsx. */
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
        style={StyleSheet.absoluteFill}
        camera={{ position: camera, fov }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
        }}>
        {children}
      </Canvas>
    </View>
  );
}
