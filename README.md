# foodhabits.com

Snap your plate, keep your gut happy. foodhabits.com is a free app for Android,
iOS and the web that recognises the food in a photo and explains, in plain language:

- how it affects your **gut** and the rest of your **body**,
- the **diseases** linked to eating it often (bowel cancer, type 2 diabetes,
  high blood pressure and more), with honest "how much and how often" context,
- which foods to **avoid at your next meal**, why (for your gut and your
  body), and what to have instead,
- **better versions** of the same meal,
- watch-outs for your diet (vegetarian, vegan, Jain…) and sensitivities
  (lactose, gluten, IBS, reflux, nuts, blood sugar, blood pressure).

Every result has an **animated explainer with voice-over** in the user's
language.

Everything runs **on the device**, in the browser too. There is no server, no
account, no subscription and no per-scan cost, and photos never leave the device.

- Website: https://debnathsd.github.io/foodhabits.com/
- Web app: https://debnathsd.github.io/foodhabits.com/app/

## How it works

```
photo ─► on-device model: SigLIP 2 (web) or AIY (phones) ───────────► top dishes
                                                                         │
            typed search (2,250+ foods incl. dosa, roti, chai, cola) ───┤
                                                                         ▼
     category profile (fibre, sugar, salt, fats, protein, fermented, fried…)
     + per-dish tweaks + the user's diet and sensitivities
                                                                         ▼
     rules engine ─► score, gut and body effects, disease risks, avoid next,
                     eat next, swaps, watch-outs  (language-neutral ids)
                                                                         ▼
     t() ─► the user's language ─► result screen + narrated explainer
```

- **Recognition (web):** Google's [SigLIP 2](https://huggingface.co/google/siglip2-base-patch16-224)
  (Apache 2.0) compares the photo with a sentence for every dish the app knows,
  catalog included ("a photo of shorshe ilish, a fish curry."), plus one per
  English alias, so it recognises Bengali and Indian home food that no
  classifier was trained on. `scripts/build-dish-embeddings.mts`
  (`npm run build:dishes`) embeds the sentences once with the text model and
  gives each dish a prior from its Wikipedia readership, so common dishes beat
  obscure look-alikes. The browser runs only the 63 MB q4 vision model
  ([ONNX](https://huggingface.co/onnx-community/siglip2-base-patch16-224-ONNX),
  pinned to a commit) with [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/):
  on the GPU through WebGPU where the browser offers it (about 0.1 s a photo on
  a MacBook), otherwise on WebAssembly in a worker (about 3 s). It downloads
  once and stays in Cache Storage.
  `src/lib/dish-recognition.ts` turns similarities into a result. On 170
  real-world photos (Indian street food and Food-101) it names the dish first
  125 times and within its top four 148 times; the AIY model below managed 80
  and 102. If SigLIP 2 can't load, the web falls back to AIY.
- **Recognition (phones):** the same SigLIP 2 model and dish table, run by
  [`onnxruntime-react-native`](https://onnxruntime.ai/docs/get-started/with-javascript/react-native.html)
  on the phone's CPU (`src/lib/recognizer.ts`). The model downloads in the
  background the first time the camera opens and is kept in the app's
  documents; until it is there, or if the native runtime can't load, the
  bundled AIY model below recognises the photo, so nobody waits on a download.
  (Google's LiteRT build of SigLIP 2 was tried first, but TFLite's default
  XNNPACK CPU delegate turns its output into NaN.)
- **Fallback (phones):** [Google AIY Food Classifier V1](https://www.kaggle.com/models/google/aiy/tfLite/vision-classifier-food-v1)
  (MobileNet, 2,023 dishes, Apache 2.0) via
  [`react-native-fast-tflite`](https://github.com/mrousavy/react-native-fast-tflite).
  The TFLite file takes 192×192 RGB bytes and returns quantized
  probabilities (value / 256), not the 224×224 floats its model card
  describes. `src/lib/recognizer.ts` encodes this, and it was verified against
  the model with LiteRT. The web fallback runs the same file with
  [LiteRT.js](https://ai.google.dev/edge/litert/web) from `public/litert`.
  When the model isn't sure, the user picks from its top guesses or searches.
- **Knowledge:** every model label is mapped to one of ~80 food categories
  (`src/data/food-labels.json`, built by `scripts/build-food-labels.mjs`).
  Categories carry the nutrition profile (`src/data/categories.ts`), with
  per-dish corrections in `src/data/food-tweaks.ts`. `src/data/catalog.ts`
  adds foods the AIY labels lack, from dosa and chai to plain pizza and steak;
  they are searchable and the web recognizer knows them too, so search and
  photos cover the same 2,254 dishes. Bengali food has its own list
  (`src/data/catalog-bengali.ts`): everyday fish, dal, shaak and posto, Kolkata
  street food, chutneys and sweets, searchable in Bengali script too.
- **Engine:** `src/lib/engine.ts` is pure TypeScript. It outputs ids, not
  sentences, so saved meals re-render in whatever language the user picks
  later.
- **Languages:** `src/i18n`. All 22 languages offered on first launch are fully
  translated: English, Hindi, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati,
  Kannada, Malayalam, Odia, Punjabi, Assamese, Spanish, French, Portuguese,
  German, Arabic, Chinese, Japanese, Russian and Indonesian. Urdu and Arabic
  lay out right to left. `npm test` fails if any language misses a message or
  changes a `{placeholder}`.
- **Explainer:** `src/app/explainer/[id].tsx` plays 3D scenes (three.js via
  React Three Fiber) narrated by the device's own text-to-speech
  (`expo-speech`), with captions always on. A meal scanned from a photo stars
  as itself: the photo, on a plate (`src/three/photo-dish.tsx`), drops onto the
  pedestal and is what the "inside" scene burns away into its parts and puts
  back together. A meal added by search shows a 3D model of the dish instead
  (`src/three/dish-models.tsx`), built offline from simple shapes: curries in a
  bowl with their fish, mutton or paneer, biryani on a plate, a dosa with sambar
  and coconut chutney, bhetki paturi in banana leaf, jhalmuri in a paper cone,
  chai in a kulhad. The food type picks the model and the dish's name its
  colours and toppings (`src/lib/dish-look.ts`); Bengali and Indian dishes are
  set one by one in `src/data/dish-looks.ts`. Its "inside" scene takes the dish
  apart (`src/three/deconstruct.tsx`, timing in `src/lib/deconstruct.ts`): the
  parts it is made of come out at micro scale (fibre strands, protein coils,
  starch, oil, sugar, salt, microbes) and each passes under a spotlight, mint
  when it helps and coral when it harms, before the dish comes back together.

## Run it

The food model is native code, so **Expo Go can't run the app**. Use a
development build:

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform android   # or ios
npx expo start
```

Install the build on your phone from the link EAS prints, then open the
project from the dev client. The web version (`npm run web`) runs everything,
photo recognition included. Its first scan downloads the 63 MB SigLIP 2 model
once from Hugging Face; after that it loads from the browser's cache.

```bash
npm test            # engine, recognition, search and translation coverage
npm run typecheck
npm run lint
```

## Website

`website/` is the marketing site (Vite, React Three Fiber, GSAP). It shares the
3D scenes in `src/three`, uses photoscanned food from Poly Haven (CC0) in
`website/public/models`, and links to the web app with its "Try now" button.

```bash
npm run dev --prefix website                 # http://localhost:5173
npm run capture:screens                      # refresh the phone screenshots (needs `npm run web -- --port 8086`)
```

## Publishing

Every push to `main` runs `.github/workflows/pages.yml`, which builds the
website and the web app and publishes both to GitHub Pages: the site at
`/foodhabits.com/` and the app at `/foodhabits.com/app/`.

## Editing the food data

- Fix how a dish is classified: edit `OVERRIDES` in
  `scripts/build-food-labels.mjs`, then run `npm run build:labels`.
- Adjust one dish's nutrition: `src/data/food-tweaks.ts`.
- Add a food, or an alias for one: `src/data/catalog.ts` (or
  `catalog-bengali.ts`). English aliases double as extra descriptions for the
  web recognizer, so a plain description ("fermented rice") helps it.
- After changing the catalog, its aliases or the labels, run
  `npm run build:dishes`. It embeds the new dish sentences (a few minutes on a
  laptop) and looks up Wikipedia readership only for dishes it hasn't seen,
  caching it in `scripts/data/dish-popularity.json`. `npm test` fails until the
  embeddings match the dish list.
- Change how a dish looks in its explainer when there is no photo: its entry in
  `src/data/dish-looks.ts` (model, colours, toppings, side bowls).
- Change advice text: `src/i18n/locales/en.ts`, then the same key in each
  translation. `npm test` fails if any food produces a missing message.
- Regenerate the icon and splash after editing the mark:
  `npm run build:assets`.

## Licences

Both food models are © Google and used under the Apache License 2.0: SigLIP 2
in the web app and the AIY Food Classifier in the phone apps (attribution in
the in-app privacy page and on the website's privacy page). The web app runs
SigLIP 2 with [ONNX Runtime Web](https://github.com/microsoft/onnxruntime)
(MIT) and the AIY fallback with LiteRT.js (Apache 2.0). The website's food
photoscans and studio HDRI are from [Poly Haven](https://polyhaven.com) (CC0).
App code was started from `create-expo-app` (MIT).
