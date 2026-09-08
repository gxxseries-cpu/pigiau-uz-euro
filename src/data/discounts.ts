/**
 * Viešai skelbiama nuolaidų informacija pagal degalinių tinklą.
 * ČIA RAŠOMA TIK tai, kas paskelbta oficialiuose tinklų puslapiuose.
 * Nerašome konkrečių centų dydžių, nes jie dažnai kinta.
 */
export type BrandDiscount = {
  title: string;
  text: string;
  sourceLabel: string;
  sourceUrl: string;
};

export const BRAND_DISCOUNTS: Record<string, BrandDiscount[]> = {
  Viada: [
    {
      title: "„ViadaPLUS“ lojalumas",
      text: "Lojalumo programa VIADA degalinių klientams: tiesioginės nuolaidos degalams ir kaupiamos naudos. Nuolaidų sąlygos ir taisyklės atnaujintos nuo 2026-01-01.",
      sourceLabel: "viada.lt",
      sourceUrl: "https://www.viada.lt/korteles-ir-lojalumas/viadaplus-lojalumas/",
    },
  ],
  "Baltic Petroleum": [
    {
      title: "Penktadienis – „Bakadienis“",
      text: "Penktadieniais su Baltic Petroleum programėle degalai pilami už geresnę kainą nei rodoma degalinės kainų stulpe. Pasiūlymas taikomas ne visose degalinėse.",
      sourceLabel: "bakadienis.lt",
      sourceUrl: "https://bakadienis.lt/",
    },
  ],
  "Circle K": [
    {
      title: "„EXTRA klubas“",
      text: "Circle K lojalumo programa su nuolaidomis degalams ir prekėms; nuolaida taikoma pateikus EXTRA klubo kortelę arba programėlę.",
      sourceLabel: "circlek.lt",
      sourceUrl: "https://www.circlek.lt/",
    },
  ],
};

export const DISCOUNT_DISCLAIMER =
  "Sąlygos gali keistis – patikrinkite oficialiame degalinės puslapyje arba programėlėje. Tai informacinė pastaba, ne oficiali kaina.";

export function discountsForBrand(brand: string): BrandDiscount[] {
  return BRAND_DISCOUNTS[brand] ?? [];
}
