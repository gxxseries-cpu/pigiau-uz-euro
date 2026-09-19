# „Pigiausi Degalai" įkėlimas į Google Play (TWA būdas)

Programėlė į Google Play keliauja kaip **TWA** (Trusted Web Activity) – oficialus Google būdas
publikuoti programėles, kurių turinys gyvena internete (kainos vis tiek atnaujinamos serveryje).
Telefone ji atrodys ir veiks kaip tikra programa: be naršyklės juostos, su ikona, pranešimais.

Programėlės paketo vardas: **lt.pigiausidegalai.app**
Pagrindinis adresas: **https://pigiausiadegalai.app**

---

## Ko reikia prieš pradedant

1. **Google Play Console paskyra** – https://play.google.com/console (vienkartinis 25 USD mokestis, mokama Google).
2. Tavo kompiuteryje jau yra: Node.js, Android Studio su SDK, JDK 21 (visa tai įdiegta kuriant APK).
3. Tavo pasirašymo raktas (`.jks` failas), kurį sukūrei kurdamas APK – žinai jo vietą ir slaptažodžius.

---

## 1 žingsnis – įdiek Bubblewrap (vieną kartą)

Atidaryk komandų langą (Windows + R → `cmd`) ir įvykdyk:

```
npm install -g @bubblewrap/cli
```

Tai oficialus Google įrankis, kuris iš svetainės sugeneruoja Google Play paketą (.aab).

## 2 žingsnis – sugeneruok programėlės projektą

```
cd C:\Users\modis\Desktop
bubblewrap init --manifest https://pigiausiadegalai.app/manifest.webmanifest
```

Įrankis užduos klausimus – atsakyk taip:

- **Package name**: `lt.pigiausidegalai.app`
- **Application name**: `Pigiausi Degalai`
- Pasirink **naudoti esamą raktą** (use existing keystore) ir nurodyk savo `.jks` failą, alias ir slaptažodžius – tuos pačius, kuriuos naudojai APK.
- Kitus klausimus gali palikti numatytuosius (Enter).

Bus sukurtas aplankas (pvz. `pigiausiadegalai`) su visu Android projektu.

## 3 žingsnis – sukurk Google Play paketą (.aab)

```
cd pigiausiadegalai
bubblewrap build
```

Gausi failą **`app-release-bundle-signed.aab`** – tai ir yra paketas, kurį kelsi į Google Play.

## 4 žingsnis – Play Console

1. https://play.google.com/console → **Create app**.
2. Įkelk `app-release-bundle-signed.aab` į naują **release**.
3. Užpildyk parduotuvės kortelę (aprašymas, ekrano nuotraukos, ikona 512×512 – yra projekte `public/icon-512.png`).
4. Privatumo politikos nuoroda: **https://pigiausiadegalai.app/privatumo-politika**
5. Išsiųsk peržiūrai (review). Google patikrina 1–7 dienas.

## 5 žingsnis – susiek programą su svetaine (BŪTINA)

Be šio žingsnio programa telefone rodys naršyklės juostą viršuje.

1. Kai Play Console priims pirmą paketą, eik į
   **Play Console → (tavo programa) → Setup → App integrity → App signing**.
2. Nukopijuok **SHA-256 certificate fingerprint** (skaičių-raidžių eilutę su dvitaškiais).
3. Atsiųsk ją man (arba pats įrašyk į `public/.well-known/assetlinks.json`
   vietoje `PAKEISTI_PIRMO_PAKETO_PIRKSTU_ATSPAUDU_IS_PLAY_CONSOLE_APP_INTEGRITY`).
4. Tada aš atnaujinsiu svetainę – ir programa veiks be jokios naršyklės juostos.

> Pastaba: naudojamas būtent Play Console raktas (App signing), o ne tavo `.jks` –
> Google Play pats persirašo paketą savo raktu.

---

## Ekrano nuotraukos ir aprašymas Play parduotuvei

- Ikona: `public/icon-512.png` (512×512).
- Ekrano nuotraukas daryk telefone iš įdiegtos programėlės (2–8 vnt., pvz. pagrindinis sąrašas, filtrai, tendencijų grafikas).
- Trumpas aprašymas (iki 80 simb.): `Pigiausios degalinės netoliese – 95, 98, dyzelinas ir dujos visoje Lietuvoje.`

---

## Senas Capacitor APK

Ankstesnis Capacitor APK (`android/` aplankas) nebereikalingas – jo nebekurk ir nenaudok.
Vartotojams, kurie neturi Play parduotuvės, visada veikia ir „Įdiegti programą" iš svetainės
(PWA) – tas pats turinys, tie patys pranešimai.
