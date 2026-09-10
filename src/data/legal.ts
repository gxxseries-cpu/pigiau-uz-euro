/**
 * Teisinis ir informacinis turinys vienoje vietoje, kad jį būtų lengva atnaujinti.
 *
 * Norint pakeisti privatumo politiką, naudojimosi sąlygas, kontaktinį el. paštą
 * ar versijos numerį – redaguok TIK šį failą. Puslapiai (/privatumo-politika,
 * /naudojimosi-salygos, /apie) turinį atvaizduoja automatiškai.
 */

export const APP_NAME = "Pigiausi Degalai";
export const APP_VERSION = "1.0.0";

/** Kontaktinis el. paštas privatumo klausimams ir atsiliepimams. */
export const CONTACT_EMAIL = "[ĮRAŠYTI EL. PAŠTĄ]";

/** Turinio atnaujinimo data (YYYY-MM-DD) – rodoma puslapių apačioje ir viršuje. */
export const LEGAL_UPDATED = "2026-09-10";

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDoc = {
  title: string;
  intro: string;
  sections: LegalSection[];
};

export const PRIVACY_POLICY: LegalDoc = {
  title: "Privatumo politika",
  intro:
    "Ši privatumo politika paaiškina, kokius duomenis programėlė „Pigiausi Degalai“ naudoja, kam jie reikalingi ir kaip gali juos kontroliuoti.",
  sections: [
    {
      title: "1. Registracija nereikalinga",
      paragraphs: [
        "Programėle galima naudotis be paskyros. Nerenkame tavo vardo, el. pašto, telefono numerio ar kitų tave identifikuojančių asmens duomenų.",
        "Paskyra reikalinga tik programėlės administratoriams, kurie pildo ir tikrina kainų duomenis. Tokiu atveju saugomas tik el. pašto adresas ir prisijungimo duomenys, būtini paskyros veikimui.",
      ],
    },
    {
      title: "2. Lokacija",
      paragraphs: [
        "Jei suteiki lokacijos leidimą, tavo koordinatės naudojamos tik tam, kad programėlė nustatytų artimiausią miestą ir surikiuotų netoliese esančias degalines pagal atstumą.",
        "Koordinatės apdorojamos tik tavo įrenginyje. Jos nėra siunčiamos į mūsų serverį ir nėra saugomos jokioje duomenų bazėje ar istorijoje.",
        "Leidimo gali nesuteikti – tada tiesiog pasirenki miestą ar vietovę rankiniu būdu ir programėlė veikia visiškai taip pat.",
      ],
    },
    {
      title: "3. Pranešimai (device token)",
      paragraphs: [
        "Jei sutinki gauti pranešimus, išsaugomas įrenginio pranešimų raktas (device token) su pasirinktu miestu ir kuro tipu. Tai reikalinga tik tam, kad galėtume atsiųsti pranešimą, kai atsinaujina kuro kainos.",
        "Šis raktas nesusietas su tavo vardu ar el. paštu ir nenaudojamas jokiam kitam tikslui – nei profiliavimui, nei reklamai.",
      ],
    },
    {
      title: "4. Techniniai duomenys",
      paragraphs: [
        "Programėlė gali įrašyti anoniminę klaidų informaciją (pvz. klaidos tekstą), kad galėtume ištaisyti sutrikimus. Tokiuose įrašuose nėra tavo lokacijos ar asmens duomenų.",
        "Pasirinktas miestas, kuro tipas ir mėgstamos degalinės saugomos tik tavo įrenginio naršyklės atmintyje.",
      ],
    },
    {
      title: "5. Duomenų perdavimas",
      paragraphs: [
        "Duomenų neparduodame ir neperduodame trečiosioms šalims reklamos ar rinkodaros tikslais.",
        "Naudojame tik technines paslaugas, būtinas programėlės veikimui: duomenų bazę ir serverio talpinimą bei pranešimų siuntimo paslaugą. Šie paslaugų teikėjai duomenis apdoroja tik mūsų nurodymu.",
      ],
    },
    {
      title: "6. Saugojimo laikas",
      bullets: [
        "Lokacija – nesaugoma (naudojama tik tuo momentu, kai naudojiesi programėle).",
        "Pranešimų raktas – saugomas tol, kol naudojiesi pranešimais; išjungus pranešimus arba pašalinus programėlę raktas nustoja veikti ir yra ištrinamas.",
        "Kainų duomenys – vieši duomenys, saugomi kainų istorijai (iki 6 mėnesių rodoma grafike).",
      ],
    },
    {
      title: "7. Kaip atsisakyti",
      paragraphs: [
        "Lokacijos ir pranešimų leidimus bet kada gali atšaukti savo telefono ar naršyklės nustatymuose (programėlės nustatymai → leidimai). Programėlė ir toliau veiks – tik reikės pasirinkti miestą rankiniu būdu.",
        "Programėlės skiltyje „Apie“ rasi savo leidimų būseną ir nuorodą, kur juos pakeisti.",
      ],
    },
    {
      title: "8. Kontaktai",
      paragraphs: [
        `Dėl privatumo klausimų ar duomenų ištrynimo rašyk: ${CONTACT_EMAIL}.`,
      ],
    },
  ],
};

export const TERMS_OF_USE: LegalDoc = {
  title: "Naudojimosi sąlygos",
  intro:
    "Naudodamasis programėle „Pigiausi Degalai“ sutinki su žemiau išdėstytomis sąlygomis. Jos parašytos paprastai ir be teisinių vingrybių.",
  sections: [
    {
      title: "1. Kainos yra orientacinės",
      paragraphs: [
        "Kainos imamos iš viešo šaltinio – Lietuvos energetikos agentūros degalų kainų įrankio (ena.lt). Duomenys atnaujinami kartą per dieną, todėl konkrečiu momentu degalinėje kaina gali skirtis.",
        "Programėlės kūrėjas neatsako už netikslumus, pasenusius duomenis ar šaltinio klaidas. Galutinė kaina visada yra ta, kurią matai pačioje degalinėje.",
      ],
    },
    {
      title: "2. Kainų pokyčio indikatorius",
      paragraphs: [
        "Indikatorius „greičiausiai pigs“ / „greičiausiai brangs“ yra tik orientacinė prielaida, sudaryta pagal viešus Brent naftos ir EUR/USD kurso duomenis.",
        "Tai nėra prognozė, garantija ar finansinė rekomendacija. Sprendimų dėl pirkimo priimti tik pagal šį indikatorių nerekomenduojame.",
      ],
    },
    {
      title: "3. Nuolaidų informacija",
      paragraphs: [
        "Rodomos tik viešai skelbiamos degalinių tinklų nuolaidos. Tinklai sąlygas gali pakeisti bet kada be išankstinio įspėjimo.",
        "Tikslias, galiojančias sąlygas visada tikrink degalinėje arba to tinklo oficialioje svetainėje bei programėlėje.",
      ],
    },
    {
      title: "4. Naudojimasis programėle",
      paragraphs: [
        "Programėle naudojiesi savo atsakomybe ir tik teisėtais tikslais. Nevairuok naudodamasis telefonu – maršrutą ir degalinę pasirink prieš pradėdamas kelionę.",
        "Programėlė teikiama „kaip yra“, be garantijų dėl nepertraukiamo veikimo.",
      ],
    },
    {
      title: "5. Sąlygų pakeitimai",
      paragraphs: [
        `Sąlygos gali būti atnaujintos – naujausią versiją visada rasi šiame puslapyje. Klausimus siųsk: ${CONTACT_EMAIL}.`,
      ],
    },
  ],
};
