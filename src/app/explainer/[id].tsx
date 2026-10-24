/**
 * Animated, narrated 3D explainer for one meal. Scenes are built from the
 * analysis, rendered in one 3D canvas, and voiced by the phone's own
 * text-to-speech in the user's language, so it works offline, for every food,
 * at no cost. Captions are always shown; without a voice for the language the
 * scenes advance on a timer.
 */
import { useFrame } from '@react-three/fiber';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as THREE from 'three';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, Radius, Spacing, verdictColors } from '@/constants/theme';
import { useAnalysis } from '@/hooks/use-analysis';
import { useTranslation } from '@/i18n/use-translation';
import { deconstructPhase, type Part } from '@/lib/deconstruct';
import { buildScenes, insideLine, sceneDuration, type Scene } from '@/lib/describe';
import type { Analysis } from '@/lib/engine';
import { goBack } from '@/lib/navigation';
import { foodParts, partsColor } from '@/lib/parts';
import { useAppState } from '@/lib/store';
import { SceneCanvas } from '@/three/canvas';
import { Deconstruct } from '@/three/deconstruct';
import { FoodOrbit, FoodRow, GutScene, HeartScene, SaladBowl, ScoreOrb } from '@/three/scenes';
import { Studio } from '@/three/studio';

const ACCENT = '#D4F25C';
const MINT = '#57E39A';
const CORAL = '#FF6B5B';

export default function ExplainerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scan = useAppState((state) => state.scans.find((candidate) => candidate.id === id));
  const voiceSetting = useAppState((state) => state.voice);
  const result = useAnalysis(scan);
  const { t, list, speechLanguage } = useTranslation();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [voiceAvailable, setVoiceAvailable] = useState<boolean | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const scenes = result ? buildScenes(result.analysis, result.name, t, list) : [];
  const parts = result ? foodParts(result.analysis) : [];
  const scene = scenes[index];
  // Effects key on the text, not the scene object, which is rebuilt every render.
  const narration = scene?.narration;
  // How far the take-apart scene has run, 0-1; restarts with every scene.
  const insideProgress = useRef(0);
  useEffect(() => {
    insideProgress.current = 0;
  }, [index]);

  useEffect(() => {
    const prefix = speechLanguage.split('-')[0];
    Speech.getAvailableVoicesAsync()
      .then((voices) => setVoiceAvailable(voices.some((voice) => voice.language.toLowerCase().startsWith(prefix))))
      .catch(() => setVoiceAvailable(false));
    return () => {
      Speech.stop();
    };
  }, [speechLanguage]);

  const speak = voiceSetting && voiceAvailable === true;

  useEffect(() => {
    if (!playing || !narration || voiceAvailable === null) return;
    const advance = () => {
      if (index < scenes.length - 1) setIndex(index + 1);
      else setPlaying(false);
    };
    if (speak) {
      Speech.speak(narration, { language: speechLanguage, rate: 0.95, onDone: advance });
    } else {
      // Roughly reading speed for captions.
      timer.current = setTimeout(advance, sceneDuration(narration, false));
    }
    return () => {
      Speech.stop();
      clearTimeout(timer.current);
    };
  }, [index, playing, speak, voiceAvailable, narration, scenes.length, speechLanguage]);

  if (!result || !scene) {
    return <View style={[styles.container, { backgroundColor: Colors.dark.background }]} />;
  }

  const finished = !playing && index === scenes.length - 1;
  const duration = sceneDuration(scene.narration, speak);

  return (
    <View style={[styles.container, { backgroundColor: Colors.dark.background }]}>
      <LinearGradient
        // A darker studio for the take-apart scene, so the spotlight reads.
        colors={scene.kind === 'inside' ? ['#0E2419', '#08140E', Colors.dark.background] : ['#155C38', '#0B2A1B', Colors.dark.background]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SceneCanvas camera={[0, 0.4, 7]} style={styles.canvas}>
        {/* The studio dims for the take-apart scene, so its spotlight carries the shot. */}
        <Studio intensity={scene.kind === 'inside' ? 0.5 : 1} />
        <SceneSwitch
          key={`${scene.kind}-${index}`}
          scene={scene}
          analysis={result.analysis}
          parts={parts}
          progressRef={insideProgress}
          playing={playing}
          duration={duration}
        />
      </SceneCanvas>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <View style={styles.progress}>
            {scenes.map((item, sceneIndex) => (
              <View
                key={item.kind}
                style={[styles.progressSegment, { backgroundColor: sceneIndex <= index ? ACCENT : 'rgba(255,255,255,0.18)' }]}
              />
            ))}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={goBack} style={styles.iconButton}>
            <Icon name="close" size={20} color="#fff" />
          </Pressable>
        </View>

        <ThemedText type="smallBold" style={styles.title}>
          {t('explainer.title', { dish: result.name })}
        </ThemedText>

        <View style={styles.stage}>
          <SceneOverlay key={`overlay-${index}`} scene={scene} analysis={result.analysis} parts={parts} progressRef={insideProgress} />
        </View>

        <Animated.View key={`caption-${index}`} entering={FadeIn.duration(450)} style={styles.caption}>
          {scene.lines ? (
            <InsideCaption lines={scene.lines} progressRef={insideProgress} />
          ) : (
            <ThemedText type="subtitle" style={styles.captionText}>
              {scene.narration}
            </ThemedText>
          )}
        </Animated.View>

        {voiceSetting && voiceAvailable === false && (
          <ThemedText type="caption" style={styles.notice}>
            {t('explainer.noVoice')}
          </ThemedText>
        )}

        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('explainer.replay')}
            onPress={() => {
              setIndex(0);
              setPlaying(true);
            }}
            style={styles.iconButton}>
            <Icon name="replay" size={22} color="#fff" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? t('explainer.pause') : t('explainer.play')}
            onPress={() => {
              if (finished) setIndex(0);
              setPlaying(!playing);
            }}
            style={styles.playButton}>
            <Icon name={playing ? 'pause' : 'play'} size={30} color={Colors.dark.background} />
          </Pressable>
          <View style={styles.iconButton}>
            <Icon name="speaker" size={22} color={speak ? '#fff' : 'rgba(255,255,255,0.3)'} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

/** Share of the meal's gut effects that are good, 0-1, for the microbe mix. */
function gutHealth(analysis: Analysis) {
  const good = analysis.gut.filter((item) => item.effect === 'good').length;
  const bad = analysis.gut.filter((item) => item.effect === 'bad').length;
  return good + bad === 0 ? 0.6 : 0.15 + (good / (good + bad)) * 0.75;
}

/** The take-apart scene, run on the scene's own clock while playing. */
function InsideStage({
  parts,
  progressRef,
  playing,
  duration,
}: {
  parts: Part[];
  progressRef: { current: number };
  playing: boolean;
  duration: number;
}) {
  useFrame((_, delta) => {
    if (playing) progressRef.current = Math.min(1, progressRef.current + (delta * 1000) / duration);
  });
  return (
    <group position={[0, -0.1, 0]} scale={0.6}>
      <Deconstruct parts={parts} progress={progressRef} color={partsColor(parts)} />
    </group>
  );
}

/** Calls back with the take-apart progress a few times a second, for the 2D layers. */
function useInsideProgress(progressRef: { current: number }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setProgress(progressRef.current), 150);
    return () => clearInterval(interval);
  }, [progressRef]);
  return progress;
}

/** The caption that follows the take-apart scene: one line per part in the spotlight. */
function InsideCaption({ lines, progressRef }: { lines: string[]; progressRef: { current: number } }) {
  const line = insideLine(lines, useInsideProgress(progressRef));
  return (
    <Animated.View key={line} entering={FadeIn.duration(350)}>
      <ThemedText type="subtitle" style={styles.captionText}>
        {line}
      </ThemedText>
    </Animated.View>
  );
}

/** A badge naming the part in the spotlight, and whether it helps or harms. */
function InsideOverlay({ parts, progressRef }: { parts: Part[]; progressRef: { current: number } }) {
  const { t } = useTranslation();
  const { focus } = deconstructPhase(useInsideProgress(progressRef), parts.length);
  const part = parts[focus];
  if (!part) return null;
  return (
    <View style={styles.insideBadge}>
      <Badge
        key={focus}
        icon={part.good ? 'good' : 'avoid'}
        color={part.good ? MINT : CORAL}
        text={`${t(`parts.${part.kind}.name`)} · ${t(part.good ? 'parts.good' : 'parts.bad')}`}
        delay={0}
      />
    </View>
  );
}

/** Each scene swings in: it grows from small while turning to face the viewer. */
function SceneSwitch({
  scene,
  analysis,
  parts,
  progressRef,
  playing,
  duration,
}: {
  scene: Scene;
  analysis: Analysis;
  parts: Part[];
  progressRef: { current: number };
  playing: boolean;
  duration: number;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    node.scale.setScalar(THREE.MathUtils.damp(node.scale.x, 1, 4, delta));
    node.rotation.y = THREE.MathUtils.damp(node.rotation.y, 0, 3.5, delta);
  });
  const color = verdictColors(analysis.verdict, Colors.dark).color;

  let content: React.ReactNode;
  switch (scene.kind) {
    case 'intro':
      content = (
        <>
          <group position={[0, -0.2, 0]} rotation={[0.38, 0, 0]} scale={1.15}>
            <SaladBowl spin={0.45} />
          </group>
          <FoodOrbit count={6} radius={2.3} speed={0.18} tilt={0.4} />
        </>
      );
      break;
    case 'inside':
      content = <InsideStage parts={parts} progressRef={progressRef} playing={playing} duration={duration} />;
      break;
    case 'gut':
      content = (
        <group rotation={[0.25, -0.35, 0]} scale={0.72}>
          <GutScene health={gutHealth(analysis)} speed={2.2} />
        </group>
      );
      break;
    case 'body':
      content = <HeartScene strain={analysis.body.some((item) => item.effect === 'bad')} />;
      break;
    case 'risks':
      // The gut crowded with troublemakers: what eating this often does over time.
      content = (
        <group rotation={[0.25, -0.35, 0]} scale={0.66} position={[0, 0.7, -1]}>
          <GutScene health={analysis.risks.length ? 0.12 : 0.85} speed={1.4} />
        </group>
      );
      break;
    case 'next':
      content = (
        <group position={[0, -0.9, 0]}>
          <FoodRow items={[2, 3, 4]} color={MINT} />
        </group>
      );
      break;
    case 'outro':
      content = <ScoreOrb score={analysis.score} color={color} />;
      break;
  }

  return (
    <group ref={group} scale={0.35} rotation={[0, -1.2, 0]}>
      {content}
    </group>
  );
}

/** 2D labels layered over the 3D scene where words carry the meaning. */
function SceneOverlay({
  scene,
  analysis,
  parts,
  progressRef,
}: {
  scene: Scene;
  analysis: Analysis;
  parts: Part[];
  progressRef: { current: number };
}) {
  const { t } = useTranslation();
  if (scene.kind === 'inside') return <InsideOverlay parts={parts} progressRef={progressRef} />;
  if (scene.kind === 'risks' && analysis.risks.length) {
    return (
      <View style={styles.badgeColumn}>
        {analysis.risks.map((risk, position) => (
          <Badge key={risk} icon="risk" color={CORAL} text={t(`risks.${risk}.name`)} delay={position * 380} />
        ))}
      </View>
    );
  }
  if (scene.kind === 'next') {
    return (
      <View style={[styles.badgeColumn, styles.badgeTop]}>
        {analysis.avoid.slice(0, 2).map((item, position) => (
          <Badge key={item.id} icon="avoid" color={CORAL} text={t(`avoid.${item.id}.food`)} delay={position * 320} />
        ))}
        {analysis.eat
          .filter((id) => id !== 'more_of_this')
          .slice(0, 2)
          .map((id, position) => (
            <Badge key={id} icon="good" color={MINT} text={t(`eat.${id}.food`)} delay={700 + position * 320} />
          ))}
      </View>
    );
  }
  return null;
}

function Badge({ icon, color, text, delay }: { icon: IconName; color: string; text: string; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.badge}>
      <Icon name={icon} size={20} color={color} />
      <ThemedText type="smallBold" style={styles.badgeText}>
        {text}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    bottom: 220,
  },
  safe: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  progress: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  title: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: Spacing.three,
  },
  stage: {
    flex: 1,
    justifyContent: 'center',
  },
  badgeColumn: {
    gap: Spacing.two + 2,
  },
  badgeTop: {
    justifyContent: 'flex-start',
  },
  insideBadge: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Spacing.two,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    backgroundColor: 'rgba(7,18,13,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  badgeText: {
    color: '#fff',
    flex: 1,
    fontSize: 16,
  },
  caption: {
    minHeight: 120,
    justifyContent: 'center',
  },
  captionText: {
    color: '#fff',
    textAlign: 'center',
  },
  notice: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.five,
    paddingVertical: Spacing.three,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
