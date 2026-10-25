# Launching foodhabits.com on Google Play and the App Store

Builds and submissions run in the cloud with EAS, so you don't need Xcode or
Android Studio. Steps marked **(you)** need your accounts or decisions.

## 1. Accounts (you)

| Account | Cost | Needed for |
|---|---|---|
| [Expo](https://expo.dev/signup) | Free | Cloud builds (EAS Build) and submissions |
| [Apple Developer Program](https://developer.apple.com/programs/) | $99 / year | App Store and TestFlight |
| [Google Play Console](https://play.google.com/console/signup) | $25 once | Google Play |

## 2. Before the first build (you)

1. **Contact email.** Replace `hello@example.com` in `src/constants/app.ts`
   with an inbox you read. It appears on the privacy page and in "Report a
   problem".
2. **Domain and store name.** The app is named after the domain
   `foodhabits.com`. Register it if you haven't (the stores and the reversed
   app ID assume you control it), and search both stores to confirm the name
   is free. A longer listing name such as "foodhabits.com: Gut Health" is a
   fallback; change `expo.name` in `app.json` if needed.
3. **App IDs.** `com.foodhabits.app` is set for both platforms in `app.json`.
   It must be unique on each store and can't change after the first release.
4. **Privacy policy URL.** Both stores need one. The app already contains the
   policy at `/privacy`. Publish the web build free on EAS Hosting:

   ```bash
   npx expo export --platform web
   npx eas-cli@latest deploy --prod
   ```

   Your policy is then at `https://<your-subdomain>.expo.app/privacy`. It is
   also already live on GitHub Pages, at
   https://debnathsd.github.io/foodhabits.com/privacy.html (website) and
   https://debnathsd.github.io/foodhabits.com/app/privacy (web app).

## 3. Try it on your phone

```bash
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform android
```

Install the APK from the link EAS prints. For iPhone, use `--platform ios`.
EAS registers your device the first time, which needs the Apple account.
Then run `npx expo start` and open the project in the installed app.

Check on a real phone before submitting:

- [ ] Camera opens, the photo is recognised, and the "Which one is it?"
      picker appears for unclear photos.
- [ ] A photo from the library works.
- [ ] The explainer speaks in English and in Hindi. Hindi needs a Hindi voice
      on the phone: Android has one in Google TTS; on iPhone add it in
      Settings → Accessibility → Spoken Content → Voices.
- [ ] Airplane mode: scanning and results still work.

This is the first time the native food model (`react-native-fast-tflite`)
runs. `expo-doctor` flags it as untested on the New Architecture in React
Native Directory. It is built on Nitro modules, so it should work, but this
first build is where that gets confirmed.

**Recognition differs between the web and the phones.** The phone apps still
run the AIY model: 2,023 dishes, and none of the Bengali home dishes from the
catalog such as shorshe ilish or aloo posto. The website's "2,250+ dishes,
Bengali home cooking included" describes the web app, which uses SigLIP 2.
Before submitting, either bring SigLIP 2 to the phone apps or keep the store
text and screenshots to what AIY does. The listing below ("2,000+ dishes") is
true for both.

## 4. Production builds and submission

```bash
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --platform ios
npx eas-cli@latest submit --platform android
```

- **Android:** create the app in Play Console first and upload the first
  `.aab` by hand. Google requires one manual upload. After that,
  `eas submit` works with a Play service-account key (EAS walks you through
  it). The submit profile targets the **internal** testing track, so promote
  to production in Play Console when ready.
- **iOS:** `eas submit` uploads to App Store Connect. Test in TestFlight, then
  submit for review.

## 5. Store listing

**Category:** Health & Fitness (Apple) / Health & Fitness (Google Play)

**Short description (80 characters, Google Play):**
Snap your meal. See how it affects your gut, and what to eat next. Free.

**Subtitle (30 characters, App Store):** Gut-friendly food choices

**Full description:**

> foodhabits.com shows you, in seconds, what your food does inside your body.
>
> Snap a photo of your meal, or search for it, and foodhabits.com tells you:
>
> • How it affects your gut: fibre, fermented foods, sugar, frying, processed
>   meat and more, explained simply
> • What it does to the rest of your body: blood sugar, salt, cholesterol, energy
> • The health problems linked to eating it often, such as type 2 diabetes,
>   high blood pressure and bowel cancer
> • Which foods to avoid at your next meal, and what to eat instead
> • Better versions of the same dish
>
> Watch an animated explainer with voice-over for every meal.
>
> Personal: set your diet (vegetarian, eggetarian, vegan, Jain, pescatarian)
> and sensitivities (lactose, gluten, IBS, acid reflux, nut allergy, blood
> sugar, blood pressure) and the advice adapts.
>
> Private and free: recognition runs on your phone. No account, no ads, no
> subscription, and your photos never leave your device. Works offline.
>
> Recognises 2,000+ dishes from around the world, including biryani, idli,
> chole bhature, khichdi, paneer dishes, pizza, sushi and ramen. Search covers
> everyday foods like dosa, roti, chai and fruit.
>
> foodhabits.com offers general nutrition information and is not medical advice.

**Keywords (App Store, 100 characters):**
gut health,food scanner,nutrition,diet,healthy eating,calorie,digestion,indian food,meal

**Screenshots:** Apple needs 6.9" iPhone shots (1320×2868), and Google needs
at least 2 phone shots. Good ones to take: the camera, a "Which one is it?"
pick, a result card with its score, the disease-risk section, the explainer,
and Home with "Up next".

## 6. Privacy and policy questionnaires

The app sends nothing off the phone, so the answers are short:

- **App Store, App Privacy:** "Data Not Collected".
- **Google Play, Data safety:** no data collected and no data shared. Data is
  encrypted in transit: not applicable. Users can request deletion: yes, by
  clearing history in the app or uninstalling.
- **Camera permission:** used only to recognise food. The usage text is
  already set in `app.json`.
- **Health apps (Google Play Console → App content → Health apps):** choose
  nutrition and weight management. The app is not a medical device and does
  not diagnose or treat.
- **Content rating:** no objectionable content. The questionnaire usually
  gives Everyone / 4+.
- **Apple guideline 1.4.1 (health):** the app shows general guidance with
  disclaimers on the result screen, in onboarding and on the privacy page.
  The disease risks cite their basis (WHO, frequency) and avoid diagnosis.

## 7. Before you call it 1.0

- [ ] Translations: English and Hindi are complete. The other 20 languages in
      the picker show English until their file exists in
      `src/i18n/locales/`. Have native speakers review the health wording.
- [ ] Urdu and Arabic: text is right-to-left, but the layout doesn't mirror yet.
- [ ] Dish names stay in their original language (e.g. "Pepperoni pizza" in
      Hindi). Translate the most common ones.
- [ ] Have a dietitian review `src/data/categories.ts`, `src/data/food-tweaks.ts`
      and the advice text in `src/i18n/locales/en.ts`.
