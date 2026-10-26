import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';

export { Section } from './section';

/** Web: a translucent surface that rises in as it appears. */
export function Card({ style, children, ...props }: ViewProps) {
  return (
    <div className="fh-card">
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
