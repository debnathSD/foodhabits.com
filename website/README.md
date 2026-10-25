# foodhabits.com website

The marketing site for foodhabits.com, published at
https://debnathsd.github.io/foodhabits.com/. Its "Try now" button opens the web
app, which is published next to it at `/foodhabits.com/app/`.

Built with Vite, React, React Three Fiber (three.js), GSAP and Lenis. The 3D
food uses photoscans from [Poly Haven](https://polyhaven.com) (CC0), and the
"inside the dish" scene shares its parts and timing with the app
(`../src/three`, `../src/lib`, aliased as `@three` and `@lib` in
`vite.config.ts`).

## Run it

```bash
npm install --prefix website
npm run dev --prefix website        # http://localhost:5173
npm run build --prefix website      # type-checks, then builds into website/dist
npm run lint --prefix website
```

In development, "Try now" opens the app's own dev server (`VITE_APP_URL` in
`.env.development`); start it from the repo root with
`npm run web -- --port 8086`. In a build, it opens `<base>/app/`.

## Where things live

| What | File |
|---|---|
| Hero, the four steps and the phone story | `src/sections/Stage.tsx`, `src/scene/HeroScene.tsx` (glass callouts) |
| Figures (dishes, foods), languages, privacy, comparison table, end credits | `src/sections/Sections.tsx` |
| Scene slates, chapter CTAs and the timecode readout | `src/sections/Cinema.tsx` |
| Film-title reveals, preloader, smooth scroll | `src/motion.ts` |
| Inside-the-dish scene | `src/sections/Inside.tsx`, `src/scene/InsideScene.tsx` |
| Privacy policy page | `privacy.html` (built as a second page, styled by `src/legal.ts`) |
| Logo, "Try now" key and preloader | `src/sections/Brand.tsx` |
| Phone screenshots | `public/screens`, refreshed with `npm run capture:screens` from the repo root |

## Keep the claims true

The figures and privacy copy describe what the app really does, so update them
with the app:

- **Dishes recognised from a photo:** the app recognises every dish in
  `dishLabels()` (`../src/lib/dish-labels.ts`), 2,254 today, with SigLIP 2.
  The phone apps (not released yet) use the same model after a one-time
  download, and the AIY model's 2,023 dishes until then.
- **Foods you can search:** the catalog plus the AIY labels, also 2,254.
- **Privacy:** photos never leave the device. The app downloads its food model
  once from Hugging Face, which the privacy page discloses. The site
  itself loads no cookies, analytics or third-party scripts.

The same privacy text is in the app (`privacy.body` in
`../src/i18n/locales/*.ts`), in all 22 languages; change both together.

- **End credits:** the footer credits the models, photoscans and typefaces the
  site and app really use (`CREDITS` in `src/sections/Sections.tsx`).

## Cinematic design

The site plays like a film, in chapters. The direction came from the UI UX Pro
Max skill (Parallax Storytelling, Scroll-Triggered Storytelling) and
getlayers.ai; the reveal effects follow patterns from the 21st.dev catalog,
written here in GSAP and CSS.

- **The cinema:** a near-black page (`--black`) with film grain that shifts a
  few times a second and a soft vignette (`body::after`, `body::before`).
- **Screens:** each chapter is its own rounded, softly lit panel (`.screen`,
  or the sticky frame of the two pinned scenes), with black between them.
- **Chapters:** a section marked `data-chapter="03|Your gut"` sets its key
  colour with `--key` in CSS (lime, amber, crimson, mint) and opens with a
  `<Slate scene="03" title="Your gut" />`. The key colour lights the slate, the
  italic words in headings, the heading wipe and the chapter's call to action.
  The corner readout (`ChapterHud`, desktop only) follows the chapter on
  screen with a running timecode.
- **Titles:** the hero pulls into focus letter by letter as the curtain opens
  from the middle; every other `data-split` heading is wiped on line by line by
  a block of its chapter's key colour.
- **Restraint:** only the opening story and the take-apart scene are pinned.
  With reduced motion the grain, sweep and wipes are off and every heading is
  simply there.

## Publishing

Every push to `main` runs `../.github/workflows/pages.yml`. It builds this site
with `SITE_BASE=/foodhabits.com/` and the web app into `app/`, and publishes
both to GitHub Pages.
