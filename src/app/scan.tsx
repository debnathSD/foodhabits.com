import { useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FoodCamera, type FoodCameraHandle } from '@/components/food-camera';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useFoodName } from '@/hooks/use-analysis';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/i18n/use-translation';
import { haptics } from '@/lib/haptics';
import { type PhotoSource, preparePhoto } from '@/lib/image';
import { logMeal } from '@/lib/log-meal';
import { goBack } from '@/lib/navigation';
import type { Prediction } from '@/lib/recognition';
import { recognitionAvailable, recognizeFood, useModelDownload, warmUpRecognizer } from '@/lib/recognizer';

type Phase =
  | { kind: 'camera' }
  | { kind: 'working'; photo: PhotoSource | null }
  | { kind: 'choose'; photo: PhotoSource; predictions: Prediction[] }
  | { kind: 'error'; photo: PhotoSource | null; message: string };

export default function ScanScreen() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>({ kind: 'camera' });
  const download = useModelDownload();
  // Web-only demo for marketing screenshots: a plain backdrop stands in for the camera feed.
  const { demo } = useLocalSearchParams<{ demo?: string }>();

  useEffect(() => {
    // The screenshot demo has no camera feed, so it doesn't need the model.
    if (!demo) warmUpRecognizer();
  }, [demo]);

  async function handlePhoto(source: PhotoSource) {
    setPhase({ kind: 'working', photo: null });
    let photo: PhotoSource | null = null;
    try {
      photo = await preparePhoto(source);
      setPhase({ kind: 'working', photo });
      const recognition = await recognizeFood(photo);
      if (recognition.kind === 'not_food') {
        haptics.warning();
        setPhase({ kind: 'error', photo, message: t('scan.notFood') });
      } else if (recognition.kind === 'match') {
        openResult(photo, recognition.prediction, recognition.alternatives);
      } else {
        haptics.tap();
        setPhase({ kind: 'choose', photo, predictions: recognition.predictions });
      }
    } catch (error) {
      console.warn('Recognition failed', error);
      haptics.warning();
      setPhase({ kind: 'error', photo, message: t('scan.failed') });
    }
  }

  function openResult(photo: PhotoSource, chosen: Prediction, others: Prediction[]) {
    haptics.success();
    const id = logMeal({
      food: chosen.food,
      photo: photo.uri,
      confidence: chosen.confidence,
      alternatives: others.map((prediction) => prediction.food.ref),
    });
    router.replace({ pathname: '/result/[id]', params: { id } });
  }

  function openSearch(photo: PhotoSource | null) {
    router.replace(photo ? { pathname: '/search', params: { photo: photo.uri } } : '/search');
  }

  if (Platform.OS === 'web' && demo) return <Camera onPhoto={handlePhoto} onSearch={() => openSearch(null)} demo />;

  if (!recognitionAvailable) {
    return (
      <Message
        icon="search"
        text={t('scan.unsupported')}
        primary={{ title: t('scan.search'), onPress: () => openSearch(null) }}
      />
    );
  }

  if (phase.kind === 'camera') return <Camera onPhoto={handlePhoto} onSearch={() => openSearch(null)} />;

  if (phase.kind === 'working') {
    return (
      <PhotoBackdrop photo={phase.photo}>
        <View style={styles.working}>
          <ActivityIndicator color="#fff" size="large" />
          <ThemedText type="heading" style={styles.onPhoto}>
            {download === null ? t('scan.looking') : t('scan.preparing', { percent: Math.round(download * 100) })}
          </ThemedText>
        </View>
      </PhotoBackdrop>
    );
  }

  if (phase.kind === 'choose') {
    const { photo, predictions } = phase;
    return (
      <Chooser
        photo={photo}
        predictions={predictions}
        onChoose={(prediction) => openResult(photo, prediction, predictions.filter((other) => other !== prediction))}
        onSearch={() => openSearch(photo)}
      />
    );
  }

  return (
    <Message
      icon="warning"
      text={phase.message}
      primary={{ title: t('common.retry'), onPress: () => setPhase({ kind: 'camera' }) }}
      secondary={{ title: t('scan.noneOfThese'), onPress: () => openSearch(phase.photo) }}
    />
  );
}

function Camera({ onPhoto, onSearch, demo }: { onPhoto: (photo: PhotoSource) => void; onSearch: () => void; demo?: boolean }) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<FoodCameraHandle>(null);
  const [ready, setReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const asset = result.canceled ? null : result.assets[0];
    if (asset) onPhoto({ uri: asset.uri, width: asset.width, height: asset.height });
  }

  async function takePicture() {
    if (!camera.current || !ready || busy) return;
    setBusy(true);
    haptics.tap();
    try {
      onPhoto(await camera.current.takePicture());
    } catch (error) {
      console.warn('Could not take a picture', error);
      setBusy(false);
    }
  }

  const controls = (
    <View style={styles.controls} pointerEvents="box-none">
      <RoundButton icon="photos" label={t('scan.library')} onPress={pickFromLibrary} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('scan.takePhoto')}
        disabled={!ready || busy || unavailable}
        onPress={takePicture}
        style={({ pressed }) => [styles.shutter, { opacity: !demo && (!ready || unavailable) ? 0.4 : pressed ? 0.7 : 1 }]}>
        <View style={styles.shutterInner} />
      </Pressable>
      <RoundButton icon="search" label={t('scan.search')} onPress={onSearch} />
    </View>
  );

  if (!demo && !permission) return <View style={styles.camera} />;

  const upload = { title: Platform.OS === 'web' ? t('scan.upload') : t('scan.library'), onPress: pickFromLibrary };

  if (!demo && !permission?.granted) {
    // A browser can't open its own camera settings, so a blocked camera leaves uploading as the way in.
    const blocked = !permission?.canAskAgain;
    return (
      <Message
        icon="camera"
        title={t('scan.cameraTitle')}
        text={t('scan.cameraText')}
        primary={
          !blocked
            ? { title: t('scan.allowCamera'), onPress: requestPermission }
            : Platform.OS === 'web'
              ? upload
              : { title: t('scan.openSettings'), onPress: () => Linking.openSettings() }
        }
        secondary={blocked && Platform.OS === 'web' ? undefined : upload}
        tertiary={{ title: t('scan.search'), onPress: onSearch }}
      />
    );
  }

  return (
    <View style={styles.camera}>
      {demo ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#2A2622' }]} />
      ) : unavailable ? (
        <View style={styles.unavailable}>
          <ThemedText style={styles.onPhoto}>{t('scan.noCamera')}</ThemedText>
          <Button title={t('scan.upload')} icon="upload" onPress={pickFromLibrary} />
        </View>
      ) : (
        <FoodCamera
          ref={camera}
          style={StyleSheet.absoluteFill}
          torch={torch}
          onReady={() => setReady(true)}
          onUnavailable={() => setUnavailable(true)}
        />
      )}
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="box-none">
          <RoundButton icon="close" label={t('common.close')} onPress={() => goBack()} />
          {!unavailable && (
            <RoundButton
              icon={torch ? 'torchOff' : 'torchOn'}
              label={torch ? t('scan.torchOff') : t('scan.torchOn')}
              onPress={() => setTorch(!torch)}
            />
          )}
        </View>
        {(demo || !unavailable) && (
          <View style={styles.frameArea} pointerEvents="none">
            <View style={styles.frame} />
            <ThemedText type="smallBold" style={styles.onPhoto}>
              {t('scan.frameHint')}
            </ThemedText>
          </View>
        )}
        <View style={styles.bottom} pointerEvents="box-none">
          {/* Browsers on laptops and phones get a labelled way to upload a photo; the round icon alone isn't read as one. */}
          {Platform.OS === 'web' && !demo && !unavailable && <UploadButton label={t('scan.upload')} onPress={pickFromLibrary} />}
          {controls}
        </View>
      </SafeAreaView>
    </View>
  );
}

function Chooser({
  photo,
  predictions,
  onChoose,
  onSearch,
}: {
  photo: PhotoSource;
  predictions: Prediction[];
  onChoose: (prediction: Prediction) => void;
  onSearch: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const foodName = useFoodName();
  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.chooser}>
          <Image source={{ uri: photo.uri }} style={styles.chooserPhoto} contentFit="cover" />
          <ThemedText type="title">{t('scan.pickTitle')}</ThemedText>
          <ThemedText themeColor="textSecondary">{t('scan.pickSubtitle')}</ThemedText>
          {predictions.map((prediction) => (
            <Pressable
              key={prediction.index}
              accessibilityRole="button"
              onPress={() => onChoose(prediction)}
              style={({ pressed }) => [styles.option, { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.8 : 1 }]}>
              <View style={styles.flex}>
                <ThemedText type="subtitle" style={styles.optionName}>
                  {foodName(prediction.food)}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {t('scan.match', { percent: Math.max(1, Math.round(prediction.confidence * 100)) })}
                </ThemedText>
              </View>
              <Icon name="chevron" size={18} color={theme.textSecondary} />
            </Pressable>
          ))}
          <Button title={t('scan.noneOfThese')} icon="search" variant="secondary" onPress={onSearch} />
          <Button title={t('common.cancel')} variant="ghost" onPress={() => goBack()} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function PhotoBackdrop({ photo, children }: { photo: PhotoSource | null; children: React.ReactNode }) {
  return (
    <View style={styles.camera}>
      {photo && <Image source={{ uri: photo.uri }} style={[StyleSheet.absoluteFill, styles.dimmed]} contentFit="cover" />}
      {children}
    </View>
  );
}

type Action = { title: string; onPress: () => void };

function Message({
  icon,
  title,
  text,
  primary,
  secondary,
  tertiary,
}: {
  icon: IconName;
  title?: string;
  text: string;
  primary: Action;
  secondary?: Action;
  tertiary?: Action;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <SafeAreaView style={[styles.flex, styles.message]} edges={['top', 'bottom']}>
        <Icon name={icon} size={44} color={theme.tint} />
        {title && <ThemedText type="title">{title}</ThemedText>}
        <ThemedText type="subtitle" themeColor="textSecondary" style={styles.messageText}>
          {text}
        </ThemedText>
        <View style={styles.messageButtons}>
          <Button title={primary.title} onPress={primary.onPress} />
          {secondary && <Button title={secondary.title} variant="secondary" onPress={secondary.onPress} />}
          {tertiary && <Button title={tertiary.title} variant="secondary" onPress={tertiary.onPress} />}
          <Button title={t('common.close')} variant="ghost" onPress={() => goBack()} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function UploadButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.upload, { opacity: pressed ? 0.75 : 1 }]}>
      <Icon name="upload" size={20} color="#fff" />
      <ThemedText type="smallBold" style={styles.uploadLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function RoundButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.round, { opacity: pressed ? 0.7 : 1 }]}>
      <Icon name={icon} size={22} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  camera: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  frameArea: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  // Smaller than the screen so people hold the phone far enough away for it to focus.
  frame: {
    width: '66%',
    aspectRatio: 1,
    borderRadius: Radius.large,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  bottom: {
    gap: Spacing.two,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: Spacing.four,
  },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
  },
  round: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onPhoto: {
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 6,
  },
  unavailable: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    padding: Spacing.five,
  },
  upload: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  uploadLabel: {
    color: '#fff',
  },
  working: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  dimmed: {
    opacity: 0.55,
  },
  chooser: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  chooserPhoto: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius.large,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  optionName: {
    fontWeight: 600,
  },
  message: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
    gap: Spacing.three,
  },
  messageText: {
    textAlign: 'center',
  },
  messageButtons: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
});
