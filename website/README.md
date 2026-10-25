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
| Figures (dishes, foods), languages, privacy, comparison table, footer | `src/sections/Sections.tsx` |
| Inside-the-dish scene | `src/sections/Inside.tsx`, `src/scene/InsideScene.tsx` |
| Privacy policy page | `privacy.html` (built as a second page, styled by `src/legal.ts`) |
| Logo, "Try now" key and preloader | `src/sections/Brand.tsx` |
| Phone screenshots | `public/screens`, refreshed with `npm run capture:screens` from the repo root |

## Keep the claims true

The figures and privacy copy describe what the app really does, so update them
with the app:

- **Dishes recognised from a photo:** the web app recognises every dish in
  `dishLabels()` (`../src/lib/dish-labels.ts`), 2,254 today, with SigLIP 2.
  The phone apps, not released yet, use the AIY model (2,023 dishes).
- **Foods you can search:** the catalog plus the AIY labels, also 2,254.
- **Privacy:** photos never leave the device. The web app downloads its food
  model once from Hugging Face, which the privacy page discloses. The site
  itself loads no cookies, analytics or third-party scripts.

The same privacy text is in the app (`privacy.body` in
`../src/i18n/locales/*.ts`), in all 22 languages; change both together.

## Publishing

Every push to `main` runs `../.github/workflows/pages.yml`. It builds this site
with `SITE_BASE=/foodhabits.com/` and the web app into `app/`, and publishes
both to GitHub Pages.
