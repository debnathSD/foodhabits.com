import { router } from 'expo-router';
import { Tabs, TabList, TabSlot, TabTrigger, type TabListProps, type TabTriggerSlotProps } from 'expo-router/ui';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { SnapButton } from '@/components/snap-button';
import { Icon, type IconName } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/use-translation';

/** Screens at least this wide get the top navigation pill; narrower ones a bottom dock. */
export const WIDE = 900;

/** The Kolam f mark (small cut weights), drawn inline so it stays crisp at any size. */
function Mark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="22" fill="#07120D" />
      <g fill="none" stroke="#EAF2EC" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M59 33V32A9 9 0 0 0 41 32V68A9 9 0 0 1 23 68V64" />
        <path d="M16 50A62.8 62.8 0 0 1 84 50A50.96 50.96 0 0 1 16 50Z" />
      </g>
      <g fill="#D4F25C">
        {[
          [50, 32],
          [32, 50],
          [50, 50],
          [68, 50],
          [32, 68],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={3} />
        ))}
      </g>
    </svg>
  );
}

export default function AppTabs() {
  const { t } = useTranslation();
  return (
    <>
      <Tabs>
        <TabSlot style={{ height: '100%' }} />
        <TabList asChild>
          <Navigation>
            <TabTrigger name="index" href="/" asChild>
              <TabButton icon="home">{t('tabs.home')}</TabButton>
            </TabTrigger>
            <TabTrigger name="history" href="/history" asChild>
              <TabButton icon="history">{t('tabs.history')}</TabButton>
            </TabTrigger>
            <TabTrigger name="profile" href="/profile" asChild>
              <TabButton icon="person">{t('tabs.profile')}</TabButton>
            </TabTrigger>
          </Navigation>
        </TabList>
      </Tabs>
    </>
  );
}

function TabButton({ children, icon, isFocused, onPress, href, ref: _ref }: TabTriggerSlotProps & { icon: IconName }) {
  return (
    <a
      href={typeof href === 'string' ? href : undefined}
      className={`fh-nav__tab${isFocused ? ' is-active' : ''}`}
      aria-current={isFocused ? 'page' : undefined}
      onClick={(event) => {
        event.preventDefault();
        onPress?.(event as never);
      }}>
      <Icon name={icon} size={18} color={isFocused ? '#07120D' : 'rgba(234,242,236,0.62)'} />
      <span>{children}</span>
    </a>
  );
}

function Navigation({ children, style: _style, ...props }: TabListProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  return (
    <View {...props} style={[styles.container, wide ? styles.top : styles.bottom]} pointerEvents="box-none">
      <nav className="fh-nav" style={{ width: '100%', maxWidth: wide ? 1180 : 520 }}>
        {wide && (
          <a className="fh-wordmark" href="/" aria-label={t('common.appName')}>
            <Mark />
            <span aria-hidden="true">
              foodhabits<span className="fh-wordmark__dot">.</span>
              <span className="fh-wordmark__tld">com</span>
            </span>
          </a>
        )}
        <div style={{ display: 'flex', gap: 4, flex: wide ? undefined : 1, justifyContent: 'space-between' }}>{children}</div>
        {wide && (
          <>
            <button type="button" className="fh-orb-button" style={{ width: 48, height: 48 }} aria-label={t('home.typeInstead')} onClick={() => router.push('/search')}>
              <Icon name="search" size={20} color="#EAF2EC" />
            </button>
            <div style={{ width: 196 }}>
              <SnapButton label={t('home.snap')} onPress={() => router.push('/scan')} />
            </div>
          </>
        )}
      </nav>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 10,
  },
  top: {
    top: 14,
  },
  bottom: {
    bottom: 12,
  },
});
