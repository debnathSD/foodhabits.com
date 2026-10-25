/**
 * The meal explainer video (Remotion): a narrated, 3D, captioned walk through
 * what one dish does, in the user's language. Scenes follow the app's script
 * (intro, inside, gut, body, risks, next, outro). Three.js draws each scene,
 * cannon-es physics (baked per scene) moves things that fall and bounce, and
 * GSAP timelines, seeked to the current frame, bring the words and cards in.
 */
import { ThreeCanvas } from '@remotion/three';
import { gsap } from 'gsap';
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';

import { deconstructPhase } from '../lib/deconstruct';
import { insideLine } from '../lib/describe';
import { preloadPhoto } from '../three/photo-dish';
import { Studio } from '../three/studio';
import { type ExplainerVideoProps, sceneTimeline } from './props';
import { Stage } from './stages';

const INK = '#07120D';
const TEXT = '#EAF2EC';
const MUTED = 'rgba(234,242,236,0.62)';
const SEED = '#D4F25C';
const MINT = '#57E39A';
const CORAL = '#FF6B5B';
const SERIF = 'InstrumentSerif_400Regular, "Instrument Serif", serif';
const SANS = 'InterTight_400Regular, "Inter Tight", system-ui, sans-serif';
const SANS_BOLD = 'InterTight_600SemiBold, "Inter Tight", system-ui, sans-serif';

/** Backdrops per scene: forest for most, darker for the take-apart, oxblood where the news is bad. */
const BACKDROP: Record<string, string> = {
  intro: 'radial-gradient(90% 60% at 50% 38%, #165c39 0%, #0d2a1c 50%, #06100b 100%)',
  inside: 'radial-gradient(80% 55% at 50% 42%, #10201a 0%, #050806 70%)',
  gut: 'radial-gradient(90% 60% at 50% 40%, #561820 0%, #3a0e14 55%, #1c0609 100%)',
  body: 'radial-gradient(90% 60% at 50% 38%, #165c39 0%, #0d2a1c 50%, #06100b 100%)',
  risks: 'radial-gradient(90% 60% at 50% 40%, #561820 0%, #3a0e14 55%, #1c0609 100%)',
  next: 'radial-gradient(90% 60% at 50% 40%, #1b5a3a 0%, #0d2a1c 52%, #06100b 100%)',
  outro: 'radial-gradient(90% 60% at 50% 42%, #165c39 0%, #0d2a1c 50%, #06100b 100%)',
};

/**
 * A GSAP timeline built once per `key`, then seeked to `seconds` every frame,
 * so GSAP's easing and staggers stay in lockstep with the video.
 */
function useTimeline(key: string, seconds: number, build: (timeline: gsap.core.Timeline) => void) {
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const builder = useRef(build);
  useLayoutEffect(() => {
    builder.current = build;
  });
  useLayoutEffect(() => {
    const created = gsap.timeline({ paused: true });
    builder.current(created);
    timeline.current = created;
    return () => {
      created.kill();
      timeline.current = null;
    };
  }, [key]);
  useLayoutEffect(() => {
    timeline.current?.seek(seconds, false);
  });
}

/** Karaoke captions: every word is there from the start, and brightens as the narration reaches it. */
function Caption({ text, progress }: { text: string; progress: number }) {
  const words = text.split(/\s+/);
  const reached = progress * words.length * 1.08;
  return (
    <p style={{ margin: 0, font: `500 44px/1.32 ${SANS}`, color: TEXT, textAlign: 'center', textWrap: 'balance' }}>
      {words.map((word, index) => (
        <span key={index} style={{ opacity: interpolate(reached - index, [-1, 0.5], [0.28, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          {word}{' '}
        </span>
      ))}
    </p>
  );
}

function Pill({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 26px',
        borderRadius: 999,
        background: 'rgba(7,18,13,0.72)',
        border: `2px solid ${color}`,
        color: TEXT,
        font: `600 36px/1 ${SANS_BOLD}`,
      }}>
      <span style={{ width: 16, height: 16, borderRadius: 8, background: color, boxShadow: `0 0 24px ${color}` }} />
      {children}
    </span>
  );
}

function IntroCard({ props, seconds }: { props: ExplainerVideoProps; seconds: number }) {
  const root = useRef<HTMLDivElement>(null);
  useTimeline('intro', seconds, (timeline) => {
    const node = root.current;
    if (!node) return;
    timeline
      .from(node.querySelector('[data-eyebrow]'), { y: 30, opacity: 0, duration: 0.6, ease: 'power3.out' }, 0.1)
      .from(node.querySelectorAll('[data-word]'), { yPercent: 110, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, 0.25)
      .from(node.querySelector('[data-verdict]'), { y: 40, opacity: 0, scale: 0.9, duration: 0.7, ease: 'back.out(1.8)' }, 0.9);
  });
  const score = Math.round(interpolate(seconds, [0.9, 2], [0, props.score], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return (
    <div ref={root} style={{ position: 'absolute', top: 210, left: 80, right: 80, display: 'grid', gap: 26 }}>
      <span data-eyebrow style={{ font: `600 30px/1 ${SANS_BOLD}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: SEED }}>
        {props.brand}
      </span>
      <h1 style={{ margin: 0, font: `400 132px/0.95 ${SERIF}`, color: TEXT, letterSpacing: '-0.02em' }}>
        {props.dish.split(' ').map((word, index) => (
          <span key={index} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: 12, marginRight: 24 }}>
            <span data-word style={{ display: 'inline-block' }}>
              {word}
            </span>
          </span>
        ))}
      </h1>
      <div data-verdict style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pill color={props.color}>{props.verdictLabel}</Pill>
        <span style={{ font: `400 150px/0.8 ${SERIF}`, color: props.color }}>
          {score}
          <span style={{ font: `600 40px/1 ${SANS_BOLD}`, color: MUTED }}>/10</span>
        </span>
      </div>
    </div>
  );
}

/** A column of cards that drop in one after another. */
function Cards({ id, items, seconds, top = 250 }: { id: string; items: { text: string; color: string; mark: string }[]; seconds: number; top?: number }) {
  const root = useRef<HTMLDivElement>(null);
  useTimeline(id, seconds, (timeline) => {
    if (!root.current) return;
    timeline.from(root.current.children, { x: -60, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.45 }, 0.4);
  });
  return (
    <div ref={root} style={{ position: 'absolute', top, left: 70, right: 70, display: 'grid', gap: 20 }}>
      {items.map((item, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 22,
            padding: '24px 30px',
            borderRadius: 30,
            background: 'rgba(7,18,13,0.66)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
            font: `600 38px/1.2 ${SANS_BOLD}`,
            color: TEXT,
          }}>
          <span style={{ flex: 'none', display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 26, background: item.color, color: INK, font: `700 30px/1 ${SANS_BOLD}` }}>
            {item.mark}
          </span>
          {item.text}
        </div>
      ))}
    </div>
  );
}

/** The Kolam f, drawing itself: seeds pop in, then the f line, then the pod. */
function MarkDrawing({ seconds }: { seconds: number }) {
  const seeds: [number, number][] = [
    [50, 32],
    [32, 50],
    [50, 50],
    [68, 50],
    [32, 68],
  ];
  const draw = (start: number, length: number) => interpolate(seconds, [start, start + length], [100, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const f = draw(0.6, 0.72);
  const pod = draw(1.1, 0.6);
  return (
    <svg width="220" height="220" viewBox="0 0 100 100">
      <g fill="none" stroke={TEXT} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path pathLength={100} strokeDasharray="100" strokeDashoffset={f} opacity={f < 100 ? 1 : 0} d="M59 33V32A9 9 0 0 0 41 32V68A9 9 0 0 1 23 68V64" />
        <path pathLength={100} strokeDasharray="100" strokeDashoffset={pod} opacity={pod < 100 ? 1 : 0} d="M16 50A62.8 62.8 0 0 1 84 50A50.96 50.96 0 0 1 16 50Z" />
      </g>
      {seeds.map(([x, y], index) => {
        const r = 2.6 * interpolate(seconds, [0.2 + index * 0.07, 0.46 + index * 0.07], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return <circle key={index} cx={x} cy={y} r={r} fill={SEED} />;
      })}
    </svg>
  );
}

function Overlay({ props, index, local, frames }: { props: ExplainerVideoProps; index: number; local: number; frames: number }) {
  const { fps } = useVideoConfig();
  const scene = props.scenes[index];
  const seconds = local / fps;
  const progress = Math.min(1, local / Math.max(1, frames - 1));
  const caption = scene.kind === 'inside' && scene.lines.length > 2 ? insideLine(scene.lines, progress) : scene.narration;
  const captionProgress = scene.kind === 'inside' ? 1 : progress;

  let panel: ReactNode = null;
  if (scene.kind === 'intro') panel = <IntroCard props={props} seconds={seconds} />;
  if (scene.kind === 'inside') {
    const phase = deconstructPhase(progress, props.parts.length);
    const part = props.parts[phase.focus];
    if (part && phase.light > 0.3) {
      panel = (
        <div style={{ position: 'absolute', top: 240, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <Pill color={part.good ? MINT : CORAL}>
            {props.partNames[phase.focus]} · {part.good ? props.partTags.good : props.partTags.bad}
          </Pill>
        </div>
      );
    }
  }
  if (scene.kind === 'gut') {
    const total = 70;
    const friendly = Math.round(total * props.gutHealth);
    const poured = interpolate(progress, [0, 0.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    panel = (
      <div style={{ position: 'absolute', top: 240, left: 70, right: 70, display: 'flex', justifyContent: 'space-between' }}>
        <Pill color={MINT}>
          {props.labels.friendly} {Math.round(friendly * poured)}
        </Pill>
        <Pill color={CORAL}>
          {props.labels.troublemakers} {Math.round((total - friendly) * poured)}
        </Pill>
      </div>
    );
  }
  if (scene.kind === 'body' && props.body.length) {
    panel = (
      <Cards
        id={`body-${index}`}
        seconds={seconds}
        items={props.body.map((item) => ({
          text: item.text,
          color: item.effect === 'good' ? MINT : item.effect === 'bad' ? CORAL : SEED,
          mark: item.effect === 'good' ? '✓' : item.effect === 'bad' ? '!' : '~',
        }))}
      />
    );
  }
  if (scene.kind === 'risks' && props.risks.length) {
    panel = <Cards id={`risks-${index}`} seconds={seconds} items={props.risks.map((text) => ({ text, color: CORAL, mark: '!' }))} />;
  }
  if (scene.kind === 'next') {
    panel = (
      <>
        <Cards id={`avoid-${index}`} seconds={Math.max(0, seconds - (frames * 0.3) / fps)} top={230} items={props.avoid.map((text) => ({ text, color: CORAL, mark: '✕' }))} />
        <Cards
          id={`eat-${index}`}
          seconds={Math.max(0, seconds - (frames * 0.5) / fps)}
          top={230 + props.avoid.length * 128 + 30}
          items={props.eat.map((text) => ({ text, color: MINT, mark: '✓' }))}
        />
      </>
    );
  }
  if (scene.kind === 'outro') {
    panel = (
      <div style={{ position: 'absolute', top: 1120, left: 0, right: 0, display: 'grid', justifyItems: 'center', gap: 28 }}>
        <Pill color={props.color}>{props.verdictLabel}</Pill>
        <MarkDrawing seconds={seconds} />
        <span style={{ font: `400 64px/1 ${SERIF}`, color: TEXT, opacity: interpolate(seconds, [1.4, 2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          foodhabits<span style={{ color: SEED }}>.</span>
          <span style={{ opacity: 0.6 }}>com</span>
        </span>
      </div>
    );
  }

  return (
    <AbsoluteFill dir={props.rtl ? 'rtl' : 'ltr'}>
      {/* Scene progress, like the app's explainer. */}
      <div style={{ position: 'absolute', top: 90, left: 70, right: 70, display: 'flex', gap: 10 }}>
        {props.scenes.map((item, sceneIndex) => (
          <div key={sceneIndex} style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.16)', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: SEED, width: `${sceneIndex < index ? 100 : sceneIndex === index ? progress * 100 : 0}%` }} />
          </div>
        ))}
      </div>
      <span style={{ position: 'absolute', top: 128, left: 70, font: `600 30px/1.2 ${SANS_BOLD}`, color: MUTED }}>{props.title}</span>
      {panel}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '220px 80px 270px',
          background: 'linear-gradient(180deg, rgba(5,8,6,0) 0%, rgba(5,8,6,0.82) 38%, rgba(5,8,6,0.94) 100%)',
        }}>
        <Caption key={`${index}-${caption}`} text={caption} progress={captionProgress} />
      </div>
    </AbsoluteFill>
  );
}

/** Holds rendering until the meal photo is decoded, so no frame shows a blank plate. */
function usePhotoReady(uri: string | null) {
  const [handle] = useState(() => (uri ? delayRender('Loading the meal photo') : null));
  useEffect(() => {
    if (handle === null || !uri) return;
    preloadPhoto(uri).finally(() => continueRender(handle));
  }, [handle, uri]);
}

export function Explainer(props: ExplainerVideoProps) {
  usePhotoReady(props.photo);
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { starts } = sceneTimeline(props.scenes);
  let index = 0;
  while (index < starts.length - 1 && frame >= starts[index + 1]) index++;
  const scene = props.scenes[index];
  const local = frame - starts[index];
  // A short dip at each cut keeps scene changes soft.
  const fade = Math.min(interpolate(local, [0, 8], [1, 0], { extrapolateRight: 'clamp' }), index === 0 ? 0 : 1);

  return (
    <AbsoluteFill style={{ background: BACKDROP[scene.kind] ?? BACKDROP.intro, fontFamily: SANS }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 0.4, 7.4], fov: 32 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}>
        <Studio intensity={scene.kind === 'inside' ? 0.5 : 1} />
        <Stage key={index} kind={scene.kind} props={props} local={local} frames={scene.frames} />
      </ThreeCanvas>
      <Overlay props={props} index={index} local={local} frames={scene.frames} />
      <AbsoluteFill style={{ background: INK, opacity: fade, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
}
