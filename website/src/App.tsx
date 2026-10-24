import { useCallback, useEffect, useRef, useState } from 'react';

import { startCounters, startReveals, startSmoothScroll, startSplitReveals } from './motion';
import { Preloader } from './sections/Brand';
import { preloadScans } from './scene/scans';
import { Compare, Editorial, Finale, Footer, Gut, Languages, Nav, Privacy, Truth } from './sections/Sections';
import { Inside } from './sections/Inside';
import { Stage } from './sections/Stage';

// Start fetching the photoscans with the page, before their sections scroll into view.
preloadScans(['food_pomegranate_01', 'food_avocado_01', 'food_lime_01', 'food_kiwi_01', 'food_ginger_01', 'food_apple_01']);

export function App() {
  const [loading, setLoading] = useState(true);
  const splits = useRef<ReturnType<typeof startSplitReveals> | null>(null);

  useEffect(() => {
    const stopScroll = startSmoothScroll();
    const stopReveals = startReveals();
    const stopCounters = startCounters();
    // Once the fonts are in, so each heading splits on its final line breaks.
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) splits.current = startSplitReveals();
    });
    return () => {
      cancelled = true;
      stopScroll();
      stopReveals();
      stopCounters();
      splits.current?.stop();
    };
  }, []);

  const onRevealed = useCallback(() => {
    setLoading(false);
    splits.current?.playHero();
  }, []);

  return (
    <>
      {loading && <Preloader onDone={onRevealed} />}
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <span id="top" />
        <Stage />
        <Inside />
        <Gut />
        <Editorial />
        <Truth />
        <Languages />
        <Privacy />
        <Compare />
        <Finale />
      </main>
      <Footer />
    </>
  );
}
