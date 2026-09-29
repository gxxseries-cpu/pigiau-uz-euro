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
- Privatumo politika: `https://pigusdegalai.lt/privatumo-politika`
- Naudojimosi sąlygos: `https://pigusdegalai.lt/naudojimosi-salygos`
- Kategorija: Žemėlapiai ir navigacija / Kelionės
- Reikia 4–8 ekrano nuotraukų (telefono formatu) ir 1024×500 grafinio banerio (Google Play).
- Duomenų saugumo anketoje nurodyk: lokacija (naudojama funkcijai, nesaugoma),
  pranešimų identifikatorius (naudojamas pranešimams). Taip pat nurodyk reklamos ID (AdMob, žr. 8 skyrių).

## 5. GitHub

Projektą galima susieti su GitHub per Lovable: mygtukas **GitHub → Connect project**.
Po to kodas automatiškai sinchronizuojamas abiem kryptimis, ir šias komandas gali
paleisti savo kompiuteryje.

## 6. Tikri pranešimai (Firebase Cloud Messaging)

Serverio pusė jau sukonfigūruota (Firebase jungtis projekte). Kad Android
programėlė gautų tikrus pranešimus su garsu (ne „silent“), reikia vieno failo iš
Firebase konsolės:

1. https://console.firebase.google.com → projektas `kuraspigiau`.
2. Project settings → Your apps → Add app → Android.
3. „Android package name“ įrašyk **lt.pigiausidegalai.app**, sukurk programą.
4. Parsisiųsk `google-services.json` ir įkelk į `android/app/google-services.json`.
5. Terminale projekto šaknyje:

```sh
npx cap sync
npx cap open android
```

6. Android Studio: Build → Generate Signed App Bundle / APK → APK → `release`.
   Įdiek naują APK į telefoną (senąjį galima tiesiog užrašyti ant viršaus).

Programėlėje pirmą kartą paspaudus pranešimų įjungimą, telefonas paprašys
leidimo, o įrenginio raktas įrašomas į `push_subscribers` lentelę. Kasdienis
kainų atnaujinimas išsiunčia pranešimą tik tada, kai atsiranda naujos dienos
kainos.

## 7. iOS pranešimai

Reikia Mac + Xcode ir Apple Developer paskyros: Firebase konsolėje pridėk iOS
programą, parsisiųsk `GoogleService-Info.plist` į `ios/App/App/`, Xcode
įjunk „Push Notifications“ ir „Background Modes → Remote notifications“.

## 8. Reklamos (Google AdMob)

1. https://admob.google.com → pridėk programą (Android, `lt.pigiausidegalai.app`) ir sukurk
   du reklamos blokus: **Banner** ir **Interstitial**.
2. Įrašyk App ID į `android/app/src/main/AndroidManifest.xml`, `<application>` viduje:

```xml
<meta-data
  android:name="com.google.android.gms.ads.APPLICATION_ID"
  android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
```

   Kol testuoji, galima naudoti Google testinį App ID: `ca-app-pub-3940256099942544~3347511713`.
   iOS: `Info.plist` → `GADApplicationIdentifier` su iOS App ID.
3. Prieš publikavimą `.env` faile nustatyk realius blokų ID:

```
VITE_ADMOB_BANNER_ID=ca-app-pub-XXXX/BANNER
VITE_ADMOB_INTERSTITIAL_ID=ca-app-pub-XXXX/INTERSTITIAL
VITE_ADMOB_TESTING=false
```

   Be jų naudojami Google testiniai ID (saugu kūrimui).
4. AdMob → Privacy & messaging → sukurk **GDPR** pranešimą (UMP). Programėlė jį parodo
   ES vartotojams prieš pirmą reklamą.
5. `npx cap sync` → naujas APK/AAB.
6. Google Play Console → **App content → Data safety**: atnaujink anketą – pažymėk, kad
   renkami **Device or other IDs (reklamos ID)** reklamos tikslais, ir **Ads → Yes, contains ads**.

Taisyklės kode (`src/lib/ads.ts`): banner tik artimiausių degalinių ekrane; pilno ekrano
reklama – kas 4 miesto keitimus / „Tendencijos" atidarymus, ne dažniau nei kas 3 min. ir
ne pirmą minutę po paleidimo. `isPremiumUser()` paruoštas būsimai „be reklamų" prenumeratai.
