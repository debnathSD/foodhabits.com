import { useEffect } from 'react';

/** Turns the nav solid once the page has scrolled away from the top. */
export function useNavOnScroll(nav: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const update = () => nav.current?.classList.toggle('nav--solid', window.scrollY > 24);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [nav]);
}
