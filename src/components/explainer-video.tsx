'use dom';

/**
 * Plays the meal explainer video (src/video) with Remotion's Player. A DOM
 * component: on the web it renders inline, and on Android and iOS Expo bundles
 * it into the app and shows it in a web view, so it works offline everywhere.
 * The native side narrates each scene, told through `onScene`.
 */
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { InterTight_400Regular, InterTight_600SemiBold, useFonts } from '@expo-google-fonts/inter-tight';
import { Player, type PlayerRef } from '@remotion/player';
import { useEffect, useRef, useState } from 'react';

import { Explainer } from '../video/Explainer';
import { type ExplainerVideoProps, sceneTimeline, VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from '../video/props';

const SEED = '#D4F25C';
const INK = '#07120D';

export default function ExplainerVideo({
  video,
  labels,
  onScene,
  onPause,
  onEnded,
}: {
  video: ExplainerVideoProps;
  labels: { play: string; pause: string; replay: string };
  /** A scene started playing (also on resume and replay). */
  onScene: (index: number) => Promise<void>;
  onPause: () => Promise<void>;
  onEnded: () => Promise<void>;
  dom?: import('expo/dom').DOMProps;
}) {
  // Inside the native web view the app's fonts aren't loaded yet, so load them here too.
  useFonts({ InstrumentSerif_400Regular, InterTight_400Regular, InterTight_600SemiBold });
  const player = useRef<PlayerRef>(null);
  const [playing, setPlaying] = useState(true);
  const { starts, total } = sceneTimeline(video.scenes);

  useEffect(() => {
    const node = player.current;
    if (!node) return;
    let scene = -1;
    const sceneAt = (frame: number) => {
      let index = 0;
      while (index < starts.length - 1 && frame >= starts[index + 1]) index++;
      return index;
    };
    const onFrame = ({ detail }: { detail: { frame: number } }) => {
      const index = sceneAt(detail.frame);
      if (index !== scene && node.isPlaying()) {
        scene = index;
        onScene(index);
      }
    };
    const onPlay = () => {
      setPlaying(true);
      scene = sceneAt(node.getCurrentFrame());
      onScene(scene);
    };
    const onPaused = () => {
      setPlaying(false);
      onPause();
    };
    const onEnd = () => {
      setPlaying(false);
      onEnded();
    };
    node.addEventListener('frameupdate', onFrame);
    node.addEventListener('play', onPlay);
    node.addEventListener('pause', onPaused);
    node.addEventListener('ended', onEnd);
    return () => {
      node.removeEventListener('frameupdate', onFrame);
      node.removeEventListener('play', onPlay);
      node.removeEventListener('pause', onPaused);
      node.removeEventListener('ended', onEnd);
    };
  }, [starts, onScene, onPause, onEnded]);

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
    <div style={{ position: 'relative', width: '100%', height: '100%', background: INK, overflow: 'hidden' }}>
      <Player
        ref={player}
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
            player.current?.seekTo(0);
            player.current?.play();
          }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 3v6h6" />
          </svg>
        </button>
        <button type="button" aria-label={playing ? labels.pause : labels.play} style={button(72, true)} onClick={() => player.current?.toggle()}>
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
