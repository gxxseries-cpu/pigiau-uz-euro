import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { brandLabel, isMajorBrand, MAJOR_BRANDS } from "@/data/stations";
import type { FuelType, Station } from "@/data/stations";


export type TrendPoint = { date: string; avg: number };
export type MarketSignal = {
  date: string;
  direction: "up" | "down" | "flat";
  brentChangePct: number;
  fxChangePct: number;
  brentUsd: number;
  brentEur: number;
  eurUsd: number;
};
export type FuelData = {
  stations: Station[];
  brands: string[];
  /** Dideli tinklai, kuriems rodomi atskiri filtro mygtukai. */
  majorBrands: string[];
  cities: string[];
  latestDate: string | null;
};


const FUEL_KEY: Record<string, FuelType | "markedDiesel"> = {
  diesel: "diesel",
  p95: "p95",
  p98: "p98",
  lpg: "lpg",
  marked_diesel: "markedDiesel",
};

/** Istorijos gylis grafikui – iki 6 mėnesių. */
const HISTORY_DAYS = 180;

function timeLabel(iso: string) {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Viešas (publishable) klientas serverio pusėje – kainos skaitomos be prisijungimo. */
function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

function sinceDate(days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return since.toISOString().slice(0, 10);
}

type PriceRow = {
  station_id: string;
  fuel_type: string;
  price: number;
  price_date: string;
  updated_at: string;
};

/** Kainų nuskaitymas puslapiais lygiagrečiai – vienoje užklausoje grąžinama ne daugiau kaip 1000 eilučių. */
async function fetchAllPrices(
  supabase: ReturnType<typeof publicClient>,
  filter: { since?: string; date?: string },
): Promise<PriceRow[]> {
  const PAGE = 1000;
  const BATCH = 12;
  const apply = <Q extends { gte: any; eq: any }>(q: Q): Q =>
    filter.date ? q.eq("price_date", filter.date) : q.gte("price_date", filter.since!);
  const { count, error: countErr } = await apply(
    supabase.from("station_prices").select("id", { count: "exact", head: true }),
  );
  if (countErr) throw countErr;
  const pages = Math.ceil((count ?? 0) / PAGE);
  const fetchPage = async (i: number) => {
    const { data, error } = await apply(
      supabase.from("station_prices").select("station_id, fuel_type, price, price_date, updated_at"),
    )
      .order("price_date", { ascending: true })
      .order("id", { ascending: true })
      .range(i * PAGE, i * PAGE + PAGE - 1);
    if (error) throw error;
    return (data ?? []) as PriceRow[];
  };
  const all: PriceRow[] = [];
  for (let start = 0; start < pages; start += BATCH) {
    const idx = Array.from({ length: Math.min(BATCH, pages - start) }, (_, k) => start + k);
    const results = await Promise.all(idx.map(fetchPage));
    for (const r of results) all.push(...r);
  }
  return all;
}

/** Trumpalaikis serverio podėlis. */
const CACHE_MS = 3 * 60 * 1000;
let fuelCache: { at: number; data: FuelData } | null = null;
let historyCache: { at: number; data: FuelHistory } | null = null;

export type FuelHistory = Record<string, Partial<Record<FuelType, TrendPoint[]>>>;

/** Pradiniam ekranui – tik degalinės ir paskutinės dienos kainos (greita). */
export const getFuelData = createServerFn({ method: "GET" }).handler(
  async (): Promise<FuelData> => {
    if (fuelCache && Date.now() - fuelCache.at < CACHE_MS) return fuelCache.data;
    const data = await loadFuelData();
    if (data.stations.length > 0) fuelCache = { at: Date.now(), data };
    return data;
  },
);

/** 6 mėn. miestų vidurkių istorija – kraunama atskirai, fone. */
export const getFuelHistory = createServerFn({ method: "GET" }).handler(
  async (): Promise<FuelHistory> => {
    if (historyCache && Date.now() - historyCache.at < CACHE_MS) return historyCache.data;
    const data = await loadHistory();
    if (Object.keys(data).length > 0) historyCache = { at: Date.now(), data };
    return data;
  },
);

async function loadHistory(): Promise<FuelHistory> {
  const supabase = publicClient();
  try {
    const [stations, rows] = await Promise.all([
      supabase.from("stations").select("id, city"),
      fetchAllPrices(supabase, { since: sinceDate(HISTORY_DAYS) }),
    ]);
    if (stations.error) throw stations.error;
    const cityById = new Map((stations.data ?? []).map((s) => [s.id, s.city]));
    const sums: Record<string, Record<string, Record<string, { sum: number; n: number }>>> = {};
    for (const row of rows) {
      const city = cityById.get(row.station_id);
      const key = FUEL_KEY[row.fuel_type];
      if (!city || !key || key === "markedDiesel") continue;
      sums[city] ??= {};
      sums[city]![key] ??= {};
      const day = (sums[city]![key]![row.price_date] ??= { sum: 0, n: 0 });
      day.sum += Number(row.price);
      day.n += 1;
    }
    const history: FuelHistory = {};
    for (const [city, byFuel] of Object.entries(sums)) {
      history[city] = {};
      for (const [fuel, byDay] of Object.entries(byFuel)) {
        history[city]![fuel as FuelType] = Object.entries(byDay)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, v]) => ({ date, avg: Math.round((v.sum / v.n) * 1000) / 1000 }));
      }
    }
    return history;
  } catch (err) {
    console.error("Nepavyko gauti istorijos:", err);
    return {};
  }
}

async function loadFuelData(): Promise<FuelData> {
  const supabase = publicClient();
  type StationRow = {
    id: string;
    brand: string;
    area: string | null;
    address: string;
    city: string;
    lat: number | null;
    lon: number | null;
  };
  let stationRows: StationRow[] = [];
  let priceRows: PriceRow[] = [];
  let latestDate: string | null = null;
  try {
    const [stations, latest] = await Promise.all([
      supabase.from("stations").select("id, brand, area, address, city, lat, lon"),
      supabase
        .from("station_prices")
        .select("price_date")
        .order("price_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (stations.error) throw stations.error;
    if (latest.error) throw latest.error;
    stationRows = stations.data ?? [];
    latestDate = latest.data?.price_date ?? null;
    if (latestDate) priceRows = await fetchAllPrices(supabase, { date: latestDate });
  } catch (err) {
    console.error("Nepavyko gauti duomenų:", err);
    return { stations: [], brands: [], majorBrands: [], cities: [], latestDate: null };
  }

  const prices = new Map<string, Station["prices"]>();
  const updated = new Map<string, string>();
  for (const row of priceRows) {
    const key = FUEL_KEY[row.fuel_type];
    if (!key) continue;
    const bucket = prices.get(row.station_id) ?? {};
    bucket[key] = Number(row.price);
    prices.set(row.station_id, bucket);
    updated.set(row.station_id, timeLabel(row.updated_at));
  }

  const stations: Station[] = stationRows.map((s) => ({
    id: s.id,
    brand: brandLabel(s.brand),
    area: s.area ?? "",
    address: s.address,
    city: s.city,
    lat: s.lat,
    lon: s.lon,
    distanceKm: 0,
    updatedAt: updated.get(s.id) ?? "—",
    prices: prices.get(s.id) ?? {},
  }));

  const brandSet = new Set(stations.map((s) => s.brand));
  const majors = MAJOR_BRANDS.filter((b) => brandSet.has(b));
  const others = [...brandSet]
    .filter((b) => !isMajorBrand(b))
    .sort((a, b) => a.localeCompare(b, "lt"));

  return {
    stations,
    brands: [...majors, ...others],
    majorBrands: majors,
    cities: [...new Set(stations.map((s) => s.city))].sort((a, b) => a.localeCompare(b, "lt")),
    latestDate,
  };
}

/** Vienos degalinės kainų istorija (iki 6 mėn.) grafikui detalioje kortelėje. */
export const getStationTrend = createServerFn({ method: "GET" })
  .inputValidator((input: { stationId: string; fuel: string }) => ({
    stationId: String(input.stationId),
    fuel: String(input.fuel),
  }))
  .handler(async ({ data }): Promise<TrendPoint[]> => {
    const dbFuel =
      Object.entries(FUEL_KEY).find(([, v]) => v === data.fuel)?.[0] ?? data.fuel;
    const supabase = publicClient();
    const { data: rows, error } = await supabase
      .from("station_prices")
      .select("price, price_date")
      .eq("station_id", data.stationId)
      .eq("fuel_type", dbFuel)
      .gte("price_date", sinceDate(HISTORY_DAYS))
      .order("price_date", { ascending: true });

    if (error) {
      console.error("Nepavyko gauti degalinės istorijos:", error);
      return [];
    }
    return (rows ?? []).map((r) => ({ date: r.price_date, avg: Number(r.price) }));
  });

/**
 * Dienos naftos rinkos indikatorius. Jei duomenų nėra arba jie pasenę
 * (senesni nei vakar), grąžinama null – geriau nerodyti, nei rodyti klaidingai.
 */
export const getMarketSignal = createServerFn({ method: "GET" }).handler(
  async (): Promise<MarketSignal | null> => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("market_signal")
      .select(
        "signal_date, direction, brent_change_pct, fx_change_pct, brent_usd, brent_eur, eur_usd",
      )
      .order("signal_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    if (data.signal_date < sinceDate(1)) return null;

    return {
      date: data.signal_date,
      direction: (data.direction === "up" || data.direction === "down"
        ? data.direction
        : "flat") as MarketSignal["direction"],
      brentChangePct: Number(data.brent_change_pct),
      fxChangePct: Number(data.fx_change_pct),
      brentUsd: Number(data.brent_usd),
      brentEur: Number(data.brent_eur),
      eurUsd: Number(data.eur_usd),
    };
  },
);
