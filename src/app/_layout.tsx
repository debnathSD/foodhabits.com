import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
  useFonts,
} from '@expo-google-fonts/inter-tight';
import { DarkTheme, DefaultTheme, LocaleProvider, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { LaunchAnimation } from '@/components/launch-animation';
import { WebBackdrop } from '@/components/web-backdrop';
import { Colors, Type } from '@/constants/theme';
import { applyDirection } from '@/i18n/direction';
import { useTranslation } from '@/i18n/use-translation';
import { loadState, useAppState } from '@/lib/store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const ready = useAppState((state) => state.ready);
  const onboarded = useAppState((state) => state.onboarded && state.language !== null);
  const { t, language, rtl } = useTranslation();
  // The Kolam f drawing that plays once as the splash screen hides.
  const [launching, setLaunching] = useState(true);
  const launched = useCallback(() => setLaunching(false), []);
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSerif_400Regular,
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
  });
  // Fall back to system fonts rather than block the app if a font fails to load.
  const fontsReady = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    loadState();
  }, []);

  useEffect(() => {
    if (ready && fontsReady) SplashScreen.hideAsync();
  }, [ready, fontsReady]);

  useEffect(() => {
    applyDirection(language, rtl);
  }, [language, rtl]);

  if (!ready || !fontsReady) return null;

  const navigationTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider
      value={{
        ...navigationTheme,
        // On the web, screens sit on the page's cinematic backdrop.
        colors: { ...navigationTheme.colors, primary: colors.tint, background: Platform.OS === 'web' ? 'transparent' : colors.background },
      }}>
      <WebBackdrop />
      <LocaleProvider direction={rtl ? 'rtl' : 'ltr'}>
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.tint,
            headerTitleStyle: { color: colors.text, fontFamily: Type.semibold },
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: Platform.OS === 'web' ? 'transparent' : colors.background },
          }}>
          <Stack.Protected guard={onboarded} redirectTo="/welcome">
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="scan" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
            <Stack.Screen name="search" options={{ title: t('search.title'), presentation: 'modal' }} />
            <Stack.Screen
              name="result/[id]"
              options={{ title: '', headerTransparent: true, headerTintColor: '#F3F7F2', headerStyle: { backgroundColor: 'transparent' } }}
            />
            <Stack.Screen name="explainer/[id]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          </Stack.Protected>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="welcome" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Screen name="language" options={{ title: t('profile.language'), presentation: 'modal' }} />
          <Stack.Screen name="privacy" options={{ title: t('privacy.title') }} />
        </Stack>
      </LocaleProvider>
      {launching && <LaunchAnimation onDone={launched} />}
    </ThemeProvider>
  );
}
