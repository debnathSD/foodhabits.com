import { useEffect, useRef, useState } from 'react';

import { APP_URL } from '../links';

/**
 * The cinema the site plays in. Every chapter is a section marked
 * data-chapter="03|Your gut"; it opens with a scene slate, and a corner
 * readout follows whichever chapter is on screen with a running timecode, like
 * a film's. Both are decoration: the headings carry the meaning.
 */

/** "● Scene 03 — Your gut", above a chapter's heading. */
export function Slate({ scene, title }: { scene: string; title: string }) {
  return (
    <p className="slate">
      <span className="slate__dot" aria-hidden="true" />
      <span className="slate__scene">Scene {scene}</span>
      <span className="slate__rule" aria-hidden="true" />
      {title}
    </p>
  );
}

/** A small "Try it on your plate" link at the end of a chapter. */
export function ChapterCta({ label = 'Try it on your plate' }: { label?: string }) {
  return (
    <a className="chapter-cta" href={APP_URL}>
      {label}
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

/** Frames per second of the timecode, and how many pixels of scrolling make one frame. */
const FPS = 24;
const PIXELS_PER_FRAME = 6;

const pad = (value: number) => String(value).padStart(2, '0');

function timecode(scroll: number) {
  const frames = Math.floor(scroll / PIXELS_PER_FRAME);
  const seconds = Math.floor(frames / FPS);
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}:${pad(frames % FPS)}`;
}

/** Bottom-right readout: the chapter on screen and the scroll as a timecode. */
export function ChapterHud() {
  const [chapter, setChapter] = useState<[string, string]>(['01', 'Your plate']);
  const clock = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'));
    // The chapter crossing the middle of the screen is the one playing.
    const observer = new IntersectionObserver(
      (entries) => {
        const playing = entries.find((entry) => entry.isIntersecting);
        const [scene, title] = (playing?.target as HTMLElement | undefined)?.dataset.chapter?.split('|') ?? [];
        if (scene && title) setChapter([scene, title]);
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );
    sections.forEach((section) => observer.observe(section));

    // Updated on scroll only, so a still page does no work.
    const update = () => {
      const scroll = window.scrollY;
      if (clock.current) clock.current.textContent = timecode(scroll);
      const height = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${height > 0 ? scroll / height : 0})`;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update);
    };
  }, []);

  return (
    <div className="hud" aria-hidden="true">
      <span className="hud__scene">
        <b>SC {chapter[0]}</b>
        {chapter[1]}
      </span>
      <span ref={clock} className="hud__clock">
        00:00:00:00
      </span>
      <span className="hud__track">
        <span ref={bar} />
      </span>
    </div>
  );
}
