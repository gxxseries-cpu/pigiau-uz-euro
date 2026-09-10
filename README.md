# Pigiausi Degalai (86)

Lovable promptas: „Pigiausi Degalai" – degalų kainų programėlė

Sukurk mobiliajai naršyklei pritaikytą (mobile-first) web programėlę „Pigiausi Degalai", kuri padeda Lietuvos vairuotojams greitai rasti pigiausią kurą arti jų. Visa programėlės kalba – tik lietuvių.

Konteksto pagrindas

Degalų kainos Lietuvoje pastaruoju metu smarkiai augo, todėl žmonės aktyviai ieško būdų sutaupyti kurą perkant. Programėlė turi būti orientuota į praktinę naudą kasdieniam vairuotojui – greitai parodyti, kur šiandien pigiausia, ir padėti realiai sutaupyti pinigų.

1. Pagrindinis vartotojo srautas

Atidarius programėlę, paprašoma leidimo naudoti lokaciją (Geolocation API).

Jei vartotojas leidžia – automatiškai nustatomas artimiausias miestas/savivaldybė pagal koordinates.

Jei vartotojas atsisako arba lokacija nepasiekiama – parodomas miesto pasirinkimo sąrašas (dropdown arba paieška), kad vartotojas pats pasirinktų savo miestą/savivaldybę.

Pagrindiniame ekrane iš karto rodoma 3-5 artimiausios degalinės, surikiuotos pagal pasirinkto kuro tipo kainą (pigiausia viršuje).

2. Degalinės kortelė (kiekvienai iš 3-5 degalinių rodyti)

Degalinės tinklo pavadinimas (pvz. Circle K, Neste, Viada, Emsi ir t.t.)

Pilnas adresas

Atstumas nuo vartotojo (km)

Visos turimos kainos:

Benzinas 95

Benzinas 98 (jei yra)

Dyzelinas

Dujos / SND (jei degalinė turi)

Dažytas (žymėtas) dyzelinas – tik jei ta konkreti degalinė jį parduoda; jei ne, laukelio nerodyti arba rodyti „nėra"

Kainų atnaujinimo data/laikas (kad vartotojas matytų, ar informacija šviežia)

Mygtukas „Vesti navigaciją" (nuoroda į Google Maps/Waze su tos degalinės adresu)

3. Filtrai ir nustatymai

Galimybė pasirinkti, pagal kurį kuro tipą rikiuoti sąrašą (benzinas/dyzelinas/dujos)

Galimybė filtruoti pagal degalinių tinklą (jei vartotojas turi lojalumo kortelę tik tam tikram tinklui)

Paieškos spindulio nustatymas (pvz. 5 km / 10 km / 20 km)

4. Duomenų šaltinis ir atnaujinimas — SVARBU

Duomenų šaltinis: Lietuvos energetikos agentūra (LEA), skelbianti degalų kainas darbo dienomis iki 10 val.:

https://www.ena.lt/dk-irankis/ (interaktyvus įrankis, PowerBI)

https://www.ena.lt/dk-pr-pr-duomenys/ (kasdien atsirandanti nuoroda į Excel failą su tos dienos kainomis)

https://degalukainos.ena.lt/ (naujesnis „gyvo" žemėlapio įrankis – patikrink, ar jis turi patogesnį duomenų API naršyklės Network skiltyje)

Šie šaltiniai NĖRA paruoštas viešas API – kasdienio Excel failo nuoroda kinta kiekvieną dieną, todėl reikalingas automatinis backend procesas (Supabase Edge Function + suplanuota užduotis / cron), kuris:

kasdien apie 10:30-11:00 val. patikrina ENA puslapį ir suranda tos dienos duomenų nuorodą,

atsisiunčia ir išparsina duomenis (Excel arba, jei pavyks rasti, degalukainos.ena.lt API),

atnaujina degalinių ir kainų lenteles duomenų bazėje.

Prašau pasiūlyti realistišką įgyvendinimo planą dviem etapais:

1 etapas (MVP): duomenų bazės struktūra su galimybe importuoti kainas rankiniu būdu (pvz. CSV/Excel įkėlimu per admin panelę), kad programėlę būtų galima pradėti naudoti iš karto, kol automatika dar netobula.

2 etapas: automatinis kasdienis duomenų atnaujinimas per suplanuotą backend užduotį.

Kadangi LEA duomenyse veikiausiai bus tik adresai, o ne GPS koordinatės, reikės geokodavimo žingsnio (adresą paverčiant koordinatėmis) – naudok nemokamą OpenStreetMap Nominatim API arba Google Geocoding API, koordinates išsaugant duomenų bazėje, kad „artimiausių degalinių" paieška veiktų greitai (be pakartotinio geokodavimo kas kartą).

5. Papildomos funkcijos (rekomenduojamos dėl dabartinės situacijos su kuro kainomis)

Atsižvelgiant į tai, kad kuro kainos Lietuvoje smarkiai kilo ir žmonės aktyviai ieško būdų sutaupyti, pridėk šias funkcijas:

Kainų istorijos grafikas – paprastas linijinis grafikas, rodantis pasirinkto kuro tipo vidutinės kainos pokytį per paskutines 7/30 dienų pasirinktame mieste, kad vartotojas matytų tendenciją (kainos kyla ar krenta).

Kelionės kuro skaičiuoklė – vartotojas įveda automobilio kuro sąnaudas (l/100km) ir atstumą, programėlė paskaičiuoja, kiek kainuos kelionė pasirinktoje degalinėje, ir palygina su kitomis.

Sutaupymo skaičiuoklė – parodo, kiek per mėnesį sutaupytų, jei visada pildytųsi pigiausioje vs. brangiausioje arti esančioje degalinėje (pvz. pildant baką kartą per savaitę).

Mėgstamos degalinės (favorites) – galimybė pasižymėti dažniausiai lankomas degalines greitam patikrinimui.

Pranešimai apie kainų kritimą (jei naudosite push notifications) – vartotojas gali užsisakyti pranešimą, kai pasirinktame mieste kaina nukrenta žemiau tam tikros ribos.

„Pakeliui" režimas – vartotojas įveda kelionės tarp dviejų miestų maršrutą, programėlė parodo pigiausias degalines palei kelią, ne tik arti dabartinės vietos.

Tamsi tema (dark mode) – patogu naudoti vairuojant vakare.

Dalinimasis – galimybė pasidalinti konkrečios degalinės kaina (pvz. per WhatsApp/Messenger) su draugais/šeima.

6. Dizaino gairės

Švarus, minimalistinis dizainas, didelis kontrastas (patogu skaityti saulėje/vairuojant)

Didelės, lengvai paspaudžiamos kortelės mobiliajame ekrane

Pigiausia degalinė visada išryškinta (pvz. žalia spalva/ženkleliu „Pigiausia")

Kuro kainos rodomos dideliu, aiškiai matomu šriftu (€/l su 3 skaičiais po kablelio, kaip įprasta Lietuvoje, pvz. 1,479 €)

Viskas – meniu, mygtukai, pranešimai, klaidos – tik lietuvių kalba

7. Techninė architektūra (pasiūlymas)

Frontend: React + Tailwind (Lovable standartas)

Backend/DB: Supabase (PostgreSQL), lentelės: stotys (degalinės su adresu, koordinatėmis, tinklu), kainos (degalinės ID, kuro tipas, kaina, data)

Geolokacija: naršyklės Geolocation API + atsarginis miesto pasirinkimas

Atstumo skaičiavimas: Haversine formulė arba PostGIS, jei duomenų kiekis išaugs

Prašau pradėti nuo pagrindinio ekrano (lokacija/miesto pasirinkimas + 3-5 artimiausių degalinių sąrašas su testiniais/pavyzdiniais duomenimis), kad galėčiau pamatyti UI/UX prieš jungiant realų duomenų šaltinį.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pigiau-uz-euro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6c2452af-e16c-4667-b8c6-119d6a3bca0f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
