import { useRef } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTilt } from '@/hooks/use-tilt.web';

export { Section } from './section';

/** Web: a glass surface that rises in as it appears and tilts gently towards the pointer. */
export function Card({ style, children, ...props }: ViewProps) {
  const surface = useRef<HTMLDivElement>(null);
  useTilt(surface, 4);
  return (
    <div ref={surface} className="fh-card">
      <View style={[styles.card, style]} {...props}>
        {children}
      </View>
    </div>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three + 4,
    gap: Spacing.two + 2,
  },
});
