/**
 * Offline 3D models of dishes, for the explainer when there is no photo of the
 * meal: shorshe ilish in its mustard gravy, Kolkata biryani with its potato and
 * egg, a dosa with sambar and chutney, bhetki paturi in banana leaf, chai in a
 * kulhad. Each is built from simple shapes, coloured and topped from the
 * dish's look (src/lib/dish-look.ts, src/data/dish-looks.ts), and merged into
 * a few meshes so the take-apart scene can burn it away like any other dish.
 * Units: it stands on y = 0 and fits within a radius of about 1.1.
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import type { DishLook, DishModelKind, Garnish, Side, Topping } from '../lib/dish-look';
import { seeded } from './scenes';

type Material = 'food' | 'glossy' | 'liquid' | 'ceramic' | 'steel' | 'clay' | 'wood' | 'glass';
type V3 = [number, number, number];
type Place = { at?: V3; rot?: V3; scale?: number | V3; jitter?: number };

const WHITE = '#F4F1E8';
const STEEL = '#C9CDD2';
const HERB = '#3F8A3A';
const CHILI = '#4E9A2E';
const LEAF = '#3E7A2A';
const TAU = Math.PI * 2;

/** Collects coloured shapes per material, then merges each material into one mesh. */
class Dish {
  readonly random: () => number;
  private parts = new Map<Material, THREE.BufferGeometry[]>();

  constructor(seed: number) {
    this.random = seeded(seed);
  }

  /** Places a shape, paints it `color` (± `jitter`) and keeps it. The shape is used up. */
  add(material: Material, shape: THREE.BufferGeometry, color: string, { at = [0, 0, 0], rot = [0, 0, 0], scale = 1, jitter = 0 }: Place = {}) {
    const geometry = shape.index ? shape.toNonIndexed() : shape;
    if (geometry !== shape) shape.dispose();
    for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name);
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    const count = geometry.attributes.position.count;
    if (!geometry.attributes.uv) geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    const size = typeof scale === 'number' ? new THREE.Vector3(scale, scale, scale) : new THREE.Vector3(...scale);
    geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), size));
    const tint = new THREE.Color(color).multiplyScalar(jitter ? 1 + (this.random() - 0.5) * jitter : 1);
    const colors = new Float32Array(count * 3);
    for (let index = 0; index < count; index++) colors.set([tint.r, tint.g, tint.b], index * 3);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const list = this.parts.get(material) ?? [];
    list.push(geometry);
    this.parts.set(material, list);
  }

  /** A random point in a disc of `radius` around (x, z), as [x, z]. */
  spot(radius: number, x = 0, z = 0): [number, number] {
    const r = radius * Math.sqrt(this.random());
    const angle = this.random() * TAU;
    return [x + Math.cos(angle) * r, z + Math.sin(angle) * r];
  }

  /** A random rotation. */
  turn(): V3 {
    return [this.random() * TAU, this.random() * TAU, this.random() * TAU];
  }

  /** -0.5 to 0.5. */
  wobble() {
    return this.random() - 0.5;
  }

  meshes() {
    return [...this.parts].map(([material, list]) => {
      const geometry = mergeGeometries(list)!;
      list.forEach((part) => part.dispose());
      return { material, geometry };
    });
  }
}

// Shapes.
const sphere = (r: number, width = 16, height = 12) => new THREE.SphereGeometry(r, width, height);
const dome = (r: number, width = 24) => new THREE.SphereGeometry(r, width, 10, 0, TAU, 0, Math.PI / 2);
const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
const cylinder = (top: number, bottom: number, height: number, segments = 32, open = false, start = 0, length = TAU) =>
  new THREE.CylinderGeometry(top, bottom, height, segments, 1, open, start, length);
const torus = (radius: number, tube: number, arc = TAU, radial = 10, tubular = 32) => new THREE.TorusGeometry(radius, tube, radial, tubular, arc);
const capsule = (radius: number, length: number, radial = 10) => new THREE.CapsuleGeometry(radius, length, 4, radial);
const disc = (r: number, segments = 48) => new THREE.CircleGeometry(r, segments).rotateX(-Math.PI / 2);
const lathe = (points: [number, number][], scale = 1, segments = 64) => new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x * scale, y * scale)), segments);
/** A slice of round cake or pie, its tip at the origin, pointing towards the viewer's right. */
const wedge = (radius: number, height: number) => cylinder(radius, radius, height, 24, false, Math.PI / 4 - 0.5, 1);
const tube = (points: V3[], radius: number, tubular = 64, radial = 8) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point))), tubular, radius, radial, false);

/** A shape with its surface pushed in and out, for chunks, fritters and dough. */
function lumpy(shape: THREE.BufferGeometry, amount: number, seed: number) {
  shape.deleteAttribute('normal');
  shape.deleteAttribute('uv');
  const geometry = mergeVertices(shape);
  shape.dispose();
  const position = geometry.attributes.position;
  const point = new THREE.Vector3();
  for (let index = 0; index < position.count; index++) {
    point.fromBufferAttribute(position, index);
    const n = Math.sin(point.x * 9.1 + seed) * Math.sin(point.y * 8.3 + seed * 1.7) * Math.sin(point.z * 7.7 + seed * 0.3);
    point.multiplyScalar(1 + amount * n);
    position.setXYZ(index, point.x, point.y, point.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// Vessels. Each returns where food sits.
const PLATE: [number, number][] = [[0, 0], [0.8, 0], [0.86, 0.015], [0.98, 0.085], [1, 0.1], [0.985, 0.112], [0.86, 0.046], [0.8, 0.032], [0, 0.032]];
const BOWL: [number, number][] = [[0, 0], [0.4, 0], [0.42, 0.05], [0.66, 0.14], [0.88, 0.33], [1, 0.56], [0.965, 0.58], [0.85, 0.37], [0.63, 0.19], [0.4, 0.12], [0, 0.12]];

function plate(dish: Dish, radius = 1.05, material: Material = 'ceramic', color = WHITE) {
  dish.add(material, lathe(PLATE, radius), color);
  return 0.034 * radius;
}

/** A bowl of `radius`, filled with `liquid`; returns the surface's height and radius. */
function bowl(dish: Dish, radius: number, liquid: string | null, material: Material = 'ceramic', color = WHITE, at: V3 = [0, 0, 0]) {
  dish.add(material, lathe(BOWL, radius), color, { at });
  const y = 0.46 * radius;
  const r = 0.88 * radius;
  if (liquid) dish.add('liquid', disc(r), liquid, { at: [at[0], at[1] + y, at[2]] });
  return { y: at[1] + y, r };
}

function glassVessel(dish: Dish, radius: number, height: number, liquid: string, level: number) {
  dish.add('glass', cylinder(radius, radius * 0.86, height, 40, true), WHITE, { at: [0, height / 2, 0] });
  dish.add('glass', disc(radius * 0.86), WHITE, { at: [0, 0.02, 0] });
  const fill = height * level;
  dish.add('liquid', cylinder(radius * 0.94, radius * 0.82, fill, 40), liquid, { at: [0, fill / 2 + 0.02, 0] });
  return fill + 0.02;
}

/** Where side bowls go on a plate: front right, then front left. */
const SIDE_SPOTS: [number, number][] = [[0.6, 0.45], [-0.12, 0.66]];

/** Small steel bowls of what comes alongside: sambar and chutney, alur dom, kasundi. */
function sides(dish: Dish, look: DishLook, top: number) {
  (look.sides ?? []).slice(0, 2).forEach((side: Side, index) => {
    const [x, z] = SIDE_SPOTS[index];
    const surface = bowl(dish, 0.27, side.color, 'steel', STEEL, [x, top, z]);
    if (side.topping) toppingAt(dish, side.topping, surface.y, surface.r * 0.6, look, x, z, 0.45);
  });
}

// Toppings: what is in the bowl or on the rice.
function topping(dish: Dish, kind: Topping, y: number, radius: number, look: DishLook) {
  toppingAt(dish, kind, y, radius, look, 0, 0, 1);
}

function toppingAt(dish: Dish, kind: Topping, y: number, radius: number, look: DishLook, cx: number, cz: number, size: number) {
  const seed = 11;
  const at = (lift: number, spread = radius): V3 => {
    const [x, z] = dish.spot(spread, cx, cz);
    return [x, y + lift * size, z];
  };
  const count = (n: number) => Math.max(1, Math.round(n * (size < 1 ? size * 0.7 : 1)));
  const pieces = (n: number, make: () => THREE.BufferGeometry, color: string, lift: number, material: Material = 'food', jitter = 0.25) => {
    for (let index = 0; index < count(n); index++) dish.add(material, make(), color, { at: at(lift), rot: dish.turn(), jitter, scale: size });
  };
  switch (kind) {
    case 'chunks':
      return pieces(8, () => lumpy(new THREE.IcosahedronGeometry(0.12, 2), 0.25, seed), '#B9783E', 0.03);
    case 'darkChunks':
      return pieces(8, () => lumpy(new THREE.IcosahedronGeometry(0.12, 2), 0.3, seed), '#5E2E1A', 0.03);
    case 'fish':
      // Steaks of fish, as Bengali curries have them: pale flesh, a dark ring of skin, the backbone in the middle.
      for (let index = 0; index < count(4); index++) {
        const [x, z] = dish.spot(radius * 0.7, cx, cz);
        const place: Place = { at: [x, y + 0.05 * size, z], rot: [0.12, dish.random() * TAU, 0], scale: [1.35 * size, size, 0.95 * size] };
        dish.add('food', lumpy(cylinder(0.16, 0.16, 0.08, 28), 0.04, seed + index), '#F3DDB4', { ...place, jitter: 0.1 });
        dish.add('food', cylinder(0.168, 0.168, 0.07, 28, true), '#6E6A62', place);
        dish.add('food', sphere(0.022, 8, 6), '#F7F1E4', { at: [x, y + 0.095 * size, z] });
      }
      return;
    case 'prawns':
      for (let index = 0; index < count(7); index++) {
        const [x, z] = dish.spot(radius * 0.75, cx, cz);
        const turn = dish.random() * TAU;
        dish.add('food', torus(0.1, 0.05, Math.PI * 1.3, 8, 18), '#EE7E4A', { at: [x, y + 0.04 * size, z], rot: [Math.PI / 2 + 0.2, 0, turn], scale: size, jitter: 0.1 });
        dish.add('food', cylinder(0, 0.06, 0.1, 6), '#C9502A', { at: [x + Math.cos(turn) * 0.1 * size, y + 0.05 * size, z + Math.sin(turn) * 0.1 * size], rot: [Math.PI / 2, 0, turn], scale: size });
      }
      return;
    case 'egg':
      for (let index = 0; index < count(2); index++) {
        const [x, z] = dish.spot(radius * 0.5, cx, cz);
        // Halves of boiled egg, yolk up, sitting in the gravy.
        dish.add('food', dome(0.14, 16), WHITE, { at: [x, y + 0.13 * size, z], rot: [Math.PI, 0, 0], scale: [size, size * 0.9, size * 1.3] });
        dish.add('food', disc(0.075, 20), '#F2B41D', { at: [x, y + 0.132 * size, z], scale: size });
      }
      return;
    case 'cubes':
      return pieces(10, () => box(0.14, 0.14, 0.14), '#F2E6CC', 0.04, 'food', 0.2);
    case 'chickpeas':
      return pieces(45, () => sphere(0.05, 10, 8), '#D8AE6E', 0.02);
    case 'beans':
      return pieces(40, () => sphere(0.045, 10, 8).scale(1.5, 0.8, 0.9), '#6A2018', 0.02);
    case 'potato':
      // Bengali curries have big halves of potato.
      for (let index = 0; index < count(2); index++) {
        dish.add('food', lumpy(sphere(0.15, 16, 12), 0.05, index), '#E9C46A', { at: at(0.04, radius * 0.6), scale: [size, size * 0.8, size], jitter: 0.1 });
      }
      return;
    case 'peas':
      return pieces(45, () => sphere(0.04, 10, 8), '#5FA03A', 0.02);
    case 'florets':
      return pieces(7, () => lumpy(sphere(0.11, 12, 10), 0.3, seed), '#EFE4C6', 0.05);
    case 'veg': {
      const colours = ['#E07A2E', '#5FA03A', look.accent, '#E9CB7A', '#5A2E5E'];
      for (let index = 0; index < count(22); index++) dish.add('food', box(0.09, 0.09, 0.09), colours[index % colours.length], { at: at(0.03), rot: dish.turn(), jitter: 0.2, scale: size });
      return;
    }
    case 'noodles':
      for (let index = 0; index < 14; index++) {
        const [x, z] = dish.spot(radius * 0.6, cx, cz);
        const angle = dish.random() * TAU;
        const points: V3[] = Array.from({ length: 6 }, (_, step) => [
          x + Math.cos(angle + step * 0.9) * 0.25 * (step / 5),
          y + 0.02 + 0.015 * Math.sin(step * 2),
          z + Math.sin(angle + step * 0.9) * 0.25 * (step / 5),
        ]);
        dish.add('food', tube(points, 0.022, 32, 6), '#F2D88A');
      }
      return;
    case 'flakes':
      return pieces(40, () => cylinder(0.05, 0.05, 0.012, 10), look.accent, 0.02);
    case 'nuts':
      pieces(10, () => box(0.08, 0.02, 0.035), '#E9D3A6', 0.02);
      return pieces(6, () => sphere(0.03, 8, 6).scale(1.3, 0.7, 1), '#4A2A1E', 0.02);
    case 'kofta':
      return pieces(6, () => lumpy(sphere(0.12, 16, 12), 0.08, seed), '#A8642A', 0.05);
    case 'pakoras':
      return pieces(5, () => lumpy(sphere(0.14, 16, 12), 0.12, seed), '#C9963E', 0.03);
    case 'okra':
      for (let index = 0; index < count(18); index++) dish.add('food', cylinder(0.03, 0.045, 0.16, 5), '#4E7A2A', { at: at(0.04), rot: dish.turn(), jitter: 0.2, scale: size });
      return;
    case 'greens':
      return pieces(40, () => box(0.12, 0.012, 0.05), look.accent, 0.03, 'food', 0.35);
    case 'rice':
      return pieces(140, () => capsule(0.016, 0.04, 5), '#FBF8EE', 0.01, 'food', 0.06);
    case 'muri': {
      // A heap of puffed rice.
      for (let index = 0; index < 260; index++) {
        const [x, z] = dish.spot(radius, cx, cz);
        const lift = (1 - Math.hypot(x - cx, z - cz) / radius) * 0.22;
        dish.add('food', capsule(0.024, 0.04, 5), '#F3E8CC', { at: [x, y + lift + dish.random() * 0.03, z], rot: dish.turn(), jitter: 0.12 });
      }
      return;
    }
    case 'biryani':
      // Kolkata biryani: a whole potato, a boiled egg and a piece of mutton on top.
      dish.add('food', lumpy(sphere(0.19, 20, 14), 0.04, 3), '#E2B464', { at: [cx - 0.12, y + 0.08, cz + 0.05], scale: [1, 0.85, 1] });
      dish.add('food', sphere(0.15, 20, 14), WHITE, { at: [cx + 0.2, y + 0.08, cz - 0.05], scale: [1, 0.8, 1.3] });
      dish.add('food', lumpy(new THREE.IcosahedronGeometry(0.14, 2), 0.25, 5), '#5E2E1A', { at: [cx + 0.02, y + 0.1, cz - 0.25] });
      return;
    case 'coconut':
      return pieces(14, () => box(0.06, 0.02, 0.03), '#FBF6EA', 0.02);
    case 'mango':
      return pieces(6, () => sphere(0.09, 10, 8, ).scale(1.4, 0.5, 0.8), '#D9C24A', 0.03);
    case 'gourd':
      for (let index = 0; index < count(7); index++) {
        dish.add('food', capsule(0.06, 0.16, 10), '#5E8E2E', { at: at(0.04), rot: [Math.PI / 2, 0, dish.random() * TAU], jitter: 0.2, scale: size });
      }
      return;
    case 'diamonds':
      return pieces(7, () => box(0.15, 0.08, 0.15), '#D9A04A', 0.04, 'food', 0.15);
    case 'none':
      return;
  }
}

/** Garnishes, in the order given: coriander, cream, a tadka, fried onions, slit green chillies. */
function garnish(dish: Dish, list: Garnish[] | undefined, y: number, radius: number) {
  for (const kind of list ?? []) {
    if (kind === 'herbs') {
      for (let index = 0; index < 26; index++) {
        const [x, z] = dish.spot(radius * 0.85);
        dish.add('food', box(0.05, 0.008, 0.035), HERB, { at: [x, y + 0.035, z], rot: [0, dish.random() * TAU, 0], jitter: 0.3 });
      }
    }
    if (kind === 'cream') {
      const points: V3[] = Array.from({ length: 40 }, (_, step) => {
        const angle = step * 0.45;
        const r = 0.05 + step * 0.012 * radius;
        return [Math.cos(angle) * r, y + 0.015, Math.sin(angle) * r];
      });
      dish.add('glossy', tube(points, 0.018, 120, 6), '#FBF4E6');
    }
    if (kind === 'tadka') {
      // Whole dried red chillies and a sprinkle of mustard and cumin seeds.
      for (let index = 0; index < 3; index++) {
        const [x, z] = dish.spot(radius * 0.6);
        dish.add('glossy', capsule(0.025, 0.12, 8), '#9A1E14', { at: [x, y + 0.03, z], rot: [Math.PI / 2, 0, dish.random() * TAU] });
      }
      for (let index = 0; index < 40; index++) {
        const [x, z] = dish.spot(radius * 0.8);
        dish.add('food', sphere(0.012, 6, 4), '#2E1E12', { at: [x, y + 0.02, z] });
      }
    }
    if (kind === 'onions') {
      for (let index = 0; index < 22; index++) {
        const [x, z] = dish.spot(radius * 0.7);
        const angle = dish.random() * TAU;
        dish.add('food', torus(0.05, 0.012, Math.PI, 6, 10), '#8A4A1E', { at: [x, y + 0.04 + dish.random() * 0.04, z], rot: [Math.PI / 2, 0, angle], jitter: 0.3 });
      }
    }
    if (kind === 'chilies') {
      for (let index = 0; index < 3; index++) {
        const [x, z] = dish.spot(radius * 0.6);
        dish.add('glossy', capsule(0.022, 0.22, 8), CHILI, { at: [x, y + 0.03, z], rot: [Math.PI / 2, 0, dish.random() * TAU] });
      }
    }
  }
}

// Models.
type Build = (dish: Dish, look: DishLook) => void;

const bowlDish: Build = (dish, look) => {
  const small = look.shape === 'small';
  const surface = bowl(dish, small ? 0.62 : 0.82, look.base);
  topping(dish, look.topping, surface.y, surface.r * 0.72, look);
  if (look.extra) topping(dish, look.extra, surface.y, surface.r * 0.6, look);
  garnish(dish, look.garnish, surface.y, surface.r);
};

/** A mound of rice grains (or flattened rice) on a plate, with what is on it. */
function riceMound(dish: Dish, look: DishLook, top: number, cx: number, cz: number, radius: number) {
  const flakes = look.shape === 'flakes';
  dish.add('food', dome(radius, 32), look.base, { at: [cx, top, cz], scale: [1, 0.55, 1] });
  const grains = Math.round(520 * (radius / 0.62) ** 2);
  for (let index = 0; index < grains; index++) {
    const angle = dish.random() * TAU;
    const lift = Math.acos(dish.random() * 0.98);
    const point = new THREE.Vector3(Math.sin(lift) * Math.cos(angle), Math.cos(lift), Math.sin(lift) * Math.sin(angle)).multiply(new THREE.Vector3(radius, radius * 0.56, radius));
    const coloured = look.accent !== look.base && dish.random() < 0.16 ? look.accent : look.base;
    const grain = flakes ? cylinder(0.04, 0.04, 0.008, 8).scale(1.4, 1, 0.8) : capsule(0.017, 0.045, 5);
    dish.add('food', grain, coloured, { at: [cx + point.x, top + point.y, cz + point.z], rot: dish.turn(), jitter: 0.12 });
  }
}

const MODELS: Record<DishModelKind, Build> = {
  bowl: bowlDish,

  claypot: (dish, look) => {
    dish.add('clay', lathe([[0, 0], [0.5, 0], [0.62, 0.12], [0.72, 0.4], [0.74, 0.56], [0.7, 0.58], [0.66, 0.42], [0, 0.42]], 1), '#9C5A2E');
    dish.add('glossy', disc(0.67), look.base, { at: [0, 0.5, 0] });
    dish.add('glossy', torus(0.6, 0.03), look.accent, { at: [0, 0.5, 0], rot: [Math.PI / 2, 0, 0] });
  },

  rice: (dish, look) => {
    const top = plate(dish);
    if (look.shape === 'mound') {
      dish.add('food', lumpy(dome(0.6, 32), 0.05, 2), look.base, { at: [0, top, 0], scale: [1, 0.5, 1] });
    } else riceMound(dish, look, top, 0, 0, 0.62);
    topping(dish, look.topping, top + 0.24, 0.32, look);
    if (look.extra) topping(dish, look.extra, top + 0.26, 0.28, look);
    garnish(dish, look.garnish, top + 0.3, 0.45);
  },

  riceCurry: (dish, look) => {
    const top = plate(dish, 1.1);
    riceMound(dish, { ...look, accent: look.base }, top, -0.3, -0.1, 0.45);
    const surface = bowl(dish, 0.42, look.accent, 'steel', STEEL, [0.45, top, 0.3]);
    toppingAt(dish, look.topping, surface.y, surface.r * 0.65, look, 0.45, 0.3, 0.7);
  },

  flatbread: (dish, look) => {
    const top = plate(dish);
    const shape = look.shape;
    if (shape === 'square') {
      // Mughlai paratha: square pieces, cut to show the egg and mince inside.
      [[-0.25, -0.2], [0.25, -0.2], [-0.25, 0.25], [0.25, 0.25]].forEach(([x, z], index) => {
        dish.add('food', lumpy(box(0.42, 0.1, 0.42), 0.04, index), look.base, { at: [x, top + 0.05 + (index === 3 ? 0.1 : 0), z], rot: [0, 0.1 * index, 0], jitter: 0.1 });
        dish.add('food', box(0.38, 0.05, 0.02), look.accent, { at: [x, top + 0.05 + (index === 3 ? 0.1 : 0), z + 0.21], rot: [0, 0.1 * index, 0] });
      });
      sides(dish, { ...look, sides: [{ color: '#F1E2E6', topping: 'veg' }] }, top);
      return;
    }
    if (shape === 'uttapam' || shape === 'appam') {
      const thick = shape === 'uttapam' ? 0.09 : 0.05;
      dish.add('food', lumpy(cylinder(0.6, 0.6, thick, 40), 0.03, 1), look.base, { at: [-0.1, top + thick / 2, -0.1], jitter: 0.06 });
      if (shape === 'appam') dish.add('food', torus(0.55, 0.06, TAU, 10, 48), look.accent, { at: [-0.1, top + 0.05, -0.1], rot: [Math.PI / 2, 0, 0] });
      else {
        for (let index = 0; index < 30; index++) {
          const [x, z] = dish.spot(0.5, -0.1, -0.1);
          dish.add('food', box(0.06, 0.03, 0.06), [look.accent, '#E9E2F0', CHILI][index % 3], { at: [x, top + thick + 0.01, z], rot: [0, dish.random() * 3, 0] });
        }
      }
      sides(dish, look, top);
      return;
    }
    const roti = shape === 'roti';
    const thick = shape === 'thick' ? 0.07 : roti ? 0.03 : 0.04;
    for (let layer = 0; layer < 3; layer++) {
      dish.add('food', lumpy(cylinder(roti ? 0.55 : 0.62, roti ? 0.55 : 0.62, thick, 40), 0.04, layer), look.base, {
        at: [layer * 0.06 - 0.06, top + thick / 2 + layer * thick, layer * 0.04 - 0.1], rot: [0, layer * 0.8, 0], scale: [roti ? 1 : 1.12, 1, 1], jitter: 0.12,
      });
    }
    for (let index = 0; index < 26; index++) {
      const [x, z] = dish.spot(0.5);
      dish.add('food', sphere(0.035, 8, 6).scale(1.4, 0.25, 1), look.accent ?? '#8A5A2B', { at: [x + 0.06, top + thick * 3 + 0.004, z - 0.02], jitter: 0.4 });
    }
    sides(dish, look, top);
  },

  puffed: (dish, look) => {
    const top = plate(dish);
    if (look.shape === 'bhature') {
      dish.add('food', lumpy(sphere(0.58, 32, 20), 0.05, 2), look.base, { at: [-0.15, top + 0.16, -0.15], scale: [1, 0.3, 1.1], jitter: 0.06 });
    } else {
      const spots: V3[] = [[-0.3, 0, -0.25], [0.25, 0, -0.3], [-0.05, 0.08, 0.05], [-0.4, 0.02, 0.25]];
      spots.forEach(([x, lift, z], index) => {
        dish.add('food', lumpy(sphere(0.34, 24, 16), 0.05, index), look.base, { at: [x, top + 0.12 + lift, z], scale: [1, 0.36, 1], rot: [0.1 * index, index, 0], jitter: 0.1 });
      });
    }
    sides(dish, look, top);
  },

  crepe: (dish, look) => {
    const top = plate(dish, 1.12);
    if (look.shape === 'patishapta') {
      for (let index = 0; index < 3; index++) {
        const z = -0.35 + index * 0.28;
        dish.add('food', cylinder(0.1, 0.1, 0.8, 24), look.base, { at: [-0.1, top + 0.1, z], rot: [0, 0.2, Math.PI / 2], jitter: 0.05 });
        dish.add('food', disc(0.08, 16), look.accent, { at: [0.3, top + 0.1, z - 0.08], rot: [0, 0.2, Math.PI / 2] });
      }
      return;
    }
    // A rolled dosa, its golden outside and the potato masala showing at the end.
    dish.add('food', cylinder(0.17, 0.24, 1.55, 40, true), look.base, { at: [-0.05, top + 0.22, -0.25], rot: [0, 0.3, Math.PI / 2], jitter: 0.1 });
    dish.add('food', disc(0.17), '#E2B23A', { at: [-0.79, top + 0.22, -0.47], rot: [0, 0.3, Math.PI / 2] });
    sides(dish, look, top);
  },

  steamed: (dish, look) => {
    const top = plate(dish);
    const spots: [number, number][] = [[-0.35, -0.25], [0.2, -0.3], [-0.1, 0.1], [-0.55, 0.2]];
    spots.forEach(([x, z], index) => dish.add('food', sphere(0.25, 24, 16), look.base, { at: [x, top + 0.08, z], scale: [1, 0.36, 1], jitter: 0.05, rot: [0, index, 0] }));
    sides(dish, look, top);
  },

  squares: (dish, look) => {
    const top = plate(dish);
    const shape = look.shape;
    for (let index = 0; index < 6; index++) {
      const [x, z] = [((index % 3) - 1) * 0.36, (Math.floor(index / 3) - 0.5) * 0.4 - 0.08];
      const at = (h: number): V3 => [x, top + h, z];
      const turn: V3 = [0, dish.wobble() * 0.4, 0];
      if (shape === 'cheese') dish.add('food', cylinder(0.3, 0.3, 0.2, 16, false, 0, 0.8), look.base, { at: at(0.1), rot: [0, index, 0], jitter: 0.1 });
      else if (shape === 'sandesh') {
        // Round sandesh, pressed with a pattern on top.
        dish.add('food', lumpy(sphere(0.15, 20, 12), 0.03, index), look.base, { at: at(0.05), scale: [1, 0.45, 1], jitter: 0.06 });
        dish.add('food', torus(0.08, 0.012, TAU, 6, 24), look.accent, { at: at(0.115), rot: [Math.PI / 2, 0, 0] });
      } else if (shape === 'dhokla') {
        dish.add('food', box(0.3, 0.2, 0.3), look.base, { at: at(0.1), rot: turn, jitter: 0.06 });
        for (let seed = 0; seed < 6; seed++) dish.add('food', sphere(0.014, 6, 4), look.accent, { at: [x + dish.wobble() * 0.24, top + 0.205, z + dish.wobble() * 0.24] });
        dish.add('food', box(0.06, 0.01, 0.04), HERB, { at: [x, top + 0.205, z] });
      } else if (shape === 'khandvi') {
        dish.add('food', cylinder(0.08, 0.08, 0.28, 16), look.base, { at: at(0.08), rot: [0, turn[1], Math.PI / 2] });
        dish.add('food', sphere(0.014, 6, 4), look.accent, { at: at(0.165) });
      } else if (shape === 'layered') {
        for (let layer = 0; layer < 4; layer++) dish.add('food', box(0.3, 0.035, 0.24), look.base, { at: at(0.02 + layer * 0.036), rot: [0, turn[1] + layer * 0.05, 0], jitter: 0.12 });
      } else if (shape === 'puttu') {
        dish.add('food', cylinder(0.14, 0.14, 0.32, 24), look.base, { at: at(0.16) });
        dish.add('food', disc(0.13, 24), look.accent, { at: at(0.322) });
      } else if (shape === 'tiny') {
        for (let piece = 0; piece < 5; piece++) dish.add('food', box(0.07, 0.07, 0.07), look.base, { at: [x + dish.wobble() * 0.2, top + 0.04, z + dish.wobble() * 0.2], rot: dish.turn() });
      } else {
        dish.add('food', box(0.28, 0.14, 0.28), look.base, { at: at(0.07), rot: turn, jitter: 0.1 });
        for (let speck = 0; speck < 5; speck++) dish.add('food', box(0.03, 0.01, 0.03), look.accent, { at: [x + dish.wobble() * 0.2, top + 0.145, z + dish.wobble() * 0.2], jitter: 0.3 });
      }
    }
    sides(dish, look, top);
  },

  pizza: (dish, look) => {
    dish.add('wood', cylinder(1.05, 1.05, 0.06, 48), '#8A5A34', { at: [0, 0.03, 0] });
    const top = 0.06;
    dish.add('food', cylinder(0.9, 0.9, 0.05, 48), look.base, { at: [0, top + 0.025, 0] });
    dish.add('food', torus(0.88, 0.07, TAU, 10, 64), look.base, { at: [0, top + 0.06, 0], rot: [Math.PI / 2, 0, 0], jitter: 0.1 });
    dish.add('glossy', disc(0.82), look.accent, { at: [0, top + 0.052, 0] });
    for (let index = 0; index < 34; index++) {
      const [x, z] = dish.spot(0.75);
      dish.add('food', lumpy(sphere(0.1, 10, 8), 0.2, index), '#F6E3A0', { at: [x, top + 0.06, z], scale: [1, 0.25, 1], jitter: 0.15 });
    }
    for (let index = 0; index < 9; index++) {
      const [x, z] = dish.spot(0.68);
      dish.add('food', cylinder(0.09, 0.09, 0.02, 20), '#A83228', { at: [x, top + 0.075, z], jitter: 0.15 });
    }
    for (let index = 0; index < 3; index++) dish.add('food', box(1.75, 0.012, 0.012), '#7A4A22', { at: [0, top + 0.08, 0], rot: [0, (index * Math.PI) / 3, 0] });
  },

  burger: (dish, look) => {
    const top = plate(dish, 0.95);
    let y = top;
    const layer = (shape: THREE.BufferGeometry, color: string, height: number, material: Material = 'food', place: Place = {}) => {
      dish.add(material, shape, color, { at: [0, y + height / 2, 0], ...place });
      y += height;
    };
    layer(lumpy(cylinder(0.55, 0.5, 0.16, 40), 0.03, 1), look.base, 0.16);
    layer(lumpy(cylinder(0.6, 0.6, 0.15, 40), 0.06, 2), look.accent, 0.15);
    layer(box(0.95, 0.025, 0.95), '#F2B33A', 0.025, 'food', { rot: [0, Math.PI / 4, 0] });
    layer(lumpy(cylinder(0.64, 0.64, 0.035, 40), 0.15, 3), '#6FAE4E', 0.035);
    layer(cylinder(0.5, 0.5, 0.04, 32), '#D7402E', 0.04);
    dish.add('food', dome(0.58, 32), look.base, { at: [0, y, 0], scale: [1, 0.62, 1] });
    for (let index = 0; index < 30; index++) {
      const angle = dish.random() * TAU;
      const lift = Math.acos(0.35 + dish.random() * 0.6);
      dish.add('food', sphere(0.022, 6, 4).scale(1.6, 0.6, 1), '#FBF4E2', {
        at: [Math.sin(lift) * Math.cos(angle) * 0.58, y + Math.cos(lift) * 0.36, Math.sin(lift) * Math.sin(angle) * 0.58], rot: [0, angle, 0],
      });
    }
  },

  pav: (dish, look) => {
    const top = plate(dish, 1.1);
    if (look.shape === 'vada') {
      // Vada pav: a soft bun with a fried potato vada inside, a fried green chilli alongside.
      dish.add('food', lumpy(box(0.6, 0.16, 0.6), 0.05, 1), look.base, { at: [0, top + 0.08, 0], rot: [0, 0.3, 0] });
      dish.add('food', lumpy(sphere(0.27, 20, 14), 0.08, 2), look.accent, { at: [0, top + 0.22, 0], scale: [1, 0.55, 1] });
      dish.add('food', lumpy(box(0.6, 0.16, 0.6), 0.05, 3), look.base, { at: [0, top + 0.36, 0], rot: [0, 0.3, 0] });
      dish.add('glossy', capsule(0.03, 0.3, 8), CHILI, { at: [0.55, top + 0.04, 0.35], rot: [Math.PI / 2, 0, 0.4] });
      return;
    }
    // Pav bhaji: the bhaji with butter and chopped onion, two buttered pav alongside.
    dish.add('glossy', lumpy(dome(0.45, 32), 0.06, 1), look.accent, { at: [-0.25, top, 0.1], scale: [1, 0.45, 1] });
    dish.add('food', box(0.12, 0.08, 0.12), '#F6E3A0', { at: [-0.25, top + 0.22, 0.1], rot: [0, 0.4, 0] });
    for (let index = 0; index < 20; index++) {
      const [x, z] = dish.spot(0.25, -0.25, 0.1);
      dish.add('food', box(0.04, 0.02, 0.04), index % 3 ? '#F1E2E6' : HERB, { at: [x, top + 0.2, z] });
    }
    [[0.45, -0.3], [0.5, 0.15]].forEach(([x, z], index) => dish.add('food', lumpy(box(0.36, 0.2, 0.36), 0.06, index + 4), look.base, { at: [x, top + 0.1, z], rot: [0, 0.2 * index, 0], jitter: 0.1 }));
    dish.add('food', cylinder(0.12, 0.12, 0.03, 3), '#E9E26A', { at: [-0.1, top + 0.03, -0.55] });
  },

  sandwich: (dish, look) => {
    const top = plate(dish);
    [[-0.28, 0, 0], [0.3, 0.14, 0.9]].forEach(([x, lean, turn], half) => {
      let y = top;
      const layers: [string, number][] = [[look.base, 0.11], [look.accent, 0.04], ['#D7402E', 0.035], ['#F2C14E', 0.025], [look.base, 0.11]];
      for (const [color, height] of layers) {
        dish.add('food', cylinder(0.5, 0.5, height, 3), color, { at: [x, y + height / 2 + lean * 0.5, half * 0.1], rot: [lean, turn + Math.PI / 6, 0], jitter: 0.08 });
        y += height;
      }
    });
  },

  hotdog: (dish, look) => {
    const top = plate(dish);
    dish.add('food', capsule(0.22, 0.85, 16), look.base, { at: [0, top + 0.13, 0], rot: [0, 0, Math.PI / 2], scale: [1, 1, 1.3] });
    dish.add('food', capsule(0.12, 1.0, 12), look.accent, { at: [0, top + 0.3, 0], rot: [0, 0, Math.PI / 2] });
    const points: V3[] = Array.from({ length: 12 }, (_, step) => [-0.5 + step * 0.09, top + 0.43, step % 2 ? 0.06 : -0.06]);
    dish.add('glossy', tube(points, 0.022, 64, 6), '#F2C230');
  },

  taco: (dish, look) => {
    const top = plate(dish);
    [-0.25, 0.25].forEach((z, index) => {
      // A U-shaped shell lying along x, open at the top.
      dish.add('food', cylinder(0.3, 0.3, 0.75, 32, true, Math.PI, Math.PI), look.base, { at: [0, top + 0.31, z], rot: [0, 0.15 * (index ? -1 : 1), Math.PI / 2], jitter: 0.08 });
      const fill: [string, number][] = [[look.accent, 10], ['#6FAE4E', 8], ['#D7402E', 5], ['#F6E3A0', 5]];
      for (const [color, count] of fill) {
        for (let piece = 0; piece < count; piece++) {
          dish.add('food', lumpy(new THREE.IcosahedronGeometry(0.06, 1), 0.2, piece), color, { at: [dish.wobble() * 0.6, top + 0.3 + dish.random() * 0.08, z + dish.wobble() * 0.2], jitter: 0.2 });
        }
      }
    });
  },

  wrap: (dish, look) => {
    const top = plate(dish);
    [[-0.05, -0.3, 0.3], [0.05, 0.3, -0.25]].forEach(([x, z, turn]) => {
      dish.add('food', cylinder(0.18, 0.18, 1.1, 32), look.base, { at: [x, top + 0.18, z], rot: [0, turn, Math.PI / 2], jitter: 0.1 });
      dish.add('food', disc(0.16), look.accent, { at: [x + Math.cos(turn) * 0.56, top + 0.18, z - Math.sin(turn) * 0.56], rot: [0, turn, Math.PI / 2] });
      dish.add('food', cylinder(0.19, 0.19, 0.45, 32, true), WHITE, { at: [x - Math.cos(turn) * 0.3, top + 0.18, z + Math.sin(turn) * 0.3], rot: [0, turn, Math.PI / 2] });
    });
  },

  fries: (dish, look) => {
    if (look.shape === 'plate') {
      // Thin, crisp matchsticks, as Bengali aloo bhaja is cut.
      const top = plate(dish);
      for (let index = 0; index < 120; index++) {
        const [x, z] = dish.spot(0.55);
        dish.add('food', box(0.025, 0.025, 0.3), look.base, { at: [x, top + 0.03 + (0.55 - Math.hypot(x, z)) * 0.3, z], rot: [dish.wobble() * 0.5, dish.random() * TAU, dish.wobble() * 0.5], jitter: 0.2 });
      }
      return;
    }
    const top = plate(dish, 0.9);
    dish.add('food', cylinder(0.42, 0.3, 0.6, 4, true), look.accent, { at: [0, top + 0.3, 0], rot: [0, Math.PI / 4, 0] });
    for (let index = 0; index < 34; index++) {
      const [x, z] = dish.spot(0.22);
      dish.add('food', box(0.06, 0.62, 0.06), look.base, { at: [x, top + 0.55 + dish.random() * 0.15, z], rot: [dish.wobble() * 0.5, dish.random(), dish.wobble() * 0.5], jitter: 0.15 });
    }
  },

  snacks: (dish, look) => {
    const top = plate(dish);
    type Piece = { geometry: () => THREE.BufferGeometry; lift: number; count: number; scale?: V3; flat: () => V3; spread: number };
    const pieces: Record<string, Piece> = {
      // Singara and samosa: tall three-sided pyramids.
      triangle: { geometry: () => lumpy(cylinder(0, 0.3, 0.42, 3), 0.04, 2), lift: 0.15, count: 5, flat: () => [0, dish.random() * TAU, 0], spread: 0.45 },
      ring: { geometry: () => lumpy(torus(0.2, 0.09, TAU, 12, 32), 0.06, 3), lift: 0.08, count: 4, flat: () => [Math.PI / 2 + dish.wobble() * 0.4, 0, 0], spread: 0.45 },
      blob: { geometry: () => lumpy(new THREE.IcosahedronGeometry(0.17, 3), 0.28, 4), lift: 0.12, count: 8, flat: () => dish.turn(), spread: 0.45 },
      // Chicken 65 and chilli chicken: small, craggy fried pieces.
      chunks: { geometry: () => lumpy(new THREE.IcosahedronGeometry(0.11, 2), 0.55, 9), lift: 0.08, count: 14, scale: [1.4, 0.75, 0.9], flat: () => dish.turn(), spread: 0.45 },
      patty: { geometry: () => lumpy(cylinder(0.24, 0.24, 0.12, 24), 0.08, 5), lift: 0.06, count: 4, flat: () => [dish.wobble() * 0.3, 0, dish.wobble() * 0.3], spread: 0.42 },
      chip: { geometry: () => cylinder(0.16, 0.16, 0.012, 4), lift: 0.05, count: 18, flat: () => [dish.wobble() * 0.6, dish.random() * TAU, dish.wobble() * 0.6], spread: 0.55 },
      slice: { geometry: () => lumpy(cylinder(0.3, 0.3, 0.05, 28), 0.04, 6), lift: 0.03, count: 5, flat: () => [dish.wobble() * 0.2, 0, dish.wobble() * 0.2], spread: 0.4 },
      // Beguni: long, flat slices of aubergine in gram-flour batter.
      beguni: { geometry: () => lumpy(sphere(0.3, 20, 12), 0.06, 7), lift: 0.05, count: 4, scale: [1.25, 0.2, 0.45], flat: () => [0, 0, 0], spread: 0 },
      papad: { geometry: () => lumpy(cylinder(0.5, 0.5, 0.012, 40), 0.03, 8), lift: 0.03, count: 3, flat: () => [dish.wobble() * 0.3, 0, dish.wobble() * 0.3], spread: 0.15 },
    };
    const kind = pieces[look.shape ?? 'blob'] ?? pieces.blob;
    for (let index = 0; index < kind.count; index++) {
      const [x, z] = look.shape === 'beguni' ? [-0.1 + (index % 2) * 0.12, -0.45 + index * 0.27] : dish.spot(kind.spread, -0.08, -0.1);
      const lift = top + kind.lift + (look.shape === 'chip' || look.shape === 'papad' ? index * 0.02 : 0);
      const rot = kind.flat();
      dish.add('food', kind.geometry(), look.base, { at: [x, lift, z], rot, scale: kind.scale, jitter: 0.2 });
      // Begun bhaja and uchhe bhaja keep their skin round the edge.
      if (look.shape === 'slice') dish.add('food', cylinder(0.31, 0.31, 0.05, 28, true), look.accent, { at: [x, lift, z], rot });
    }
    // Curry leaves on chicken 65, coriander on pakoras.
    garnish(dish, look.garnish, top + 0.2, 0.45);
    sides(dish, look, top);
  },

  chaat: (dish, look) => {
    const top = plate(dish);
    for (let index = 0; index < 7; index++) {
      const [x, z] = dish.spot(0.5, -0.08, -0.12);
      dish.add('food', sphere(0.17, 16, 12), look.base, { at: [x, top + 0.13, z], scale: [1, 0.8, 1], jitter: 0.12 });
      dish.add('food', disc(0.1, 16), '#7A4A2A', { at: [x, top + 0.268, z] });
    }
    for (let index = 0; index < 60; index++) {
      const [x, z] = dish.spot(0.6, -0.08, -0.12);
      const colour = [look.accent, '#F2C14E', '#C9302C', HERB][index % 4];
      dish.add('food', capsule(0.012, 0.04, 4), colour, { at: [x, top + 0.28 + dish.random() * 0.05, z], rot: dish.turn() });
    }
    sides(dish, look, top);
  },

  cone: (dish, look) => {
    // Jhalmuri: a newspaper cone of puffed rice with onion, chilli, coriander and peanuts, spilling onto the plate.
    const top = plate(dish);
    dish.add('food', cylinder(0.36, 0.02, 0.95, 24, true), '#CFC6B0', { at: [-0.1, top + 0.3, -0.1], rot: [0, 0, -1.2], jitter: 0.05 });
    for (let index = 0; index < 70; index++) {
      const [y, z] = dish.spot(0.3);
      dish.add('food', capsule(0.024, 0.04, 5), look.base, { at: [0.33, top + 0.48 + y * 0.9, -0.1 + z], rot: dish.turn(), jitter: 0.12 });
    }
    const mix: [string, number][] = [[look.base, 200], ['#B8803A', 18], ['#C9302C', 14], [HERB, 18], ['#E9E2F0', 14], [look.accent, 20]];
    for (const [color, count] of mix) {
      for (let index = 0; index < count; index++) {
        const [x, z] = dish.spot(0.45, 0.32, 0.18);
        const lift = (1 - Math.hypot(x - 0.32, z - 0.18) / 0.45) * 0.2;
        const shape = color === look.base ? capsule(0.024, 0.04, 5) : box(0.04, 0.025, 0.04);
        dish.add('food', shape, color, { at: [x, top + 0.03 + lift + dish.random() * 0.03, z], rot: dish.turn(), jitter: 0.15 });
      }
    }
  },

  paturi: (dish, look) => {
    // Bhetki paturi: fish in mustard paste, steamed in banana leaf parcels tied with string; one opened.
    const top = plate(dish, 1.1);
    [[-0.35, -0.25], [0.3, -0.3]].forEach(([x, z], index) => {
      dish.add('food', lumpy(box(0.5, 0.16, 0.34), 0.06, index), LEAF, { at: [x, top + 0.08, z], rot: [0, 0.3 * (index ? -1 : 1), 0], jitter: 0.12 });
      dish.add('food', torus(0.2, 0.01, TAU, 6, 24), '#E9DFC4', { at: [x, top + 0.08, z], rot: [0, 0.3 * (index ? -1 : 1) + Math.PI / 2, 0], scale: [1, 0.55, 1] });
    });
    // The opened parcel: a pointed leaf with its midrib, the fillet thick with mustard paste.
    dish.add('food', lumpy(cylinder(0.5, 0.5, 0.02, 40), 0.04, 4), look.accent, { at: [0, top + 0.012, 0.3], scale: [1.55, 1, 0.62] });
    dish.add('food', box(1.4, 0.01, 0.025), '#7FAE4A', { at: [0, top + 0.024, 0.3] });
    dish.add('glossy', lumpy(sphere(0.3, 28, 14), 0.09, 5), look.base, { at: [0, top + 0.06, 0.3], scale: [1.55, 0.26, 0.6] });
    for (let index = 0; index < 30; index++) {
      const [x, z] = dish.spot(0.32, 0, 0.3);
      dish.add('food', sphere(0.012, 6, 4), '#6A4A1E', { at: [x * 1.4, top + 0.13, z], jitter: 0.3 });
    }
    dish.add('glossy', capsule(0.024, 0.24, 8), CHILI, { at: [0.15, top + 0.14, 0.3], rot: [Math.PI / 2, 0, 0.3] });
  },

  drumsticks: (dish, look) => {
    const top = plate(dish);
    for (let index = 0; index < 4; index++) {
      const angle = (index / 4) * TAU + 0.3;
      const x = Math.cos(angle) * 0.32;
      const z = Math.sin(angle) * 0.32;
      dish.add('food', lumpy(sphere(0.22, 18, 14), 0.1, index), look.base, { at: [x, top + 0.14, z], scale: [1.35, 0.75, 0.9], rot: [0, -angle, 0], jitter: 0.15 });
      dish.add('food', cylinder(0.035, 0.035, 0.28, 10), WHITE, { at: [x + Math.cos(angle) * 0.36, top + 0.14, z + Math.sin(angle) * 0.36], rot: [0, -angle, Math.PI / 2] });
    }
    dish.add('food', cylinder(0.13, 0.13, 0.04, 3), look.accent, { at: [0, top + 0.04, 0] });
    for (let index = 0; index < 3; index++) dish.add('food', torus(0.1, 0.015), '#C98AB0', { at: [0.1 * index - 0.1, top + 0.03, 0.62], rot: [Math.PI / 2, 0, 0] });
  },

  steak: (dish, look) => {
    const top = plate(dish);
    dish.add('food', lumpy(box(0.85, 0.16, 0.58), 0.06, 3), look.base, { at: [-0.05, top + 0.08, 0], rot: [0, 0.3, 0] });
    for (let index = 0; index < 5; index++) dish.add('food', box(0.02, 0.01, 0.62), look.accent, { at: [-0.35 + index * 0.15, top + 0.165, 0], rot: [0, 0.9, 0] });
    for (let index = 0; index < 3; index++) dish.add('food', sphere(0.11, 12, 10), '#E9CB7A', { at: [0.55, top + 0.1, -0.3 + index * 0.25], jitter: 0.15 });
    for (let index = 0; index < 4; index++) dish.add('food', capsule(0.015, 0.25, 4), HERB, { at: [0.15 + index * 0.05, top + 0.2, 0.42], rot: [Math.PI / 2, 0, 0.3 * index] });
  },

  skewer: (dish, look) => {
    const top = plate(dish);
    [-0.2, 0.2].forEach((z, row) => {
      dish.add('wood', cylinder(0.018, 0.018, 1.7, 8), '#C9A06A', { at: [0, top + 0.14, z], rot: [0, 0.2, Math.PI / 2] });
      for (let index = 0; index < 7; index++) {
        const colour = index % 3 === 1 ? '#F1E2E6' : index % 3 === 2 ? look.accent : look.base;
        dish.add('food', lumpy(box(0.15, 0.15, 0.15), 0.12, index + row), colour, { at: [-0.55 + index * 0.18, top + 0.14, z - (index * 0.18 - 0.55) * 0.2], rot: dish.turn(), jitter: 0.15 });
      }
    });
    dish.add('food', cylinder(0.14, 0.14, 0.04, 3), '#E9E26A', { at: [0.6, top + 0.05, 0.55] });
    sides(dish, { ...look, sides: [SIDE_MINT] }, top);
  },

  sausages: (dish, look) => {
    const top = plate(dish);
    for (let index = 0; index < 4; index++) {
      const z = -0.36 + index * 0.24;
      dish.add('food', capsule(0.1, 0.55, 14), look.base, { at: [-0.1, top + 0.1, z], rot: [0, 0.15, Math.PI / 2], jitter: 0.12 });
      for (let mark = 0; mark < 3; mark++) dish.add('food', box(0.012, 0.01, 0.16), look.accent, { at: [-0.3 + mark * 0.2, top + 0.2, z], rot: [0, 0.6, 0] });
    }
    sides(dish, look, top);
  },

  fillet: (dish, look) => {
    const top = plate(dish);
    const shape = look.shape;
    const rough = shape === 'battered' || shape === 'kabiraji' ? 0.12 : shape === 'crumbed' ? 0.08 : 0.05;
    dish.add('food', lumpy(sphere(0.5, 32, 16), rough, 7), look.base, { at: [-0.1, top + 0.07, -0.12], scale: [1.4, 0.26, 0.8], rot: [0, 0.3, 0], jitter: 0.08 });
    if (shape === 'kabiraji') {
      // Kabiraji: a lacy net of fried egg over the fillet.
      for (let index = 0; index < 18; index++) {
        const [x, z] = dish.spot(0.5, -0.1, -0.12);
        dish.add('food', torus(0.06, 0.012, TAU, 5, 12), '#E9C46A', { at: [x, top + 0.14, z], rot: [Math.PI / 2 + dish.wobble(), 0, 0] });
      }
    }
    if (shape === 'battered') {
      for (let index = 0; index < 14; index++) dish.add('food', box(0.06, 0.06, 0.5), '#F2C14E', { at: [0.5 + dish.wobble() * 0.3, top + 0.05 + index * 0.012, -0.3 + dish.wobble() * 0.3], rot: [0, dish.random() * 3, 0], jitter: 0.15 });
    } else {
      // Kolkata fish fry comes with onion rings, a wedge of lemon and kasundi.
      for (let index = 0; index < 4; index++) dish.add('food', torus(0.1, 0.015), look.accent, { at: [0.5 + index * 0.04, top + 0.03 + index * 0.01, -0.35], rot: [Math.PI / 2, 0, 0] });
      dish.add('food', cylinder(0.12, 0.12, 0.03, 3), '#E9E26A', { at: [0.62, top + 0.03, 0.05] });
    }
    sides(dish, look, top);
  },

  prawns: (dish, look) => {
    const top = plate(dish);
    for (let index = 0; index < 8; index++) {
      const angle = (index / 8) * TAU;
      const at: V3 = [Math.cos(angle) * 0.45, top + 0.06, Math.sin(angle) * 0.45];
      dish.add('food', torus(0.13, 0.055, Math.PI * 1.3, 8, 20), look.base, { at, rot: [Math.PI / 2, 0, angle], jitter: 0.12 });
      dish.add('food', cylinder(0, 0.07, 0.12, 6), '#C9502A', { at: [at[0] + Math.cos(angle + 1.6) * 0.13, at[1], at[2] + Math.sin(angle + 1.6) * 0.13], rot: [Math.PI / 2, 0, angle] });
    }
    dish.add('food', cylinder(0.14, 0.14, 0.04, 3), '#E9E26A', { at: [0, top + 0.04, 0] });
  },

  sushi: (dish, look) => {
    dish.add('wood', box(1.9, 0.08, 1.1), '#B98A5A', { at: [0, 0.04, 0] });
    const top = 0.08;
    for (let index = 0; index < 6; index++) {
      const x = -0.7 + (index % 3) * 0.3;
      const z = -0.2 + Math.floor(index / 3) * 0.32;
      dish.add('food', cylinder(0.14, 0.14, 0.16, 24), look.accent, { at: [x, top + 0.08, z] });
      dish.add('food', disc(0.125, 24), WHITE, { at: [x, top + 0.161, z] });
      dish.add('food', disc(0.05, 16), look.base, { at: [x, top + 0.162, z] });
    }
    for (let index = 0; index < 3; index++) {
      const z = -0.32 + index * 0.32;
      dish.add('food', capsule(0.09, 0.22, 10), WHITE, { at: [0.5, top + 0.09, z], rot: [0, 0, Math.PI / 2] });
      dish.add('glossy', box(0.44, 0.05, 0.2), look.base, { at: [0.5, top + 0.2, z] });
    }
    dish.add('food', lumpy(sphere(0.07, 10, 8), 0.2, 3), '#7FB24A', { at: [0.05, top + 0.05, 0.42] });
  },

  egg: (dish, look) => {
    const top = plate(dish);
    const shape = look.shape ?? 'fried';
    if (shape === 'fried') {
      [[-0.25, -0.1], [0.28, 0.15]].forEach(([x, z], index) => {
        dish.add('food', lumpy(cylinder(0.4, 0.4, 0.03, 32), 0.12, index), look.base, { at: [x, top + 0.015, z] });
        dish.add('glossy', dome(0.14), look.accent, { at: [x + 0.04, top + 0.03, z], scale: [1, 0.6, 1] });
      });
    } else if (shape === 'boiled') {
      // Halves lying cut side up, yolks showing.
      for (let index = 0; index < 4; index++) {
        const angle = (index / 4) * TAU + 0.4;
        const [x, z] = [Math.cos(angle) * 0.33, Math.sin(angle) * 0.33];
        dish.add('food', dome(0.17), WHITE, { at: [x, top + 0.15, z], rot: [Math.PI, angle, 0], scale: [1, 0.9, 1.35] });
        dish.add('food', disc(0.09, 20), look.accent, { at: [x, top + 0.153, z] });
      }
    } else if (shape === 'omelette') {
      dish.add('food', lumpy(cylinder(0.6, 0.6, 0.1, 40, false, 0, Math.PI), 0.04, 2), '#F2C64A', { at: [0, top + 0.05, 0.15], jitter: 0.06 });
      for (let index = 0; index < 20; index++) {
        const [x, z] = dish.spot(0.4, 0, -0.05);
        dish.add('food', box(0.04, 0.012, 0.03), index % 2 ? HERB : '#C98AB0', { at: [x, top + 0.1, z] });
      }
    } else {
      for (let index = 0; index < 28; index++) {
        const [x, z] = dish.spot(0.45);
        dish.add('food', lumpy(new THREE.IcosahedronGeometry(0.08, 1), 0.25, index), '#F2C64A', { at: [x, top + 0.05 + dish.random() * 0.06, z], jitter: 0.15 });
      }
      for (let index = 0; index < 16; index++) {
        const [x, z] = dish.spot(0.4);
        dish.add('food', box(0.04, 0.02, 0.04), index % 2 ? '#D7402E' : HERB, { at: [x, top + 0.13, z] });
      }
    }
  },

  salad: (dish, look) => {
    const surface = bowl(dish, 0.85, null, 'wood', '#9C6A3E');
    for (let index = 0; index < 28; index++) {
      const [x, z] = dish.spot(surface.r * 0.75);
      dish.add('food', new THREE.SphereGeometry(0.3, 8, 6, 0, 1.2, 0, 1), look.base, { at: [x, surface.y - 0.05 + dish.random() * 0.12, z], rot: dish.turn(), jitter: 0.35 });
    }
    for (let index = 0; index < 6; index++) {
      const [x, z] = dish.spot(surface.r * 0.6);
      dish.add('food', new THREE.SphereGeometry(0.11, 12, 8, 0, Math.PI / 2), look.accent, { at: [x, surface.y + 0.08, z], rot: dish.turn() });
      dish.add('food', cylinder(0.09, 0.09, 0.025, 16), '#9CC46A', { at: [-x, surface.y + 0.1, -z], rot: dish.turn() });
    }
    if (look.shape === 'creamy') {
      for (let index = 0; index < 8; index++) {
        const [x, z] = dish.spot(0.4);
        dish.add('glossy', lumpy(sphere(0.07, 10, 8), 0.2, index), '#FBF4E6', { at: [x, surface.y + 0.14, z] });
      }
    }
  },

  noodles: (dish, look) => {
    const top = plate(dish);
    if (look.shape === 'nest') {
      // Idiyappam: nests of thin rice noodles.
      [[-0.3, -0.2], [0.25, -0.25], [-0.05, 0.2]].forEach(([cx, cz]) => {
        for (let strand = 0; strand < 14; strand++) {
          const start = dish.random() * TAU;
          const points: V3[] = Array.from({ length: 12 }, (_, step) => {
            const angle = start + step * 0.9;
            const r = 0.1 + 0.1 * Math.sin(step * 1.3 + strand);
            return [cx + Math.cos(angle) * r, top + 0.03 + step * 0.006, cz + Math.sin(angle) * r];
          });
          dish.add('food', tube(points, 0.012, 48, 5), look.base);
        }
      });
      sides(dish, look, top);
      return;
    }
    for (let strand = 0; strand < 36; strand++) {
      const start = dish.random() * TAU;
      const radius = 0.2 + dish.random() * 0.35;
      const points: V3[] = Array.from({ length: 10 }, (_, step) => {
        const angle = start + step * 0.55;
        const r = radius * (0.6 + 0.4 * Math.sin(step + strand));
        return [Math.cos(angle) * r, top + 0.05 + (0.3 - r * 0.45) * (0.5 + 0.5 * dish.random()), Math.sin(angle) * r];
      });
      dish.add('food', tube(points, 0.025, 40, 6), look.base, { jitter: 0.1 });
    }
    if (look.shape === 'sauce') {
      for (let index = 0; index < 10; index++) {
        const [x, z] = dish.spot(0.3);
        dish.add('glossy', lumpy(sphere(0.1, 12, 8), 0.2, index), look.accent, { at: [x, top + 0.28, z], scale: [1, 0.4, 1] });
      }
    } else topping(dish, 'veg', top + 0.25, 0.3, look);
  },

  dumplings: (dish, look) => {
    const shape = look.shape;
    if (shape === 'crescent') {
      // Puli pitha: half-moon dumplings in sweet milk (dudh puli).
      const surface = bowl(dish, 0.82, look.accent);
      for (let index = 0; index < 5; index++) {
        const [x, z] = dish.spot(surface.r * 0.5);
        dish.add('food', lumpy(cylinder(0.17, 0.17, 0.09, 24, false, 0, Math.PI), 0.05, index), look.base, { at: [x, surface.y + 0.03, z], rot: [Math.PI / 2, dish.random() * TAU, 0], jitter: 0.05 });
      }
      return;
    }
    if (shape === 'modak' || shape === 'fried') {
      const top = plate(dish);
      for (let index = 0; index < 5; index++) {
        const [x, z] = index === 4 ? [-0.05, 0] : [Math.cos((index / 4) * TAU) * 0.35 - 0.05, Math.sin((index / 4) * TAU) * 0.35];
        const outline: [number, number][] = shape === 'modak' ? [[0, 0], [0.2, 0.03], [0.2, 0.12], [0.12, 0.24], [0.03, 0.34], [0, 0.36]] : [[0, 0], [0.2, 0.02], [0.22, 0.1], [0.14, 0.2], [0.04, 0.26], [0, 0.27]];
        dish.add('food', lathe(outline, 1, 10), look.base, { at: [x, top, z], rot: [0, index, 0], jitter: 0.08 });
      }
      sides(dish, look, top);
      return;
    }
    // Momos in a bamboo steamer.
    dish.add('wood', cylinder(0.85, 0.85, 0.3, 40, true), '#C9A06A', { at: [0, 0.15, 0] });
    dish.add('wood', disc(0.84), '#B98A5A', { at: [0, 0.04, 0] });
    const spots: [number, number][] = [[0, 0], [0.42, 0.1], [-0.4, 0.15], [0.12, -0.42], [-0.2, 0.45], [0.25, 0.45]];
    spots.forEach(([x, z], index) => {
      dish.add('food', lathe([[0, 0], [0.2, 0.02], [0.22, 0.1], [0.14, 0.2], [0.04, 0.26], [0, 0.27]], 1, 24), look.base, { at: [x, 0.05, z], rot: [0, index, 0], jitter: 0.06 });
    });
  },

  balls: (dish, look) => {
    const shape = look.shape;
    if (shape === 'dry' || shape === 'tiny') {
      const top = plate(dish);
      if (shape === 'tiny') {
        // Mihidana: a heap of tiny saffron grains.
        for (let index = 0; index < 400; index++) {
          const [x, z] = dish.spot(0.5);
          dish.add('food', sphere(0.018, 6, 4), look.base, { at: [x, top + 0.02 + (0.5 - Math.hypot(x, z)) * 0.4 + dish.random() * 0.02, z], jitter: 0.15 });
        }
        return;
      }
      const spots: V3[] = [[-0.25, 0.2, -0.22], [0.25, 0.2, -0.22], [-0.25, 0.2, 0.22], [0.25, 0.2, 0.22], [0, 0.5, 0]];
      spots.forEach(([x, y, z], index) => {
        dish.add('food', lumpy(sphere(0.2, 20, 14), 0.08, index), look.base, { at: [x, top + y, z], jitter: 0.1 });
        if (look.accent !== look.base) dish.add('food', sphere(0.025, 6, 4), look.accent, { at: [x + 0.1, top + y + 0.15, z] });
      });
      return;
    }
    // Rasgulla, gulab jamun and their kin, in syrup (or rasmalai in saffron milk).
    const surface = bowl(dish, 0.8, look.accent);
    const spots: [number, number][] = [[-0.22, -0.15], [0.22, -0.12], [0, 0.22], [-0.3, 0.28]];
    spots.forEach(([x, z], index) => {
      const scale: V3 = shape === 'oval' ? [1.5, 0.85, 0.85] : shape === 'long' ? [1.9, 0.75, 0.75] : shape === 'flat' ? [1.1, 0.5, 1.1] : [1, 1, 1];
      dish.add('glossy', sphere(0.2, 24, 16), look.base, { at: [x, surface.y + 0.07, z], scale, rot: [0, index * 0.7, 0], jitter: 0.08 });
    });
    if (shape === 'flat') garnish(dish, ['herbs'], surface.y + 0.05, surface.r * 0.6);
  },

  spiral: (dish, look) => {
    const top = plate(dish);
    [[-0.3, -0.2], [0.3, -0.15], [0, 0.3], [-0.35, 0.35]].forEach(([x, z], index) => {
      const points: V3[] = Array.from({ length: 30 }, (_, step) => {
        const angle = step * 0.55;
        const r = 0.03 + step * 0.008;
        return [x + Math.cos(angle) * r, top + 0.05 + index * 0.02, z + Math.sin(angle) * r];
      });
      dish.add('glossy', tube(points, 0.04, 90, 8), look.base, { jitter: 0.1 });
    });
  },

  cake: (dish, look) => {
    const top = plate(dish);
    let y = top;
    const layers: [string, number][] = [[look.base, 0.17], [look.accent, 0.05], [look.base, 0.17], [look.accent, 0.07]];
    for (const [color, height] of layers) {
      dish.add('food', wedge(0.85, height), color, { at: [-0.32, y + height / 2, -0.32] });
      y += height;
    }
    dish.add('glossy', sphere(0.08, 14, 10), '#B5222E', { at: [0.05, y + 0.06, 0.05] });
  },

  pie: (dish, look) => {
    const top = plate(dish);
    dish.add('food', wedge(0.85, 0.22), look.accent, { at: [-0.32, top + 0.11, -0.32] });
    dish.add('food', wedge(0.87, 0.05), look.base, { at: [-0.32, top + 0.245, -0.32] });
    dish.add('food', lumpy(sphere(0.12, 14, 10), 0.15, 2), '#FBF4E6', { at: [0.05, top + 0.32, 0.05] });
  },

  icecream: (dish, look) => {
    if (look.shape === 'stick') {
      // Kulfi: a cone of frozen milk on a stick, flecked with pistachio.
      const top = plate(dish);
      dish.add('food', cylinder(0.09, 0.22, 0.75, 24), look.base, { at: [-0.1, top + 0.22, 0], rot: [0, 0.3, Math.PI / 2] });
      dish.add('wood', box(0.05, 0.42, 0.02), '#D9B98A', { at: [0.48, top + 0.22, -0.18], rot: [0, 0.3, Math.PI / 2] });
      for (let index = 0; index < 16; index++) dish.add('food', box(0.03, 0.01, 0.02), '#7FB24A', { at: [-0.4 + dish.random() * 0.6, top + 0.3 + dish.random() * 0.12, dish.wobble() * 0.2] });
      return;
    }
    const surface = bowl(dish, 0.65, null, 'glass', WHITE);
    [look.base, '#E9A0B0', '#6A3A22'].forEach((color, index) => {
      const angle = (index / 3) * TAU;
      dish.add('food', lumpy(sphere(0.26, 20, 14), 0.06, index), color, { at: [Math.cos(angle) * 0.2, surface.y + 0.1 + (index === 2 ? 0.25 : 0), Math.sin(angle) * 0.2] });
    });
    dish.add('food', box(0.08, 0.5, 0.08), look.accent, { at: [0.2, surface.y + 0.45, -0.1], rot: [0.2, 0, -0.3] });
  },

  pancakes: (dish, look) => {
    if (look.shape === 'malpua') {
      // Malpua: small fried pancakes soaked in syrup.
      const surface = bowl(dish, 0.82, look.accent);
      for (let index = 0; index < 4; index++) {
        const [x, z] = dish.spot(surface.r * 0.45);
        dish.add('glossy', lumpy(cylinder(0.2, 0.2, 0.05, 24), 0.08, index), look.base, { at: [x, surface.y + 0.03 + index * 0.02, z], rot: [dish.wobble() * 0.3, 0, dish.wobble() * 0.3], jitter: 0.1 });
      }
      return;
    }
    const top = plate(dish);
    let y = top;
    for (let layer = 0; layer < 4; layer++) {
      if (look.shape === 'waffle') {
        dish.add('food', box(0.7, 0.1, 0.7), look.base, { at: [layer * 0.05, y + 0.05, 0], rot: [0, layer * 0.3, 0] });
        y += 0.1;
        if (layer === 1) break;
      } else {
        dish.add('food', lumpy(cylinder(0.5, 0.5, 0.08, 36), 0.03, layer), look.base, { at: [0, y + 0.04, 0], jitter: 0.1 });
        y += 0.08;
      }
    }
    dish.add('glossy', lumpy(cylinder(0.42, 0.42, 0.02, 32), 0.1, 9), look.accent, { at: [0, y + 0.01, 0] });
    dish.add('food', box(0.14, 0.08, 0.14), '#F6E3A0', { at: [0.05, y + 0.06, 0.05], rot: [0, 0.5, 0] });
  },

  fruit: (dish, look) => {
    const surface = bowl(dish, 0.85, null, 'wood', '#9C6A3E');
    const colours = [look.base, look.base, look.accent, '#F2D24A', look.base];
    colours.forEach((color, index) => {
      const angle = (index / colours.length) * TAU;
      const at: V3 = index === 4 ? [0, surface.y + 0.3, 0] : [Math.cos(angle) * 0.35, surface.y + 0.05, Math.sin(angle) * 0.35];
      dish.add('food', sphere(0.24, 24, 16), color, { at, jitter: 0.12 });
      dish.add('wood', cylinder(0.012, 0.012, 0.08, 6), '#5A3A1E', { at: [at[0], at[1] + 0.26, at[2]] });
    });
  },

  nuts: (dish, look) => {
    const surface = bowl(dish, 0.7, null);
    for (let index = 0; index < 46; index++) {
      const [x, z] = dish.spot(surface.r * 0.75);
      if (index % 3) dish.add('food', sphere(0.06, 10, 8).scale(1.4, 0.6, 0.9), look.base, { at: [x, surface.y - 0.05 + dish.random() * 0.1, z], rot: dish.turn(), jitter: 0.2 });
      else dish.add('food', torus(0.05, 0.03, Math.PI * 1.2, 6, 12), look.accent, { at: [x, surface.y + dish.random() * 0.06, z], rot: dish.turn() });
    }
  },

  thali: (dish, look) => {
    const top = plate(dish, 1.15, 'steel', STEEL);
    if (look.shape === 'breakfast') {
      dish.add('food', lumpy(cylinder(0.3, 0.3, 0.03, 32), 0.12, 1), WHITE, { at: [-0.3, top + 0.015, 0.25] });
      dish.add('glossy', dome(0.11), '#F2B41D', { at: [-0.3, top + 0.03, 0.25], scale: [1, 0.6, 1] });
      for (let index = 0; index < 2; index++) dish.add('food', capsule(0.08, 0.4, 12), look.accent, { at: [0.25, top + 0.08, -0.25 + index * 0.18], rot: [0, 0.2, Math.PI / 2] });
      dish.add('food', box(0.5, 0.06, 0.45), '#E2B06A', { at: [-0.25, top + 0.03, -0.35], rot: [0, 0.3, 0] });
      const side = bowl(dish, 0.26, '#C0502A', 'ceramic', WHITE, [0.45, top, 0.4]);
      topping(dish, 'beans', side.y, side.r * 0.5, look);
      return;
    }
    // Rice in the middle, katoris of dal, curry, sabzi and doi round it, with a wedge of lemon and a green chilli.
    riceMound(dish, { ...look, accent: look.base }, top, 0.1, 0.3, 0.38);
    const katoris: [string, number][] = [[look.accent, Math.PI * 1.1], ['#C2552E', Math.PI * 1.45], ['#5E8E2E', Math.PI * 1.8], ['#F4EFE2', Math.PI * 0.75]];
    katoris.forEach(([color, angle]) => bowl(dish, 0.26, color, 'steel', STEEL, [Math.cos(angle) * 0.72, top, Math.sin(angle) * 0.72]));
    dish.add('food', cylinder(0.12, 0.12, 0.03, 3), '#E9E26A', { at: [-0.55, top + 0.03, 0.5] });
    dish.add('glossy', capsule(0.025, 0.25, 6), CHILI, { at: [0.62, top + 0.03, 0.35], rot: [0, 0.4, Math.PI / 2] });
  },

  veg: (dish, look) => {
    const top = plate(dish);
    if (look.shape === 'greens') {
      // Shaak: a heap of wilted leafy greens.
      for (let index = 0; index < 90; index++) {
        const [x, z] = dish.spot(0.55);
        dish.add('food', box(0.14, 0.012, 0.06), index % 4 ? look.base : look.accent, { at: [x, top + 0.02 + (0.55 - Math.hypot(x, z)) * 0.3 + dish.random() * 0.03, z], rot: [dish.wobble() * 0.8, dish.random() * TAU, dish.wobble() * 0.8], jitter: 0.3 });
      }
      garnish(dish, look.garnish, top + 0.18, 0.4);
      return;
    }
    if (look.shape === 'coated') {
      // Posto: pieces of potato (or gourd) folded into a creamy poppy-seed paste.
      dish.add('food', lumpy(dome(0.52, 32), 0.08, 5), look.base, { at: [0, top, 0], scale: [1, 0.42, 1] });
      for (let index = 0; index < 16; index++) {
        const [x, z] = dish.spot(0.42);
        const lift = top + 0.17 - Math.hypot(x, z) * 0.28;
        if (look.topping === 'gourd') dish.add('food', capsule(0.05, 0.1, 8), '#7FA84A', { at: [x, lift, z], rot: dish.turn(), jitter: 0.2 });
        else dish.add('food', lumpy(box(0.13, 0.13, 0.13), 0.08, index), '#EBD08A', { at: [x, lift, z], rot: dish.turn(), jitter: 0.15 });
        dish.add('food', lumpy(sphere(0.07, 10, 8), 0.2, index), look.base, { at: [x + 0.04, lift + 0.05, z], scale: [1, 0.4, 1] });
      }
      garnish(dish, look.garnish, top + 0.2, 0.35);
      return;
    }
    if (look.shape === 'mash') {
      // Chokka and bharta: a soft mound, flecked with onion and chilli.
      dish.add('food', lumpy(dome(0.55, 32), 0.06, 3), look.base, { at: [0, top, 0], scale: [1, 0.4, 1] });
      for (let index = 0; index < 24; index++) {
        const [x, z] = dish.spot(0.4);
        dish.add('food', box(0.04, 0.02, 0.04), look.accent, { at: [x, top + 0.2 - Math.hypot(x, z) * 0.3, z], rot: dish.turn() });
      }
      topping(dish, look.topping, top + 0.16, 0.3, look);
      garnish(dish, look.garnish, top + 0.18, 0.4);
      return;
    }
    for (let index = 0; index < 34; index++) {
      const [x, z] = dish.spot(0.55);
      const color = index % 3 === 0 ? look.accent : look.base;
      const shape = index % 2 ? box(0.12, 0.08, 0.12) : cylinder(0.08, 0.08, 0.05, 12);
      dish.add('food', shape, color, { at: [x, top + 0.05 + (0.55 - Math.hypot(x, z)) * 0.35, z], rot: dish.turn(), jitter: 0.25 });
    }
    topping(dish, look.topping, top + 0.18, 0.35, look);
    if (look.extra) topping(dish, look.extra, top + 0.2, 0.3, look);
    garnish(dish, look.garnish, top + 0.2, 0.45);
  },

  casserole: (dish, look) => {
    dish.add('ceramic', box(1.6, 0.08, 1.1), '#E9E2D6', { at: [0, 0.04, 0] });
    for (const [x, z, w, d] of [[0, 0.53, 1.6, 0.06], [0, -0.53, 1.6, 0.06], [0.78, 0, 0.06, 1.1], [-0.78, 0, 0.06, 1.1]]) {
      dish.add('ceramic', box(w, 0.32, d), '#E9E2D6', { at: [x, 0.16, z] });
    }
    dish.add('food', lumpy(box(1.48, 0.06, 1.0), 0.03, 2), look.base, { at: [0, 0.27, 0] });
    for (let index = 0; index < 16; index++) {
      const [x, z] = [dish.wobble() * 1.3, dish.wobble() * 0.85];
      dish.add('food', sphere(0.08, 10, 8).scale(1, 0.25, 1), index % 2 ? look.accent : '#B9702A', { at: [x, 0.3, z] });
    }
  },

  cookies: (dish, look) => {
    const top = plate(dish);
    for (let index = 0; index < 6; index++) {
      const [x, z] = index === 5 ? [0, 0] : [Math.cos((index / 5) * TAU) * 0.45, Math.sin((index / 5) * TAU) * 0.45];
      const y = top + 0.03 + (index === 5 ? 0.06 : 0);
      dish.add('food', lumpy(cylinder(0.22, 0.22, 0.06, 24), 0.06, index), look.base, { at: [x, y, z], rot: [index === 5 ? 0.15 : 0, index, 0], jitter: 0.1 });
      for (let chip = 0; chip < 5; chip++) dish.add('food', sphere(0.025, 6, 4), '#3A2216', { at: [x + dish.wobble() * 0.3, y + 0.03, z + dish.wobble() * 0.3] });
    }
  },

  candy: (dish, look) => {
    const top = plate(dish);
    dish.add('food', box(1.0, 0.05, 0.5), look.base, { at: [0, top + 0.025, 0], rot: [0, 0.3, 0] });
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const x = -0.36 + col * 0.24;
        const z = -0.11 + row * 0.22;
        dish.add('food', box(0.2, 0.05, 0.18), look.base, { at: [x * Math.cos(0.3) + z * Math.sin(0.3), top + 0.075, z * Math.cos(0.3) - x * Math.sin(0.3)], rot: [0, 0.3, 0] });
      }
    }
    dish.add('food', box(0.5, 0.14, 0.54), look.accent, { at: [0.36 * Math.cos(0.3), top + 0.07, -0.36 * Math.sin(0.3)], rot: [0, 0.3, 0] });
  },

  glass: (dish, look) => {
    const shape = look.shape;
    const short = shape === 'spirit';
    const height = short ? 0.6 : 1.05;
    const level = glassVessel(dish, short ? 0.36 : 0.32, height, look.base, shape === 'water' ? 0.8 : 0.72);
    if (shape === 'fizzy' || shape === 'spirit' || shape === 'water') {
      for (let index = 0; index < 3; index++) dish.add('glass', box(0.16, 0.16, 0.16), '#EAF6FA', { at: [(index - 1) * 0.1, level - 0.04, (index % 2) * 0.08], rot: dish.turn() });
    }
    if (shape === 'fizzy') for (let index = 0; index < 24; index++) dish.add('glossy', sphere(0.012, 6, 4), '#FFFFFF', { at: [dish.wobble() * 0.4, 0.1 + dish.random() * (level - 0.15), dish.wobble() * 0.4] });
    if (shape === 'shake') dish.add('food', lumpy(dome(0.3), 0.12, 2), look.accent, { at: [0, level, 0], scale: [1, 1.1, 1] });
    if (shape === 'straw' || shape === 'shake') dish.add('food', cylinder(0.025, 0.025, 1.2, 10), '#E8473A', { at: [0.1, level + 0.25, 0], rot: [0, 0, -0.25] });
    if (shape === 'water' && look.accent !== '#FFFFFF') for (let index = 0; index < 4; index++) dish.add('food', box(0.08, 0.01, 0.05), look.accent, { at: [dish.wobble() * 0.3, level + 0.01, dish.wobble() * 0.3], rot: [0, dish.random() * 3, 0] });
    if (!shape) dish.add('food', cylinder(0.2, 0.2, 0.025, 24, false, 0, Math.PI), look.accent, { at: [0.3, height + 0.02, 0], rot: [Math.PI / 2, 0, 0] });
  },

  cup: (dish, look) => {
    dish.add('ceramic', lathe([[0, 0], [0.55, 0], [0.62, 0.04], [0.6, 0.06], [0, 0.03]], 1), WHITE);
    dish.add('ceramic', lathe([[0, 0.04], [0.22, 0.04], [0.34, 0.2], [0.4, 0.5], [0.37, 0.5], [0.31, 0.22], [0, 0.1]], 1), WHITE);
    dish.add('ceramic', torus(0.13, 0.035, Math.PI * 1.2), WHITE, { at: [0.42, 0.3, 0], rot: [0, 0, -Math.PI * 0.6] });
    dish.add('liquid', disc(0.36), look.base, { at: [0, 0.45, 0] });
    if (look.shape === 'latte') dish.add('glossy', torus(0.12, 0.03), look.accent, { at: [0, 0.455, 0], rot: [Math.PI / 2, 0, 0] });
  },

  kulhad: (dish, look) => {
    // A clay kulhad, as chai is served on Indian streets.
    dish.add('clay', lathe([[0, 0], [0.24, 0], [0.27, 0.05], [0.4, 0.62], [0.37, 0.63], [0.26, 0.1], [0, 0.08]], 1), '#A0522D');
    dish.add('liquid', disc(0.36), look.base, { at: [0, 0.56, 0] });
    if (look.shape === 'lemon') dish.add('food', cylinder(0.12, 0.12, 0.02, 20), look.accent, { at: [0.12, 0.575, 0.05], rot: [0.1, 0, 0.1] });
    else if (look.shape === 'lassi') dish.add('food', lumpy(dome(0.34), 0.12, 2), look.accent, { at: [0, 0.56, 0], scale: [1, 0.5, 1] });
    else dish.add('glossy', torus(0.3, 0.02), look.accent, { at: [0, 0.565, 0], rot: [Math.PI / 2, 0, 0] });
  },

  tumbler: (dish, look) => {
    // South Indian filter coffee: a steel tumbler standing in its davara, frothed on top.
    dish.add('steel', lathe([[0, 0], [0.5, 0], [0.55, 0.06], [0.6, 0.26], [0.57, 0.27], [0.5, 0.08], [0, 0.04]], 1), STEEL);
    dish.add('steel', cylinder(0.3, 0.24, 0.8, 32, true), STEEL, { at: [0, 0.44, 0] });
    dish.add('liquid', disc(0.29), look.base, { at: [0, 0.78, 0] });
    dish.add('food', lumpy(dome(0.29), 0.1, 2), look.accent, { at: [0, 0.78, 0], scale: [1, 0.25, 1] });
  },

  wine: (dish, look) => {
    dish.add('glass', lathe([[0, 0], [0.32, 0], [0.32, 0.02], [0.04, 0.04], [0.03, 0.55], [0.25, 0.7], [0.32, 0.95], [0.29, 1.2], [0.28, 1.2], [0.3, 0.95], [0.24, 0.72], [0, 0.58]], 1), WHITE);
    dish.add('liquid', lathe([[0, 0.6], [0.22, 0.72], [0.29, 0.92], [0, 0.92]], 1), look.base);
  },

  beer: (dish, look) => {
    const level = glassVessel(dish, 0.36, 0.9, look.base, 0.78);
    dish.add('glass', torus(0.2, 0.05, Math.PI), WHITE, { at: [0.4, 0.45, 0], rot: [0, 0, -Math.PI / 2] });
    dish.add('food', lumpy(cylinder(0.34, 0.33, 0.16, 32), 0.08, 3), look.accent, { at: [0, level + 0.06, 0] });
  },

  coconut: (dish, look) => {
    dish.add('food', lumpy(sphere(0.48, 28, 20), 0.05, 4), look.base, { at: [0, 0.45, 0], scale: [1, 0.95, 1] });
    if (look.shape === 'filled') {
      // Daab chingri: prawn curry cooked and served in the green coconut.
      dish.add('food', disc(0.34, 32), '#F4EFE2', { at: [0, 0.86, 0] });
      dish.add('glossy', disc(0.3, 32), look.accent, { at: [0, 0.865, 0] });
      toppingAt(dish, 'prawns', 0.86, 0.18, look, 0, 0, 0.6);
      return;
    }
    dish.add('food', disc(0.24, 32), look.accent, { at: [0, 0.9, 0] });
    dish.add('food', cylinder(0.025, 0.025, 0.8, 10), '#E8473A', { at: [0.08, 1.1, 0], rot: [0, 0, -0.25] });
  },
};

const SIDE_MINT: Side = { color: '#4E8A2E' };

/** Tall things (drinks, burgers) barely lean; plates lean back so their food faces the viewer. */
const TALL = new Set<DishModelKind>(['glass', 'cup', 'kulhad', 'tumbler', 'wine', 'beer', 'coconut', 'burger', 'fries', 'claypot']);

export function dishTilt(look: DishLook) {
  if (look.model === 'fries' && look.shape === 'plate') return 0.62;
  if (look.model === 'coconut' && look.shape === 'filled') return 0.55;
  return TALL.has(look.model) ? 0.18 : 0.62;
}

const MATERIALS: Record<Material, () => THREE.Material> = {
  food: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.4 }),
  glossy: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 }),
  liquid: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.94 }),
  ceramic: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.25, clearcoat: 1, side: THREE.DoubleSide }),
  steel: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.22, metalness: 0.9, side: THREE.DoubleSide }),
  clay: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }),
  wood: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }),
  glass: () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.05, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
};

type Props = { look: DishLook; position?: V3; rotation?: V3; scale?: number };

/** One dish, built from its look. */
export function DishModel({ look, ...props }: Props) {
  // Built once per look, not per render: the explainer rebuilds its props as narration moves on.
  const key = JSON.stringify(look);
  const meshes = useMemo(() => {
    const dish = new Dish(7);
    const parsed = JSON.parse(key) as DishLook;
    MODELS[parsed.model](dish, parsed);
    return dish.meshes().map(({ material, geometry }) => ({ geometry, material: MATERIALS[material]() }));
  }, [key]);
  useEffect(
    () => () =>
      meshes.forEach(({ geometry, material }) => {
        geometry.dispose();
        material.dispose();
      }),
    [meshes],
  );
  return (
    <group {...props}>
      {meshes.map(({ geometry, material }, index) => (
        <mesh key={index} geometry={geometry} material={material} castShadow receiveShadow />
      ))}
    </group>
  );
}
