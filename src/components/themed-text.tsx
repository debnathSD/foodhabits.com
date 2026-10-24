import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'display' | 'largeTitle' | 'title' | 'heading' | 'subtitle' | 'small' | 'smallBold' | 'caption' | 'link' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  default: {
    fontFamily: Type.regular,
    fontSize: 16,
    lineHeight: 23,
  },
  display: {
    fontFamily: Type.serif,
    fontSize: 64,
    lineHeight: 62,
    letterSpacing: -1,
  },
  largeTitle: {
    fontFamily: Type.serif,
    fontSize: 42,
    lineHeight: 44,
    letterSpacing: -0.6,
  },
  title: {
    fontFamily: Type.serif,
    fontSize: 32,
    lineHeight: 35,
    letterSpacing: -0.3,
  },
  heading: {
    fontFamily: Type.semibold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: Type.regular,
    fontSize: 17,
    lineHeight: 24,
  },
  small: {
    fontFamily: Type.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: Type.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: Type.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  link: {
    fontFamily: Type.semibold,
    fontSize: 15,
    lineHeight: 22,
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
});
