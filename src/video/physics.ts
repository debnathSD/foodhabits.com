/**
 * Physics for the explainer video, simulated once with cannon-es and stored
 * frame by frame. Remotion can render any frame in any order, so each scene
 * reads its bodies' poses for a frame instead of stepping a live world.
 */
import * as CANNON from 'cannon-es';

import { seeded } from '../three/scenes';

/** Poses per frame: positions [frame][body][xyz] and quaternions [frame][body][xyzw], flattened. */
export type Baked = { bodies: number; frames: number; positions: Float32Array; quaternions: Float32Array };

const SUBSTEPS = 2;

function record(world: CANNON.World, bodies: CANNON.Body[], frames: number, fps: number, onFrame?: (frame: number) => void): Baked {
  const positions = new Float32Array(frames * bodies.length * 3);
  const quaternions = new Float32Array(frames * bodies.length * 4);
  for (let frame = 0; frame < frames; frame++) {
    onFrame?.(frame);
    for (let step = 0; step < SUBSTEPS; step++) world.step(1 / (fps * SUBSTEPS));
    bodies.forEach((body, index) => {
      const p = (frame * bodies.length + index) * 3;
      const q = (frame * bodies.length + index) * 4;
      positions[p] = body.position.x;
      positions[p + 1] = body.position.y;
      positions[p + 2] = body.position.z;
      quaternions[q] = body.quaternion.x;
      quaternions[q + 1] = body.quaternion.y;
      quaternions[q + 2] = body.quaternion.z;
      quaternions[q + 3] = body.quaternion.w;
    });
  }
  return { bodies: bodies.length, frames, positions, quaternions };
}

/** Reads one body's pose at a frame (clamped to the recording). */
export function poseAt(baked: Baked, body: number, frame: number) {
  const f = Math.min(baked.frames - 1, Math.max(0, Math.floor(frame)));
  const p = (f * baked.bodies + body) * 3;
  const q = (f * baked.bodies + body) * 4;
  return {
    position: [baked.positions[p], baked.positions[p + 1], baked.positions[p + 2]] as [number, number, number],
    quaternion: [baked.quaternions[q], baked.quaternions[q + 1], baked.quaternions[q + 2], baked.quaternions[q + 3]] as [number, number, number, number],
  };
}

function world() {
  const result = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  result.defaultContactMaterial.restitution = 0.35;
  result.defaultContactMaterial.friction = 0.4;
  return result;
}

function ground(target: CANNON.World, y = 0) {
  const body = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  body.position.y = y;
  target.addBody(body);
}

/** The whole dish dropping onto its pedestal (top at y = 0) with a small tumble and a bounce. */
export function bakeDrop(frames: number, fps: number): Baked {
  const target = world();
  ground(target);
  const dish = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.8), position: new CANNON.Vec3(0, 4.2, 0), angularDamping: 0.6 });
  dish.angularVelocity.set(0.6, 0.3, -0.4);
  target.addBody(dish);
  return record(target, [dish], frames, fps);
}

/**
 * Microbes pouring into a glass capsule (radius 1, floor at y = -1.2): `good`
 * friendly ones and `bad` troublemakers, mixed in a seeded order. Returns the
 * poses and which bodies are friendly.
 */
export function bakeMicrobes(good: number, bad: number, frames: number, fps: number) {
  const target = world();
  target.defaultContactMaterial.restitution = 0.2;
  ground(target, -1.2);
  // The capsule wall: a ring of thin boxes.
  const sides = 18;
  for (let index = 0; index < sides; index++) {
    const angle = (index / sides) * Math.PI * 2;
    const wall = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(0.2, 2, 0.05)) });
    wall.position.set(Math.cos(angle) * 1.02, 0.6, Math.sin(angle) * 1.02);
    wall.quaternion.setFromEuler(0, -angle + Math.PI / 2, 0);
    target.addBody(wall);
  }
  const random = seeded(31);
  const total = good + bad;
  const order = Array.from({ length: total }, (_, index) => index < good);
  for (let index = order.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  // Each microbe waits, parked above the scene, until its turn to drop.
  const spawnEvery = Math.max(1, Math.floor((frames * 0.55) / total));
  const bodies = order.map((_, index) => {
    const body = new CANNON.Body({ mass: 0.05, shape: new CANNON.Sphere(0.11 + random() * 0.03) });
    body.position.set((random() - 0.5) * 0.9, 40 + index, (random() - 0.5) * 0.9);
    body.type = CANNON.Body.STATIC;
    target.addBody(body);
    return body;
  });
  const baked = record(target, bodies, frames, fps, (frame) => {
    const index = frame / spawnEvery;
    if (Number.isInteger(index) && index < bodies.length) {
      const body = bodies[index];
      body.type = CANNON.Body.DYNAMIC;
      body.position.set((random() - 0.5) * 0.7, 2.6, (random() - 0.5) * 0.7);
      body.velocity.set((random() - 0.5) * 0.6, -1, (random() - 0.5) * 0.6);
      body.updateMassProperties();
      body.wakeUp();
    }
  });
  return { ...baked, friendly: order };
}

/**
 * The next-meal scene: `avoid` foods sit on the plate (radius 1.25, top at
 * y = 0) and are flicked off a third of the way in; `eat` foods then drop on.
 */
export function bakePlate(avoid: number, eat: number, frames: number, fps: number) {
  const target = world();
  target.defaultContactMaterial.restitution = 0.3;
  const plate = new CANNON.Body({ mass: 0, shape: new CANNON.Cylinder(1.25, 1.1, 0.2, 24), position: new CANNON.Vec3(0, -0.1, 0) });
  target.addBody(plate);
  ground(target, -3);
  const random = seeded(57);
  const bodies: CANNON.Body[] = [];
  for (let index = 0; index < avoid; index++) {
    const angle = (index / Math.max(1, avoid)) * Math.PI * 2;
    const body = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.3), position: new CANNON.Vec3(Math.cos(angle) * 0.55, 0.32, Math.sin(angle) * 0.55), linearDamping: 0.3, angularDamping: 0.5 });
    target.addBody(body);
    bodies.push(body);
  }
  for (let index = 0; index < eat; index++) {
    // Damped, so the good foods settle on the plate instead of rolling off it.
    const body = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.3), position: new CANNON.Vec3(0, 60 + index * 2, 0), linearDamping: 0.7, angularDamping: 0.8 });
    body.type = CANNON.Body.STATIC;
    target.addBody(body);
    bodies.push(body);
  }
  const flick = Math.floor(frames * 0.3);
  const drop = Math.floor(frames * 0.5);
  const baked = record(target, bodies, frames, fps, (frame) => {
    if (frame === flick) {
      bodies.slice(0, avoid).forEach((body, index) => {
        const angle = (index / Math.max(1, avoid)) * Math.PI * 2;
        body.velocity.set(Math.cos(angle) * 4.5, 3.2, Math.sin(angle) * 4.5 + 1);
        body.angularVelocity.set(random() * 8, random() * 8, random() * 8);
      });
    }
    const dropping = frame - drop;
    if (dropping >= 0 && dropping % 6 === 0 && dropping / 6 < eat) {
      const body = bodies[avoid + dropping / 6];
      body.type = CANNON.Body.DYNAMIC;
      body.position.set((random() - 0.5) * 0.8, 3.2, (random() - 0.5) * 0.8);
      body.updateMassProperties();
      body.wakeUp();
    }
  });
  return baked;
}
