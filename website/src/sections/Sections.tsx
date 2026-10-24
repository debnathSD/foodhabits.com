import { useState } from 'react';

import { FinaleScene, GutCanvas, PlateCanvas } from '../scene/SceneCanvas';
import { asset } from '../links';
import { TryNow, Wordmark } from './Brand';

/** Words for "food" in the 22 languages the app offers. */
const FOOD_WORDS = [
  'food', 'भोजन', 'খাবার', 'ఆహారం', 'अन्न', 'உணவு', 'کھانا', 'ખોરાક', 'ಆಹಾರ', 'ഭക്ഷണം', 'ଖାଦ୍ୟ',
  'ਖਾਣਾ', 'খাদ্য', 'comida', 'nourriture', 'alimento', 'Essen', 'طعام', '食物', '食べ物', 'еда', 'makanan',
];

export function Nav() {
  return (
    <header className="nav">
      <div className="nav__inner">
        <Wordmark />
        <nav className="nav__links" aria-label="Sections">
          <a href="#how">How it works</a>
          <a href="#gut">Your gut</a>
          <a href="#languages">Languages</a>
          <a href="#privacy">Privacy</a>
        </nav>
        <TryNow size="small" />
      </div>
    </header>
  );
}

export function Gut() {
  const [health, setHealth] = useState(0.85);
  return (
    <section className="gut" id="gut" aria-labelledby="gut-title">
      <GutCanvas health={health} />
      <div className="wrap gut__copy">
        <h2 className="h2" id="gut-title" data-split>
          Thirty-eight trillion microbes are keeping score.
        </h2>
        <p className="lede" data-reveal>
          Fibre and fermented foods feed the friendly ones. Sugar, deep-frying and processed meat feed the rest. See what one
          plate changes.
        </p>
        <div className="toggle" role="group" aria-label="Choose a meal" data-reveal>
          <button type="button" aria-pressed={health > 0.5} onClick={() => setHealth(0.85)}>
            After dal and salad
          </button>
          <button type="button" aria-pressed={health <= 0.5} onClick={() => setHealth(0.25)}>
            After fries and cola
          </button>
        </div>
        <div className="legend" data-reveal>
          <span>Friendly microbes</span>
          <span>Troublemakers</span>
        </div>
      </div>
    </section>
  );
}

export function Editorial() {
  return (
    <section className="plate section--paper" aria-labelledby="plate-title">
      <div className="plate__stage">
        <div className="plate__copy">
          <h2 className="h2" id="plate-title" data-split>
            Every plate tells your body <em>something</em>.
          </h2>
          <p className="lede" data-reveal>
            foodhabits.com reads it for you: fibre, sugar, salt, fats, fermentation and frying, weighed against your diet and
            sensitivities.
          </p>
        </div>
        <PlateCanvas />
      </div>
      <div className="wrap">
        <div className="figures">
          <div className="figure" data-reveal>
            <span className="figure__value" data-count="2023">
              2,023
            </span>
            <span>dishes recognised from a photo, on your phone</span>
          </div>
          <div className="figure" data-reveal>
            <span className="figure__value" data-count="2100" data-suffix="+">
              2,100+
            </span>
            <span>foods you can search, from masala dosa to kombucha</span>
          </div>
          <div className="figure" data-reveal>
            <span className="figure__value">1 tap</span>
            <span>to confirm your dish, then the full picture</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Truth() {
  return (
    <section className="section truth-section" aria-labelledby="truth-title">
      <div className="wrap truth">
        <div>
          <h2 className="h2" id="truth-title" data-split>
            Honest about what eating it often can do.
          </h2>
          <p className="lede" style={{ marginTop: 28 }} data-reveal>
            Not scare tactics. The evidence, with the context of how much and how often.
          </p>
        </div>
        <div className="truth__rows">
          <div data-reveal>
            <span className="truth__value">18%</span>
            <p className="small">
              higher bowel-cancer risk for every 50&nbsp;g of processed meat eaten a day, according to the WHO’s cancer agency.
            </p>
          </div>
          <div data-reveal>
            <span className="truth__value">5&nbsp;g</span>
            <p className="small">the most salt the WHO advises in a day. One restaurant meal can pass it.</p>
          </div>
          <div data-reveal>
            <span className="truth__value">1–10</span>
            <p className="small">a gut score for every meal, so the effect of small swaps is easy to see.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Languages() {
  const row = [...FOOD_WORDS, ...FOOD_WORDS];
  return (
    <section className="section languages" id="languages" aria-labelledby="languages-title">
      <div className="wrap" style={{ marginBottom: 56 }}>
        <h2 className="h2" id="languages-title" data-split>
          Speaks your language.
        </h2>
        <p className="lede" style={{ marginTop: 24 }} data-reveal>
          Choose from 22 languages when you first open the app, including every major Indian language. The explainer narrates
          in yours.
        </p>
      </div>
      <div className="marquee" aria-hidden="true">
        {row.map((word, index) => (
          <span key={index} lang="und">
            {word}
          </span>
        ))}
      </div>
      <div className="marquee marquee--reverse" aria-hidden="true">
        {[...row].reverse().map((word, index) => (
          <span key={index}>{word}</span>
        ))}
      </div>
    </section>
  );
}

export function Privacy() {
  return (
    <section className="section privacy-section" id="privacy" aria-labelledby="privacy-title">
      <div className="wrap privacy">
        <h2 className="display" id="privacy-title" data-split>
          Your photos never leave your phone.
        </h2>
        <p className="lede" data-reveal>
          The AI runs on your device, even in airplane mode. Nothing is uploaded, stored or sold.
        </p>
        <div className="chips" data-reveal>
          <span>No account</span>
          <span>No ads</span>
          <span>No tracking</span>
          <span>Works offline</span>
          <span>No subscription</span>
        </div>
      </div>
    </section>
  );
}

const ROWS: [string, string, string][] = [
  ['Photo food recognition', 'Free, on your phone', 'Usually a paid tier'],
  ['Gut and body explanations', 'Free', 'Rarely included'],
  ['Disease risks, with context', 'Free', 'Rarely included'],
  ['Narrated 3D explainers', 'Free', 'Not offered'],
  ['Works offline', 'Yes', 'Usually not'],
  ['Price', '₹0, forever', 'Monthly subscription'],
];

export function Compare() {
  return (
    <section className="section section--paper" aria-labelledby="free-title">
      <div className="wrap compare">
        <div>
          <h2 className="h2" id="free-title" data-split>
            Everything. Free.
          </h2>
          <p className="lede" style={{ marginTop: 28 }} data-reveal>
            Diet apps charge a subscription for this. foodhabits.com runs on your phone, so it costs nothing to run, and nothing
            to use.
          </p>
        </div>
        <table className="table" data-reveal>
          <thead>
            <tr>
              <th scope="col">What you get</th>
              <th scope="col">foodhabits.com</th>
              <th scope="col">Typical diet apps</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([feature, ours, theirs]) => (
              <tr key={feature}>
                <td>{feature}</td>
                <td>{ours}</td>
                <td>{theirs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function Finale() {
  return (
    <section className="finale" id="get" aria-labelledby="get-title">
      <FinaleScene />
      <div className="wrap finale__inner">
        <div className="finale__copy">
          <h2 className="display" id="get-title" data-split>
            Start with your <em>next</em> meal.
          </h2>
          <p className="lede" data-reveal>
            Try it in your browser today. The iPhone and Android apps are on their way. Free, private and in your language.
          </p>
          <div className="finale__actions" data-reveal>
            <TryNow label="Try it now, free" />
          </div>
          <div className="badges" data-reveal>
            <span className="badge">
              <small>Coming soon to the</small>
              App Store
            </span>
            <span className="badge">
              <small>Coming soon to</small>
              Google Play
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <span>© 2026 foodhabits.com</span>
        <span>General food guidance, not medical advice.</span>
        <nav aria-label="Legal">
          <a href={asset('privacy.html')}>Privacy</a>
          <a href="mailto:hello@example.com">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
