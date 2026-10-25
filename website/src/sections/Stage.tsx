import { useEffect, useRef, useState } from 'react';

import { reducedMotion, trackProgress } from '../motion';
import { HeroScene } from '../scene/HeroScene';
import { TryNow } from './Brand';

const STEPS = [
  {
    title: 'Snap.',
    text: 'Point your camera at any plate. A model on your device recognises over 2,250 dishes, Bengali home cooking included, and nothing is uploaded.',
  },
  {
    title: 'Understand.',
    text: 'A gut score from 1 to 10, with what helps, what harms and why, in plain words.',
  },
  {
    title: 'Act.',
    text: 'The foods to skip at your next meal, and better ones to eat instead, tuned to your diet.',
  },
  {
    title: 'Watch.',
    text: 'Every meal comes with a narrated 3D explainer, in your language.',
  },
];

const smooth = (from: number, to: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/** The opening: hero, then four pinned story steps while the phone turns. */
export function Stage() {
  const stage = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const hero = useRef<HTMLDivElement>(null);
  const steps = useRef<(HTMLDivElement | null)[]>([]);
  const chapters = useRef<(HTMLSpanElement | null)[]>([]);
  const rail = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const [compact, setCompact] = useState(() => window.innerWidth < 860);

  useEffect(() => {
    const onResize = () => setCompact(window.innerWidth < 860);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!stage.current) return;
    const stop = trackProgress(stage.current, (value) => {
      progress.current = value;
    });
    let frame = 0;
    // Drive the copy straight from scroll progress, without React re-renders.
    const render = () => {
      const p = progress.current;
      const heroFade = 1 - smooth(0.03, 0.11, p);
      if (hero.current) {
        hero.current.style.opacity = String(heroFade);
        const lift = (1 - heroFade) * -40;
        hero.current.style.transform = compact ? `translateY(${lift}px)` : `translateY(calc(-46% + ${lift}px))`;
      }
      const active = p < 0.16 ? -1 : Math.min(3, Math.floor(((p - 0.16) / 0.8) * 4));
      steps.current.forEach((step, index) => {
        if (!step) return;
        const start = 0.16 + index * 0.2;
        const visible = smooth(start - 0.02, start + 0.04, p) * (1 - smooth(start + 0.16, start + 0.2, p));
        const shown = index === 3 ? smooth(start - 0.02, start + 0.04, p) : visible;
        step.style.opacity = String(shown);
        step.style.transform = `${compact ? '' : 'translateY(-50%) '}translateY(${(1 - shown) * 24}px)`;
      });
      chapters.current.forEach((chapter, index) => chapter?.classList.toggle('is-active', index === active));
      if (rail.current) rail.current.style.opacity = String(0.55 + smooth(0.06, 0.16, p) * 0.45);
      if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, Math.max(0, (p - 0.16) / 0.8))})`;
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      stop();
      cancelAnimationFrame(frame);
    };
  }, [compact]);

  return (
    <section ref={stage} className="stage" id="how" aria-label="How foodhabits.com works">
      <div className="stage__frame">
        <HeroScene progress={progress} compact={compact} />

        <div ref={hero} className="hero-copy">
          <div className="hero-copy__inner">
            <h1 className="display" data-split="reveal">
              Know what your food <em>does</em> to&nbsp;you.
            </h1>
            <div className="hero-copy__side">
              <p className="lede">
                Snap any meal. foodhabits.com shows how it treats your gut and body, the diseases it can lead to if you eat it
                often, and what to eat next.
              </p>
              <div className="actions">
                <TryNow label="Try it now, free" />
                <a className="button button--ghost" href="#how-steps">
                  See how it works
                </a>
              </div>
              <p className="small hero-copy__note">Runs in your browser. iPhone and Android apps coming soon.</p>
            </div>
          </div>
        </div>

        <div className="steps" id="how-steps">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              ref={(node) => {
                steps.current[index] = node;
              }}
              className="step"
              style={reducedMotion ? { opacity: 1, position: 'static', transform: 'none' } : undefined}>
              <span className="step__index" aria-hidden="true">
                {index + 1}
              </span>
              <h2 className="h2">{step.title}</h2>
              <p className="lede">{step.text}</p>
            </div>
          ))}
        </div>

        <div ref={rail} className="rail" aria-hidden="true">
          <div className="rail__chapters">
            {STEPS.map((step, index) => (
              <span
                key={step.title}
                ref={(node) => {
                  chapters.current[index] = node;
                }}>
                <b>{String(index + 1).padStart(2, '0')}</b>
                {step.title.replace('.', '')}
              </span>
            ))}
          </div>
          <span className="rail__track">
            <span ref={bar} />
          </span>
        </div>
      </div>
    </section>
  );
}
