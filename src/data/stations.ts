export type FuelType = "diesel" | "p95" | "p98" | "lpg";

export const FUEL_LABELS: Record<FuelType, string> = {
  diesel: "Dyzelinas",
  p95: "Benzinas 95",
  p98: "Benzinas 98",
  lpg: "SND",
};

export const FUEL_SHORT: Record<FuelType, string> = {
  diesel: "Dyz",
  p95: "B95",
  p98: "B98",
  lpg: "SND",
};

export type Station = {
  id: string;
  brand: string;
  area: string;
  address: string;
  city: string;
  lat: number;
  lon: number;
  distanceKm: number;
  updatedAt: string;
  prices: Partial<Record<FuelType, number>> & { markedDiesel?: number };
};

export const CITIES = [
  "Vilnius",
  "Kaunas",
  "Klaipėda",
  "Šiauliai",
  "Panevėžys",
  "Alytus",
  "Marijampolė",
  "Mažeikiai",
  "Utena",
  "Tauragė",
];

export const STATIONS: Station[] = [
  {
    id: "1",
    brand: "Circle K",
    area: "Pilaitė",
    address: "Naujamiesčio g. 42, Vilnius",
    city: "Vilnius",
    lat: 54.7,
    lon: 25.2,
    distanceKm: 1.2,
    updatedAt: "09:42",
    prices: { diesel: 1.429, p95: 1.469, p98: 1.589 },
  },
  {
    id: "2",
    brand: "Viada",
    area: "Žirmūnai",
    address: "Liepkalnio g. 18, Vilnius",
    city: "Vilnius",
    lat: 54.71,
    lon: 25.29,
    distanceKm: 2.8,
    updatedAt: "09:31",
    prices: { diesel: 1.455, p95: 1.495, p98: 1.615, lpg: 0.512, markedDiesel: 1.288 },
  },
  {
    id: "3",
    brand: "Neste",
    area: "Senamiestis",
    address: "Didžioji g. 7, Vilnius",
    city: "Vilnius",
    lat: 54.68,
    lon: 25.28,
    distanceKm: 3.5,
    updatedAt: "09:10",
    prices: { diesel: 1.472, p95: 1.512, p98: 1.632 },
  },
  {
    id: "4",
    brand: "Emsi",
    area: "Naujoji Vilnia",
    address: "Stoties g. 5, Vilnius",
    city: "Vilnius",
    lat: 54.69,
    lon: 25.42,
    distanceKm: 6.4,
    updatedAt: "08:55",
    prices: { diesel: 1.481, p95: 1.532, lpg: 0.529 },
  },
  {
    id: "5",
    brand: "Orlen",
    area: "Lazdynai",
    address: "Laisvės pr. 121, Vilnius",
    city: "Vilnius",
    lat: 54.68,
    lon: 25.19,
    distanceKm: 8.9,
    updatedAt: "09:05",
    prices: { diesel: 1.499, p95: 1.545, p98: 1.671, lpg: 0.534, markedDiesel: 1.301 },
  },
  {
    id: "6",
    brand: "Circle K",
    area: "Centras",
    address: "K. Donelaičio g. 62, Kaunas",
    city: "Kaunas",
    lat: 54.9,
    lon: 23.91,
    distanceKm: 1.6,
    updatedAt: "09:38",
    prices: { diesel: 1.419, p95: 1.459, p98: 1.579 },
  },
  {
    id: "7",
    brand: "Viada",
    area: "Šilainiai",
    address: "Baltų pr. 89, Kaunas",
    city: "Kaunas",
    lat: 54.94,
    lon: 23.88,
    distanceKm: 4.2,
    updatedAt: "09:22",
    prices: { diesel: 1.441, p95: 1.478, lpg: 0.505 },
  },
  {
    id: "8",
    brand: "Neste",
    area: "Petrašiūnai",
    address: "R. Kalantos g. 12, Kaunas",
    city: "Kaunas",
    lat: 54.87,
    lon: 24.0,
    distanceKm: 7.1,
    updatedAt: "08:47",
    prices: { diesel: 1.466, p95: 1.501, p98: 1.622, markedDiesel: 1.279 },
  },
  {
    id: "9",
    brand: "Emsi",
    area: "Debrecenas",
    address: "Taikos pr. 88, Klaipėda",
    city: "Klaipėda",
    lat: 55.68,
    lon: 21.16,
    distanceKm: 2.1,
    updatedAt: "09:19",
    prices: { diesel: 1.435, p95: 1.472, lpg: 0.498 },
  },
  {
    id: "10",
    brand: "Circle K",
    area: "Smeltė",
    address: "Šilutės pl. 24, Klaipėda",
    city: "Klaipėda",
    lat: 55.66,
    lon: 21.17,
    distanceKm: 5.3,
    updatedAt: "09:41",
    prices: { diesel: 1.452, p95: 1.489, p98: 1.601 },
  },
];

export const BRANDS = ["Circle K", "Neste", "Viada", "Emsi", "Orlen"];

/** 7 dienų vidutinė kaina pasirinktam kuro tipui (testiniai duomenys). */
export const PRICE_HISTORY: Record<FuelType, number[]> = {
  diesel: [1.412, 1.418, 1.424, 1.419, 1.431, 1.44, 1.447],
  p95: [1.452, 1.459, 1.463, 1.471, 1.468, 1.481, 1.492],
  p98: [1.579, 1.584, 1.591, 1.598, 1.602, 1.611, 1.619],
  lpg: [0.489, 0.492, 0.495, 0.498, 0.502, 0.508, 0.512],
};

export function formatPrice(value?: number) {
  if (value === undefined) return "nėra";
  return `${value.toFixed(3).replace(".", ",")} €`;
}

export function formatKm(value: number) {
  return `${value.toFixed(1).replace(".", ",")} km`;
}
