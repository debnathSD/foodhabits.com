import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

export type GradientLayer = { at: [number, number]; size: [number, number]; stops: [number, string][] };

/** A full-frame radial-gradient background painted inside the scene (layers top first, like CSS). */
export function Backdrop({ layers }: { layers: GradientLayer[] }) {
  const texture = useMemo(() => {
    const width = 1024;
    const height = 640;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d')!;
    [...layers].reverse().forEach(({ at, size, stops }) => {
      context.save();
      context.setTransform(size[0] * width, 0, 0, size[1] * height, at[0] * width, at[1] * height);
      const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
      stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
      context.fillStyle = gradient;
      context.fillRect(-4, -4, 8, 8);
      context.restore();
    });
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [layers]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <primitive attach="background" object={texture} />;
}

export const FOREST: GradientLayer[] = [
  { at: [0.5, 0.48], size: [0.42, 0.42], stops: [[0, 'rgba(43,209,126,0.24)'], [0.7, 'rgba(43,209,126,0)']] },
  { at: [0.5, 0.42], size: [1.1, 1.0], stops: [[0, '#165c39'], [0.5, '#0d2a1c'], [1, '#06100b']] },
];
