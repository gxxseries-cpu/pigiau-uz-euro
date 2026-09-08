export type FuelType = "diesel" | "p95" | "p98" | "lpg";

export const FUEL_LABELS: Record<FuelType, string> = {
  diesel: "Dyzelinas",
  p95: "Benzinas 95",
  p98: "Benzinas 98",
  lpg: "Dujos",
};

export const FUEL_SHORT: Record<FuelType, string> = {
  diesel: "Dyz",
  p95: "B95",
  p98: "B98",
  lpg: "Dujos",
};

/** Greitam pasirinkimui rodomi didieji miestai. */
export const MAIN_CITIES = ["Vilnius", "Kaunas", "Klaipėda", "Šiauliai", "Panevėžys"];

/** Dideli, visoje Lietuvoje paplitę tinklai – jiems rodomi atskiri filtro mygtukai. */
const BRAND_RULES: { match: string; label: string }[] = [
  { match: "viada", label: "Viada" },
  { match: "circle k", label: "Circle K" },
  { match: "neste", label: "Neste" },
  { match: "baltic petroleum", label: "Baltic Petroleum" },
  { match: "orlen", label: "Orlen" },
];

export const MAJOR_BRANDS = BRAND_RULES.map((r) => r.label);

/** Bendras palyginimui skirtas teksto normalizavimas (be didžiųjų raidžių ir tarpų skirtumų). */
export function norm(value: string) {
  return value
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Rodomas tinklo pavadinimas. Dideli tinklai gauna trumpą pavadinimą,
 * o visos kitos degalinės lieka su savo pavadinimu – nė viena neišmetama.
 */
export function brandLabel(raw: string): string {
  const lower = norm(raw);
  for (const rule of BRAND_RULES) {
    if (lower.includes(rule.match)) return rule.label;
  }
  return raw
    .replace(/^(uab|ab|mb|iį|ii|vši|ka|kb|ūkis)\s+/i, "")
    .replace(/["„“]/g, "")
    .trim();
}

export function isMajorBrand(label: string) {
  return MAJOR_BRANDS.includes(label);
}



export type Station = {
  id: string;
  brand: string;
  area: string;
  address: string;
  city: string;
  lat: number | null;
  lon: number | null;
  distanceKm: number;
  updatedAt: string;
  prices: Partial<Record<FuelType, number>> & { markedDiesel?: number };
};

/** Miestų centrai – naudojami atstumui, kai miestas pasirenkamas rankiniu būdu. */
export const CITY_CENTERS: Record<string, { lat: number; lon: number }> = {
  Vilnius: { lat: 54.6872, lon: 25.2797 },
  Kaunas: { lat: 54.8985, lon: 23.9036 },
  Klaipėda: { lat: 55.7033, lon: 21.1443 },
  Šiauliai: { lat: 55.9333, lon: 23.3167 },
  Panevėžys: { lat: 55.7333, lon: 24.35 },
  Alytus: { lat: 54.3963, lon: 24.0458 },
  Marijampolė: { lat: 54.5591, lon: 23.3543 },
  Mažeikiai: { lat: 56.3097, lon: 22.335 },
  Utena: { lat: 55.4981, lon: 25.5997 },
  Tauragė: { lat: 55.2522, lon: 22.29 },
};

export const CITIES = Object.keys(CITY_CENTERS);

/** Atstumas kilometrais tarp dviejų koordinačių (Haversine). */
export function haversineKm(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Artimiausias žinomas miestas pagal koordinates. */
export function nearestCity(lat: number, lon: number) {
  let best = CITIES[0]!;
  let bestKm = Infinity;
  for (const [city, c] of Object.entries(CITY_CENTERS)) {
    const km = haversineKm(lat, lon, c.lat, c.lon);
    if (km < bestKm) {
      bestKm = km;
      best = city;
    }
  }
  return best;
}

export function formatPrice(value?: number) {
  if (value === undefined || value === null) return "nėra";
  return `${value.toFixed(3).replace(".", ",")} €`;
}

export function formatKm(value: number) {
  if (!Number.isFinite(value)) return "";
  return `${value.toFixed(1).replace(".", ",")} km`;
}

