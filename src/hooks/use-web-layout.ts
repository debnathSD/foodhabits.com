import { Platform, useWindowDimensions } from 'react-native';

/** Web windows at least this wide get the desktop layout (top navigation pill, columns). */
export const WIDE_WEB = 900;

/**
 * The web layout: whether this is a wide desktop window, the space tab screens
 * leave for the floating top navigation, and the transparent screen background
 * that lets the page backdrop show.
 */
export function useWebLayout() {
  const { width } = useWindowDimensions();
  const web = Platform.OS === 'web';
  const wide = web && width >= WIDE_WEB;
  return {
    wide,
    topInset: wide ? 104 : 0,
    screen: web ? ({ backgroundColor: 'transparent' } as const) : null,
  };
}
