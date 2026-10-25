/**
 * The narrated 3D explainer video for one meal. The video itself is a Remotion
 * composition (src/video) played in a DOM component, built from the analysis
 * in the user's language. The device's own text-to-speech narrates each scene
 * in that language, so it works offline, for every food, at no cost. Captions
 * are always in the video; without a voice for the language it plays silently.
 */
import * as Speech from 'expo-speech';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ExplainerVideo from '@/components/explainer-video';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Colors, Spacing, verdictColors } from '@/constants/theme';
import { useAnalysis } from '@/hooks/use-analysis';
import { useTranslation } from '@/i18n/use-translation';
import { goBack } from '@/lib/navigation';
import { useAppState } from '@/lib/store';
import { buildExplainerProps } from '@/video/props';

export default function ExplainerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scan = useAppState((state) => state.scans.find((candidate) => candidate.id === id));
  const voiceSetting = useAppState((state) => state.voice);
  const result = useAnalysis(scan);
  const { t, list, speechLanguage, rtl } = useTranslation();
  const [voiceAvailable, setVoiceAvailable] = useState<boolean | null>(null);

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

  if (!result || voiceAvailable === null) {
    return <View style={[styles.container, { backgroundColor: Colors.dark.background }]} />;
  }

  const video = buildExplainerProps({
    analysis: result.analysis,
    dish: result.name,
    t,
    list,
    color: verdictColors(result.analysis.verdict, Colors.dark).color,
    speaking: speak,
    rtl,
  });

  return (
    <View style={[styles.container, { backgroundColor: Colors.dark.background }]}>
      <ExplainerVideo
        video={video}
        labels={{ play: t('explainer.play'), pause: t('explainer.pause'), replay: t('explainer.replay') }}
        onScene={async (index) => {
          Speech.stop();
          const narration = video.scenes[index]?.narration;
          if (speak && narration) Speech.speak(narration, { language: speechLanguage, rate: 0.95 });
        }}
        onPause={async () => {
          Speech.stop();
        }}
        onEnded={async () => {
          Speech.stop();
        }}
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
