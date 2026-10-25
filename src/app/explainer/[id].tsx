/**
 * The narrated 3D explainer video for one meal. The video itself is a Remotion
 * composition (src/video) played in a DOM component, built from the analysis
 * in the user's language. The device's own text-to-speech narrates each scene
 * in that language, so it works offline, for every food, at no cost. Captions
 * are always in the video; without a voice for the language it plays silently.
 * The video waits at the end of a scene until its narration has finished.
 */
import * as Speech from 'expo-speech';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ExplainerVideo from '@/components/explainer-video';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Colors, Spacing, verdictColors } from '@/constants/theme';
import { useAnalysis } from '@/hooks/use-analysis';
import { useTranslation } from '@/i18n/use-translation';
import { dishLook } from '@/lib/dish-look';
import { goBack } from '@/lib/navigation';
import { photoDataUri } from '@/lib/photo-store';
import { useAppState } from '@/lib/store';
import { pickVoice } from '@/lib/voice';
import { buildExplainerProps } from '@/video/props';

export default function ExplainerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scan = useAppState((state) => state.scans.find((candidate) => candidate.id === id));
  const voiceSetting = useAppState((state) => state.voice);
  const result = useAnalysis(scan);
  const { t, list, inSentence, speechLanguage, rtl } = useTranslation();
  // The voice to narrate in: undefined while looking, null when there is none for this language.
  const [voice, setVoice] = useState<string | null | undefined>(undefined);
  // The meal's photo for the video (undefined while loading, null for searched meals).
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  // The scene whose narration is still being spoken (-1: none). Each narration
  // gets a token, so the callback of one that was cut short can't clear a newer one.
  const [narrating, setNarrating] = useState({ token: 0, scene: -1 });
  const tokens = useRef(0);

  useEffect(() => {
    Speech.getAvailableVoicesAsync()
      .then((voices) => setVoice(pickVoice(voices, speechLanguage)))
      .catch(() => setVoice(null));
    return () => {
      Speech.stop();
    };
  }, [speechLanguage]);

  const photoName = scan?.photo ?? null;
  useEffect(() => {
    photoDataUri(photoName)
      .then(setPhoto)
      .catch(() => setPhoto(null));
  }, [photoName]);

  const voiceAvailable = voice === undefined ? null : voice !== null;
  const speak = voiceSetting && voiceAvailable === true;

  if (!result || voiceAvailable === null || photo === undefined) {
    return <View style={[styles.container, { backgroundColor: Colors.dark.background }]} />;
  }

  const video = buildExplainerProps({
    analysis: result.analysis,
    dish: result.name,
    photo,
    look: dishLook(result.food.category, result.food.name),
    t,
    list,
    lower: inSentence,
    color: verdictColors(result.analysis.verdict, Colors.dark).color,
    speaking: speak,
    rtl,
  });

  return (
    <View style={[styles.container, { backgroundColor: Colors.dark.background }]}>
      <ExplainerVideo
        video={video}
        labels={{ play: t('explainer.play'), pause: t('explainer.pause'), replay: t('explainer.replay') }}
        narratingScene={narrating.scene}
        onScene={async (index) => {
          Speech.stop();
          const narration = video.scenes[index]?.narration;
          const token = ++tokens.current;
          if (!speak || !narration) {
            setNarrating({ token, scene: -1 });
            return;
          }
          const finished = () => setNarrating((current) => (current.token === token ? { token, scene: -1 } : current));
          setNarrating({ token, scene: index });
          Speech.speak(narration, {
            language: speechLanguage,
            voice: voice ?? undefined,
            rate: 0.95,
            onDone: finished,
            onStopped: finished,
            onError: finished,
          });
        }}
        onPause={async () => {
          Speech.stop();
        }}
        // The closing line finishes over the last frame rather than being cut off.
        onEnded={async () => {}}
        dom={{ style: { flex: 1 }, scrollEnabled: false }}
      />
      <SafeAreaView style={styles.overlay} edges={['top']} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="box-none">
          {voiceSetting && voiceAvailable === false && (
            <ThemedText type="caption" style={styles.notice}>
              {t('explainer.noVoice')}
            </ThemedText>
          )}
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={goBack} style={styles.close}>
            <Icon name="close" size={20} color="#fff" />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  notice: {
    flex: 1,
    color: 'rgba(255,255,255,0.75)',
    marginTop: Spacing.five,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
