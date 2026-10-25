/** Web-only 3D files from public/, under the base path the web app is published at. */
export const webAsset = (path: string) => `${process.env.EXPO_BASE_URL ?? ''}/${path.replace(/^\//, '')}`;

export type ScanName = 'food_avocado_01' | 'food_lime_01' | 'food_pomegranate_01' | 'food_kiwi_01' | 'food_apple_01' | 'food_ginger_01';

export const scanUrl = (name: ScanName) => webAsset(`models/${name}.glb`);
