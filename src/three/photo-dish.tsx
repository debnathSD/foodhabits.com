/**
 * The user's own meal, as a dish: a ceramic plate whose face is their photo,
 * cropped to a circle. The explainer shows it instead of a stand-in, so the
 * video is about this exact meal.
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/** Half the plate's cross-section (x out from the centre, y up), turned into a lathe. */
const PLATE: [number, number][] = [
  [0, 0],
  [0.8, 0],
  [0.86, 0.015],
  [0.98, 0.085],
  [1, 0.1],
  [0.985, 0.112],
  [0.86, 0.046],
  [0.8, 0.032],
  [0, 0.032],
];
/** The photo fills the plate's flat well. */
const WELL = 0.8;

type Photo = { texture: THREE.Texture; ready: Promise<void> };

/** One texture per photo, shared by every plate that shows it, so a new scene never starts on a blank plate. */
const photos = new Map<string, Photo>();

function photo(uri: string): Photo {
  let entry = photos.get(uri);
  if (!entry) {
    const texture = new THREE.Texture();
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const ready = new THREE.ImageLoader()
      .loadAsync(uri)
      .then((image) => {
        // The centre square of the photo, whatever its shape.
        const side = Math.min(image.width, image.height);
        texture.image = image;
        texture.repeat.set(side / image.width, side / image.height);
        texture.offset.set((1 - side / image.width) / 2, (1 - side / image.height) / 2);
        texture.needsUpdate = true;
      })
      .catch((error) => console.warn('Could not load the meal photo', error));
    entry = { texture, ready };
    photos.set(uri, entry);
  }
  return entry;
}

/** Resolves once the photo is decoded and ready to show. */
export function preloadPhoto(uri: string) {
  return photo(uri).ready;
}

type Props = { uri: string; radius?: number; position?: [number, number, number]; rotation?: [number, number, number]; scale?: number };

export function PhotoDish({ uri, radius = 1, ...props }: Props) {
  const { texture } = photo(uri);
  const plate = useMemo(() => new THREE.LatheGeometry(PLATE.map(([x, y]) => new THREE.Vector2(x * radius, y * radius)), 96), [radius]);
  const face = useMemo(() => new THREE.CircleGeometry(WELL * radius, 96), [radius]);
  const ceramic = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#f4f1e8', roughness: 0.25, clearcoat: 1, side: THREE.DoubleSide }), []);
  // Lit by its own colours too, so the food keeps the photo's brightness under the studio lights.
  const food = useMemo(
    () => new THREE.MeshStandardMaterial({ map: texture, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: 0.6, roughness: 0.6 }),
    [texture],
  );
  useEffect(() => () => food.dispose(), [food]);
  useEffect(() => () => ceramic.dispose(), [ceramic]);
  useEffect(
    () => () => {
      plate.dispose();
      face.dispose();
    },
    [plate, face],
  );
  return (
    <group {...props}>
      <mesh geometry={plate} material={ceramic} castShadow receiveShadow />
      <mesh geometry={face} material={food} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.033 * radius, 0]} />
    </group>
  );
}
