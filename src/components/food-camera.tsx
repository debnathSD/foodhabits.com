import { CameraView } from 'expo-camera';
import { type Ref, useImperativeHandle, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { PhotoSource } from '@/lib/image';

export type FoodCameraHandle = { takePicture: () => Promise<PhotoSource> };

export type FoodCameraProps = {
  ref?: Ref<FoodCameraHandle>;
  torch: boolean;
  onReady: () => void;
  onUnavailable: () => void;
  style?: StyleProp<ViewStyle>;
};

/** The back camera, ready to photograph a meal. On phones this is expo-camera, which focuses on its own. */
export function FoodCamera({ ref, torch, onReady, onUnavailable, style }: FoodCameraProps) {
  const camera = useRef<CameraView>(null);

  useImperativeHandle(ref, () => ({
    async takePicture() {
      if (!camera.current) throw new Error('The camera is not ready');
      const picture = await camera.current.takePictureAsync({ quality: 0.9 });
      return { uri: picture.uri, width: picture.width, height: picture.height };
    },
  }));

  return (
    <CameraView
      ref={camera}
      style={style}
      facing="back"
      enableTorch={torch}
      onCameraReady={onReady}
      onMountError={onUnavailable}
    />
  );
}
