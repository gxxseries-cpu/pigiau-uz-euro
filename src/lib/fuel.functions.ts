import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import type { FuelType, Station } from "@/data/stations";

export type TrendPoint = { date: string; avg: number };
export type FuelData = {
  stations: Station[];
  brands: string[];
  cities: string[];
  latestDate: string | null;
  /** miestas -> kuro tipas -> paskutinių 30 d. vidutinės kainos */
  history: Record<string, Partial<Record<FuelType, TrendPoint[]>>>;
};

const FUEL_KEY: Record<string, FuelType | "markedDiesel"> = {
  diesel: "diesel",
  p95: "p95",
  p98: "p98",
  lpg: "lpg",
  marked_diesel: "markedDiesel",
};

function timeLabel(iso: string) {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export const getFuelData = createServerFn({ method: "GET" }).handler(
  async (): Promise<FuelData> => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
    const supabase = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
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


    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().slice(0, 10);

    const [{ data: stationRows, error: sErr }, { data: priceRows, error: pErr }] =
      await Promise.all([
        supabase.from("stations").select("id, brand, area, address, city, lat, lon"),
        supabase
          .from("station_prices")
          .select("station_id, fuel_type, price, price_date, updated_at")
          .gte("price_date", sinceStr)
          .order("price_date", { ascending: true }),
      ]);

    if (sErr || pErr) {
      console.error("Nepavyko gauti duomenų:", sErr ?? pErr);
      return { stations: [], brands: [], cities: [], latestDate: null, history: {} };
    }

    const stationsById = new Map((stationRows ?? []).map((s) => [s.id, s]));
    const latestDate =
      (priceRows ?? []).reduce<string | null>(
        (acc, r) => (acc === null || r.price_date > acc ? r.price_date : acc),
        null,
      ) ?? null;

    const prices = new Map<string, Station["prices"]>();
    const updated = new Map<string, string>();
    const sums: Record<string, Record<string, Record<string, { sum: number; n: number }>>> = {};

    for (const row of priceRows ?? []) {
      const station = stationsById.get(row.station_id);
      if (!station) continue;
      const key = FUEL_KEY[row.fuel_type];
      if (!key) continue;
      const value = Number(row.price);

      if (row.price_date === latestDate) {
        const bucket = prices.get(row.station_id) ?? {};
        bucket[key] = value;
        prices.set(row.station_id, bucket);
        updated.set(row.station_id, timeLabel(row.updated_at));
      }

      if (key !== "markedDiesel") {
        sums[station.city] ??= {};
        sums[station.city]![key] ??= {};
        const day = (sums[station.city]![key]![row.price_date] ??= { sum: 0, n: 0 });
        day.sum += value;
        day.n += 1;
      }
    }

    const history: FuelData["history"] = {};
    for (const [city, byFuel] of Object.entries(sums)) {
      history[city] = {};
      for (const [fuel, byDay] of Object.entries(byFuel)) {
        history[city]![fuel as FuelType] = Object.entries(byDay)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, v]) => ({ date, avg: Math.round((v.sum / v.n) * 1000) / 1000 }));
      }
    }

    const stations: Station[] = (stationRows ?? [])
      .map((s) => ({ s, label: brandLabel(s.brand) }))
      .filter((x): x is { s: (typeof stationRows)[number]; label: string } => x.label !== null)
      .map(({ s, label }) => ({
        id: s.id,
        brand: label,
        area: s.area ?? "",
        address: s.address,
        city: s.city,
        lat: s.lat,
        lon: s.lon,
        distanceKm: 0,
        updatedAt: updated.get(s.id) ?? "—",
        prices: prices.get(s.id) ?? {},
      }));

    return {
      stations,
      brands: [...new Set(stations.map((s) => s.brand))].sort(),
      cities: [...new Set(stations.map((s) => s.city))].sort((a, b) => a.localeCompare(b, "lt")),
      latestDate,
      history,
    };

  },
);
