/**
 * Phones and tablets (a touch screen as the main pointer) get a lighter site:
 * the same story and scenes, without the effects mobile GPUs pay for on every
 * frame. Decided once, when the page loads; CSS matches it with
 * `@media (pointer: coarse)`.
 */
export const LITE = window.matchMedia('(pointer: coarse)').matches;

/** The soft shadow under each 3D scene is re-rendered every frame, so phones get a smaller one. */
export const CONTACT_SHADOW_RESOLUTION = LITE ? 256 : 512;
