import { deconstructPhase } from '@lib/deconstruct';
import { useEffect, useRef, useState } from 'react';

import { trackProgress } from '../motion';
import { InsideScene } from '../scene/InsideScene';
import { Slate } from './Cinema';
import { PARTS } from './inside-parts';

/** What the readout says outside the spotlight tour. */
function stateText(progress: number) {
  if (progress < 0.1) return { tag: 'Whole', name: 'Chole bhature', fact: 'One plate, scored 5 out of 10. Scroll to take it apart.' };
  if (progress < 0.3) return { tag: 'Breaking down', name: 'Down to the fibre', fact: 'Every dish is broken down into the parts it is made of.' };
  return { tag: 'Back together', name: 'Fine in moderation', fact: 'Two parts help, two work against you. Small swaps tip the balance.' };
}

/** A pinned chapter: scroll takes one plate apart, part by part, then puts it back together. */
export function Inside() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const readout = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLSpanElement>(null);
  const name = useRef<HTMLHeadingElement>(null);
  const fact = useRef<HTMLParagraphElement>(null);
  const chips = useRef<(HTMLLIElement | null)[]>([]);
  const [compact, setCompact] = useState(() => window.innerWidth < 860);

  useEffect(() => {
    const onResize = () => setCompact(window.innerWidth < 860);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!section.current) return;
    const stop = trackProgress(section.current, (value) => {
      progress.current = value;
    });
    let shown = '';
    let frame = 0;
    // Update the words straight from scroll progress, without React re-renders.
    const render = () => {
      const p = progress.current;
      const phase = deconstructPhase(p, PARTS.length);
      const part = PARTS[phase.focus];
      const text = part ? { tag: part.good ? 'Good' : 'Bad', name: part.name, fact: part.fact } : stateText(p);
      const key = `${text.tag}|${text.name}`;
      if (key !== shown && tag.current && name.current && fact.current && readout.current) {
        shown = key;
        tag.current.textContent = text.tag;
        name.current.textContent = text.name;
        fact.current.textContent = text.fact;
        readout.current.dataset.tone = part ? (part.good ? 'good' : 'bad') : 'neutral';
        readout.current.classList.remove('is-changing');
        void readout.current.offsetWidth;
        readout.current.classList.add('is-changing');
      }
      chips.current.forEach((chip, index) => chip?.classList.toggle('is-active', index === phase.focus));
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      stop();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={section} className="inside" id="inside" data-chapter="02|Inside the plate" aria-labelledby="inside-title">
      <div className="inside__frame">
        <InsideScene progress={progress} compact={compact} />
        <div className="inside__copy">
          <Slate scene="02" title="Inside the plate" />
          <h2 className="h2" id="inside-title" data-split>
            Take any meal <em>apart</em>.
          </h2>
          <p className="lede">
            foodhabits.com breaks each dish down to what it is made of, all the way to the fibre, and puts a light on the parts
            that help and the parts that harm.
          </p>
          <div ref={readout} className="readout" data-tone="neutral">
            <span ref={tag} className="readout__tag">
              Whole
            </span>
            <h3 ref={name} className="h3">
              Chole bhature
            </h3>
            <p ref={fact}>One plate, scored 5 out of 10. Scroll to take it apart.</p>
          </div>
          <ul className="inside__parts" aria-label="What chole bhature is made of">
            {PARTS.map((part, index) => (
              <li
                key={part.kind}
                className={part.good ? 'is-good' : 'is-bad'}
                ref={(node) => {
                  chips.current[index] = node;
                }}>
                {part.name}
                <span className="sr-only">{part.good ? ', good' : ', bad'}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
