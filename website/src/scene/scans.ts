import { useGLTF } from '@react-three/drei';

import { asset } from '../links';

/** Photoscanned foods (CC0, from Poly Haven), optimised into /public/models with 512 px textures (scripts/shrink-scans.mjs). */
export type ScanName =
  | 'food_avocado_01'
  | 'food_lime_01'
  | 'food_pomegranate_01'
  | 'food_kiwi_01'
  | 'food_apple_01'
  | 'food_ginger_01';

export const scanUrl = (name: ScanName) => asset(`models/${name}.glb`);

/** Starts loading scans before the sections that show them scroll into view. */
export function preloadScans(names: ScanName[]) {
  names.forEach((name) => useGLTF.preload(scanUrl(name)));
}
