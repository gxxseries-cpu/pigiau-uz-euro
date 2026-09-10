# „Pigiausi Degalai“ – kaip išleisti į Google Play ir App Store

Programėlė jau paruošta dviem būdais: (1) ją galima įdiegti į telefoną tiesiai iš
naršyklės (PWA), (2) ją galima suvynioti į native paketą su Capacitor ir įkelti į
prekybos aikšteles.

## 1. Ką reikia paruošti pačiam (negalime padaryti už tave)

- Google Play Console paskyra – vienkartinis 25 USD mokestis.
- Apple Developer paskyra – 99 USD per metus.
- Kontaktinis el. paštas privatumo politikoje (`src/data/legal.ts` → `CONTACT_EMAIL`).
- iOS paketui reikia Mac su Xcode. Android paketui – Android Studio.

## 2. Native paketo paruošimas (viena karta)

```sh
git clone <tavo-github-repo>
cd <repo>
npm i
npx cap add android      # Android projektas
npx cap add ios          # tik su Mac
npx cap sync
npx cap open android     # atsidaro Android Studio
npx cap open ios         # atsidaro Xcode
```

Konfigūracija yra `capacitor.config.ts`:
- `appId`: `lt.pigiausidegalai.app` (turi būti unikalus, jei nori – pakeisk)
- `server.url`: publikuotos svetainės adresas. Native apvalkalas krauna šį adresą,
  todėl atnaujinus svetainę programėlė atsinaujina be naujo paketo įkėlimo.

Ikonos ir paleidimo ekranai generuojami iš `public/icon-512.png`:

```sh
npx @capacitor/assets generate --iconBackgroundColor "#0b1120" --splashBackgroundColor "#0b1120"
```

## 3. Leidimai

- Android: `android/app/src/main/AndroidManifest.xml` – `ACCESS_COARSE_LOCATION`,
  `ACCESS_FINE_LOCATION`, `POST_NOTIFICATIONS`, `INTERNET`.
- iOS: `ios/App/App/Info.plist` – `NSLocationWhenInUseUsageDescription`
  („Norime nustatyti tavo miestą, kad parodytume artimiausias degalines.“).

## 4. Prekybos aikštelių informacija

- Pavadinimas: Pigiausi Degalai
- Trumpas aprašymas: Degalų kainos Lietuvoje – rask pigiausią degalinę netoliese.
- Privatumo politika: `https://<svetainė>/privatumo-politika`
- Naudojimosi sąlygos: `https://<svetainė>/naudojimosi-salygos`
- Kategorija: Žemėlapiai ir navigacija / Kelionės
- Reikia 4–8 ekrano nuotraukų (telefono formatu) ir 1024×500 grafinio banerio (Google Play).
- Duomenų saugumo anketoje nurodyk: lokacija (naudojama funkcijai, nesaugoma),
  pranešimų identifikatorius (naudojamas pranešimams). Reklamai duomenys nenaudojami.

## 5. GitHub

Projektą galima susieti su GitHub per Lovable: mygtukas **GitHub → Connect project**.
Po to kodas automatiškai sinchronizuojamas abiem kryptimis, ir šias komandas gali
paleisti savo kompiuteryje.
