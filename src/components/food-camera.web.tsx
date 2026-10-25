/**
 * The back camera in a browser, set up for close-up food photos. expo-camera's
 * web view asks for no resolution, so phones fall back to about 640x480: a soft
 * preview and blurry photos. This asks for full HD, keeps autofocus running
 * where the browser allows it, focuses where the user taps (Chrome on Android),
 * and takes the photo at the stream's full resolution.
 *
 * iPhone Safari picks the lens itself and offers no way to change it, so close
 * plates can still blur on Pro models; the scan frame keeps people far enough away.
 */
import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { FoodCameraProps } from './food-camera';

export type { FoodCameraHandle, FoodCameraProps } from './food-camera';

/** Camera controls Chrome supports beyond the standard MediaTrackCapabilities. */
type CameraCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  pointsOfInterest?: unknown;
  torch?: boolean;
};

type CameraConstraints = MediaTrackConstraintSet & {
  focusMode?: string;
  pointsOfInterest?: { x: number; y: number }[];
  torch?: boolean;
};

const STREAM: MediaStreamConstraints = {
  audio: false,
  video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
};

function capabilities(track: MediaStreamTrack): CameraCapabilities {
  return (track.getCapabilities?.() ?? {}) as CameraCapabilities;
}

async function apply(track: MediaStreamTrack, constraints: CameraConstraints) {
  try {
    await track.applyConstraints({ advanced: [constraints] });
  } catch (error) {
    console.warn('The camera ignored a setting', constraints, error);
  }
}

/** The tapped point as a fraction of the video frame, allowing for the part object-fit: cover crops off. */
function framePoint(video: HTMLVideoElement, clientX: number, clientY: number) {
  const box = video.getBoundingClientRect();
  const scale = Math.max(box.width / video.videoWidth, box.height / video.videoHeight);
  const offsetX = (video.videoWidth * scale - box.width) / 2;
  const offsetY = (video.videoHeight * scale - box.height) / 2;
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  return {
    x: clamp((clientX - box.left + offsetX) / (video.videoWidth * scale)),
    y: clamp((clientY - box.top + offsetY) / (video.videoHeight * scale)),
  };
}

type Ring = { id: number; left: number; top: number };

export function FoodCamera({ ref, torch, onReady, onUnavailable, style }: FoodCameraProps) {
  const video = useRef<HTMLVideoElement>(null);
  const track = useRef<MediaStreamTrack | null>(null);
  const [live, setLive] = useState(false);
  const [ring, setRing] = useState<Ring | null>(null);
  const handlers = useRef({ onReady, onUnavailable });

  useEffect(() => {
    handlers.current = { onReady, onUnavailable };
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia(STREAM);
        if (stopped) return;
        const element = video.current!;
        element.srcObject = stream;
        await element.play();
        const [videoTrack] = stream.getVideoTracks();
        track.current = videoTrack;
        if (capabilities(videoTrack).focusMode?.includes('continuous')) await apply(videoTrack, { focusMode: 'continuous' });
        if (stopped) return;
        setLive(true);
        handlers.current.onReady();
      } catch (error) {
        console.warn('Could not open the camera', error);
        if (!stopped) handlers.current.onUnavailable();
      }
    })();
    return () => {
      stopped = true;
      track.current = null;
      stream?.getTracks().forEach((each) => each.stop());
    };
  }, []);

  useEffect(() => {
    const current = track.current;
    if (live && current && capabilities(current).torch) apply(current, { torch });
  }, [live, torch]);

  useImperativeHandle(ref, () => ({
    async takePicture() {
      const element = video.current;
      if (!element || !element.videoWidth) throw new Error('The camera is not ready');
      // The full-resolution frame the user is looking at, already the right way up.
      const canvas = document.createElement('canvas');
      canvas.width = element.videoWidth;
      canvas.height = element.videoHeight;
      canvas.getContext('2d')!.drawImage(element, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('Could not take the photo'))), 'image/jpeg', 0.92),
      );
      return { uri: URL.createObjectURL(blob), width: canvas.width, height: canvas.height };
    },
  }));

  function focusAt(event: { clientX: number; clientY: number }) {
    const element = video.current;
    const current = track.current;
    if (!element || !current || !element.videoWidth) return;
    const box = element.getBoundingClientRect();
    setRing({ id: Date.now(), left: event.clientX - box.left, top: event.clientY - box.top });
    const supported = capabilities(current);
    if (!supported.pointsOfInterest || !supported.focusMode?.length) return;
    // Keep refocusing on the tapped spot if the camera can; otherwise focus there once.
    const focusMode = supported.focusMode.includes('continuous') ? 'continuous' : 'single-shot';
    apply(current, { pointsOfInterest: [framePoint(element, event.clientX, event.clientY)], focusMode });
  }

  useEffect(() => {
    if (!ring) return;
    const timer = setTimeout(() => setRing(null), 700);
    return () => clearTimeout(timer);
  }, [ring]);

  return (
    <View style={style}>
      <video ref={video} playsInline muted autoPlay onPointerUp={focusAt} style={videoStyle} />
      {ring && <View pointerEvents="none" style={[styles.ring, { left: ring.left - RING / 2, top: ring.top - RING / 2 }]} />}
    </View>
  );
}

const RING = 64;

const videoStyle = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } as const;

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
});
