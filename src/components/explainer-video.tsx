'use dom';

/**
 * Plays the meal explainer video (src/video) with Remotion's Player. A DOM
 * component: on the web it renders inline, and on Android and iOS Expo bundles
 * it into the app and shows it in a web view, so it works offline everywhere.
 * The native side narrates each scene, told through `onScene`, and the video
 * holds at the end of a scene until `narratingScene` says its narration is done.
 */
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { InterTight_400Regular, InterTight_600SemiBold, useFonts } from '@expo-google-fonts/inter-tight';
import { Player, type PlayerRef } from '@remotion/player';
import { useEffect, useRef, useState } from 'react';

import { Explainer } from '../video/Explainer';
import { type ExplainerVideoProps, sceneTimeline, VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from '../video/props';

const SEED = '#D4F25C';
const INK = '#07120D';
/** How close to a scene's end (in frames) the video stops to wait for its narration. */
const HOLD_FRAMES = 3;

export default function ExplainerVideo({
  video,
  labels,
  narratingScene,
  onScene,
  onPause,
  onEnded,
}: {
  video: ExplainerVideoProps;
  labels: { play: string; pause: string; replay: string };
  /** The scene whose narration is still being spoken, or -1. */
  narratingScene: number;
  /** A scene started playing (also on resume and replay). */
  onScene: (index: number) => Promise<void>;
  onPause: () => Promise<void>;
  onEnded: () => Promise<void>;
  dom?: import('expo/dom').DOMProps;
}) {
  // Inside the native web view the app's fonts aren't loaded yet, so load them here too.
  useFonts({ InstrumentSerif_400Regular, InterTight_400Regular, InterTight_600SemiBold });
  // The Player hands over its handle once it has measured itself, which can be
  // after the first render, so keep it in state and wire the events up then.
  const [player, setPlayer] = useState<PlayerRef | null>(null);
  const [playing, setPlaying] = useState(true);
  // The latest callbacks, read when an event fires, so re-renders don't re-wire
  // the events (which would restart the narration mid-scene).
  const handlers = useRef({ onScene, onPause, onEnded });
  useEffect(() => {
    handlers.current = { onScene, onPause, onEnded };
  });
  const { starts, total } = sceneTimeline(video.scenes);
  const startsKey = starts.join(',');
  // Waiting at the end of a scene for its narration; `release` moves on to the next scene.
  const narrating = useRef(narratingScene);
  const held = useRef(false);
  const release = useRef(() => {});
  useEffect(() => {
    narrating.current = narratingScene;
    if (narratingScene === -1 && held.current) release.current();
  }, [narratingScene]);

  useEffect(() => {
    if (!player) return;
    const sceneStarts = startsKey.split(',').map(Number);
    let scene = -1;
    const sceneAt = (frame: number) => {
      let index = 0;
      while (index < sceneStarts.length - 1 && frame >= sceneStarts[index + 1]) index++;
      return index;
    };
    const announce = (index: number) => {
      scene = index;
      handlers.current.onScene(index);
    };
    const onFrame = ({ detail }: { detail: { frame: number } }) => {
      if (!player.isPlaying()) return;
      const index = sceneAt(detail.frame);
      if (index !== scene) {
        announce(index);
        return;
      }
      // The last scene's narration finishes over the final frame instead.
      const next = sceneStarts[scene + 1];
      if (next !== undefined && narrating.current === scene && detail.frame >= next - HOLD_FRAMES) {
        held.current = true;
        player.pause();
      }
    };
    release.current = () => {
      held.current = false;
      const next = sceneStarts[scene + 1];
      if (next === undefined) return;
      player.seekTo(next);
      player.play();
    };
    const onPlay = () => {
      held.current = false;
      setPlaying(true);
      announce(sceneAt(player.getCurrentFrame()));
    };
    const onPaused = () => {
      // Waiting for the narration is not a pause: keep talking and showing "playing".
      if (held.current) return;
      setPlaying(false);
      // The player also pauses when it reaches the end, where the closing line keeps going.
      if (player.getCurrentFrame() >= total - 1) return;
      handlers.current.onPause();
    };
    const onEnd = () => {
      setPlaying(false);
      handlers.current.onEnded();
    };
    player.addEventListener('frameupdate', onFrame);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPaused);
    player.addEventListener('ended', onEnd);
    // Autoplay may have started before these listeners existed.
    if (player.isPlaying()) announce(sceneAt(player.getCurrentFrame()));
    return () => {
      player.removeEventListener('frameupdate', onFrame);
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPaused);
      player.removeEventListener('ended', onEnd);
    };
  }, [player, startsKey, total]);

  const button = (size: number, filled: boolean): React.CSSProperties => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    border: 0,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    background: filled ? SEED : 'rgba(255,255,255,0.12)',
    color: filled ? INK : '#fff',
    backdropFilter: 'blur(10px)',
  });

  return (
    // The player scales its frame from the left edge, so it stays left to right; the composition sets its own direction.
    <div dir="ltr" style={{ position: 'relative', width: '100%', height: '100%', background: INK, overflow: 'hidden' }}>
      <Player
        ref={setPlayer}
        component={Explainer}
        inputProps={video}
        durationInFrames={total}
        fps={VIDEO_FPS}
        compositionWidth={VIDEO_WIDTH}
        compositionHeight={VIDEO_HEIGHT}
        style={{ width: '100%', height: '100%' }}
        autoPlay
        clickToPlay
        acknowledgeRemotionLicense
      />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 28, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 28 }}>
        <button
          type="button"
          aria-label={labels.replay}
          style={button(52, false)}
          onClick={() => {
            held.current = false;
            player?.seekTo(0);
            player?.play();
          }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 3v6h6" />
          </svg>
        </button>
        <button type="button" aria-label={playing ? labels.pause : labels.play} style={button(72, true)} onClick={() => {
            // Pausing while the video waits for the narration stops the narration too.
            if (held.current) {
              held.current = false;
              setPlaying(false);
              handlers.current.onPause();
              return;
            }
            player?.toggle();
          }}>
          {playing ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1.2" />
              <rect x="14" y="5" width="4" height="14" rx="1.2" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
            </svg>
          )}
        </button>
        <span style={{ width: 52 }} />
      </div>
    </div>
  );
}
