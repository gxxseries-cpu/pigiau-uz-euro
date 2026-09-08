import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { MarketSignalBadge, MarketSignalCard } from "@/components/MarketSignal";
import { PriceTrend } from "@/components/PriceTrend";
import { PushOptIn } from "@/components/PushOptIn";
import { StationCard } from "@/components/StationCard";
import { StationDetail } from "@/components/StationDetail";
import {
  CITY_CENTERS,
  MAIN_CITIES,

  FUEL_LABELS,
  formatPrice,
  haversineKm,
  isMajorBrand,
  nearestCity,
  norm,
  type FuelType,
  type Station,
} from "@/data/stations";
import { getFuelData, getMarketSignal } from "@/lib/fuel.functions";

const TITLE = "Pigiausi Degalai – degalų kainos Lietuvoje";
const DESC =
  "Rask pigiausią kurą arti savęs: degalinių kainos, atstumai, kainų tendencija ir kelionės kuro skaičiuoklė.";

const fuelQuery = queryOptions({
  queryKey: ["fuel-data"],
  queryFn: () => getFuelData(),
});

const signalQuery = queryOptions({
  queryKey: ["market-signal"],
  queryFn: () => getMarketSignal(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(fuelQuery),
      context.queryClient.ensureQueryData(signalQuery),
    ]);
  },
  errorComponent: () => (
    <div className="grid min-h-screen place-items-center bg-frost p-6 text-center text-ice">
      <p className="text-sm text-ice/70">
        Nepavyko įkelti kainų. Pabandyk atnaujinti puslapį po kelių sekundžių.
      </p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-frost text-ice">Nerasta</div>
  ),
  component: Index,
});

const FUELS: FuelType[] = ["diesel", "p95", "p98", "lpg"];
const RADIUSES = [5, 10, 20, 50];
const TABS = [
  { id: "nearby", label: "Artimiausi", icon: "📍" },
  { id: "trend", label: "Tendencija", icon: "📈" },
  { id: "calc", label: "Skaičiuoklė", icon: "🧮" },
  { id: "fav", label: "Mėgstami", icon: "🤍" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Index() {
  const { data } = useSuspenseQuery(fuelQuery);
  const { data: signal } = useSuspenseQuery(signalQuery);
  const cities = data.cities.length > 0 ? data.cities : Object.keys(CITY_CENTERS);

  const [city, setCity] = useState(() => (cities.includes("Vilnius") ? "Vilnius" : cities[0]!));
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationState, setLocationState] = useState<"tikrinama" | "nustatyta" | "rankinė">(
    "tikrinama",
  );
  const [pickingCity, setPickingCity] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const [fuel, setFuel] = useState<FuelType>("diesel");
  const [radius, setRadius] = useState(10);
  const [brand, setBrand] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [tab, setTab] = useState<TabId>("nearby");
  const [openStationId, setOpenStationId] = useState<string | null>(null);
  const [consumption, setConsumption] = useState("6,5");
  const [tripKm, setTripKm] = useState("300");

  const quickCities = MAIN_CITIES.filter((c) => cities.includes(c));

  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of data.stations) counts[s.city] = (counts[s.city] ?? 0) + 1;
    return counts;
  }, [data.stations]);

  const matchingCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return [];
    return cities.filter((c) => c.toLowerCase().includes(q)).slice(0, 30);
  }, [cities, cityQuery]);

  const selectCity = (c: string) => {
    setCity(c);
    setCoords(null);
    setLocationState("rankinė");
    setPickingCity(false);
    setCityQuery("");
  };


  useEffect(() => {
    const stored = localStorage.getItem("degalai-favorites");
    if (stored) setFavorites(JSON.parse(stored) as string[]);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationState("rankinė");
      setPickingCity(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setCity(nearestCity(pos.coords.latitude, pos.coords.longitude));
        setLocationState("nustatyta");
      },
      () => {
        setLocationState("rankinė");
        setPickingCity(true);
      },
      { timeout: 8000 },
    );
  }, []);

  const origin = coords ?? CITY_CENTERS[city] ?? { lat: 54.6872, lon: 25.2797 };

  /** Miestų centrai iš pačių degalinių – kad ir be tikslių koordinačių atstumas būtų apytikris. */
  const cityFallback = useMemo(() => {
    const acc: Record<string, { lat: number; lon: number; n: number }> = {};
    for (const s of data.stations) {
      if (s.lat === null || s.lon === null) continue;
      const c = (acc[s.city] ??= { lat: 0, lon: 0, n: 0 });
      c.lat += s.lat;
      c.lon += s.lon;
      c.n += 1;
    }
    const out: Record<string, { lat: number; lon: number }> = {};
    for (const [cityName, v] of Object.entries(acc)) {
      out[cityName] = { lat: v.lat / v.n, lon: v.lon / v.n };
    }
    return out;
  }, [data.stations]);

  const withDistance = useMemo<Station[]>(
    () =>
      data.stations.map((s) => {
        const point =
          s.lat !== null && s.lon !== null
            ? { lat: s.lat, lon: s.lon }
            : (CITY_CENTERS[s.city] ?? cityFallback[s.city] ?? null);
        return {
          ...s,
          distanceKm: point
            ? haversineKm(origin.lat, origin.lon, point.lat, point.lon)
            : Infinity,
        };
      }),
    [data.stations, origin.lat, origin.lon, cityFallback],
  );

  const cityStations = useMemo(
    () => withDistance.filter((s) => norm(s.city) === norm(city)),
    [withDistance, city],
  );

  /** Kai vietovė pasirinkta rankiniu būdu, spindulys netaikomas – rodoma visa vietovė. */
  const manualCity = coords === null;

  /** Tinklo atitikimas – be didžiųjų raidžių ir tarpų skirtumų; „Kiti“ = visi maži tinklai. */
  const brandMatch = (s: Station) => {
    if (!brand) return true;
    if (brand === OTHER_BRANDS) return !isMajorBrand(s.brand);
    return norm(s.brand) === norm(brand);
  };

  const list = useMemo(() => {
    const pool = manualCity ? cityStations : withDistance;
    const afterBrand = pool.filter(brandMatch);
    const base = afterBrand.filter((s) => s.prices[fuel] !== undefined);

    if (import.meta.env.DEV) {
      console.debug(
        `[filtrai] iš viso ${withDistance.length} → vietovė „${city}“ ${cityStations.length} → tinklas „${brand ?? "visi"}“ ${afterBrand.length} → su ${fuel} kaina ${base.length}`,
      );
    }

    if (manualCity) {
      return base.sort((a, b) => (a.prices[fuel] ?? 0) - (b.prices[fuel] ?? 0)).slice(0, 20);
    }

    const nearby = base.filter((s) => s.distanceKm <= radius);
    /** Jei spindulyje nieko nėra – rodomos artimiausios degalinės, kad sąrašas nebūtų tuščias. */
    const source =
      nearby.length >= 3
        ? nearby
        : [...base].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 5);
    return source.sort((a, b) => (a.prices[fuel] ?? 0) - (b.prices[fuel] ?? 0)).slice(0, 5);
  }, [cityStations, withDistance, radius, brand, fuel, manualCity, city]);




  const favoriteStations = withDistance.filter((s) => favorites.includes(s.id));
  const openStation = withDistance.find((s) => s.id === openStationId) ?? null;
  const cheapest = list[0];
  const priciest = list[list.length - 1];
  const monthlySaving =
    cheapest && priciest ? ((priciest.prices[fuel] ?? 0) - (cheapest.prices[fuel] ?? 0)) * 45 * 4 : 0;

  const toggleFavorite = (id: string) =>
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("degalai-favorites", JSON.stringify(next));
      return next;
    });

  const litersPer100 = Number(consumption.replace(",", ".")) || 0;
  const km = Number(tripKm.replace(",", ".")) || 0;
  const tripCost = cheapest
    ? ((km / 100) * litersPer100 * (cheapest.prices[fuel] ?? 0)).toFixed(2).replace(".", ",")
    : "0,00";
  const tripCostWorst = priciest
    ? ((km / 100) * litersPer100 * (priciest.prices[fuel] ?? 0)).toFixed(2).replace(".", ",")
    : "0,00";

  const trendPoints = data.history[city]?.[fuel] ?? [];
  const dateLabel = data.latestDate
    ? new Date(data.latestDate).toLocaleDateString("lt-LT", {
        day: "numeric",
        month: "long",
      })
    : "—";

  return (
    <div className="relative min-h-screen overflow-hidden bg-frost font-sans text-ice antialiased">
      <div className="pointer-events-none absolute -left-24 top-[-8%] h-[440px] w-[440px] rounded-full bg-mint/30 blur-[120px]" />
      <div className="pointer-events-none absolute -right-20 top-1/3 h-[420px] w-[420px] rounded-full bg-sky-400/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] left-1/3 h-[360px] w-[360px] rounded-full bg-indigo-400/20 blur-[120px]" />

      <div className="relative mx-auto max-w-md px-4 pb-28 pt-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-mint/15 text-mint ring-1 ring-mint/30">
              <span className="text-lg font-bold">⛽</span>
            </div>
            <div>
              <h1 className="text-[15px] font-semibold leading-tight tracking-tight">
                Pigiausi Degalai
              </h1>
              <p className="text-[11px] text-ice/50">Kainos {dateLabel}</p>
            </div>
          </div>
          <button
            onClick={() => setPickingCity((v) => !v)}
            aria-label="Pasirinkti miestą"
            className="grid h-9 w-9 place-items-center rounded-xl bg-ice/5 text-sm ring-1 ring-ice/10"
          >
            🔎
          </button>
        </header>

        <section className="relative mt-4 rounded-2xl bg-ice/5 p-4 ring-1 ring-ice/15">
          <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-mint/60 to-transparent" />
          <div className="flex items-center gap-2">
            <span className="text-mint">📍</span>
            <div className="flex-1">
              <p className="text-sm font-semibold">{city}</p>
              <p className="text-[11px] text-ice/50">
                {locationState === "tikrinama"
                  ? "Nustatoma lokacija…"
                  : locationState === "nustatyta"
                    ? "Lokacija nustatyta"
                    : "Miestas pasirinktas rankiniu būdu"}{" "}
                · {cityStations.length} degalinių
              </p>
            </div>
            <button
              onClick={() => setPickingCity((v) => !v)}
              className="rounded-lg bg-ice/5 px-2.5 py-1.5 text-[11px] text-ice/70 ring-1 ring-ice/10"
            >
              Keisti
            </button>
          </div>

          {pickingCity && (
            <div className="mt-3">
              <input
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                placeholder="Ieškok miesto, miestelio ar rajono…"
                className="w-full rounded-xl bg-ice/5 px-3 py-2 text-sm text-ice ring-1 ring-ice/10 outline-none placeholder:text-ice/40 focus:ring-mint/50"
              />
              {cityQuery.trim().length > 0 ? (
                <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                  {matchingCities.length === 0 && (
                    <p className="px-1 py-2 text-[11px] text-ice/50">
                      Tokios vietovės kainų nerasta. Pabandyk kitą pavadinimą.
                    </p>
                  )}
                  {matchingCities.map((c) => (
                    <button
                      key={c}
                      onClick={() => selectCity(c)}
                      className="flex w-full items-center justify-between rounded-lg bg-ice/5 px-3 py-2 text-left text-xs text-ice/80 ring-1 ring-ice/10"
                    >
                      <span>{c}</span>
                      <span className="text-[10px] text-ice/40">
                        {cityCounts[c] ?? 0} degalinių
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {quickCities.map((c) => (
                    <button
                      key={c}
                      onClick={() => selectCity(c)}
                      className={
                        c === city
                          ? "rounded-full bg-mint px-3 py-1.5 text-xs font-semibold text-frost"
                          : "rounded-full bg-ice/5 px-3 py-1.5 text-xs text-ice/70 ring-1 ring-ice/10"
                      }
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}


          <div className="mt-3 flex flex-wrap gap-2">
            {FUELS.map((f) => (
              <button
                key={f}
                onClick={() => setFuel(f)}
                className={
                  f === fuel
                    ? "rounded-full bg-mint px-3 py-1.5 text-xs font-semibold text-frost"
                    : "rounded-full bg-ice/5 px-3 py-1.5 text-xs text-ice/70 ring-1 ring-ice/10"
                }
              >
                {FUEL_LABELS[f]}
              </button>
            ))}
          </div>

          {!manualCity && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-ice/50">Spindulys</span>
              <div className="flex gap-1">
                {RADIUSES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRadius(r)}
                    className={
                      r === radius
                        ? "rounded-md bg-mint/15 px-2 py-1 text-[11px] font-medium text-mint ring-1 ring-mint/30"
                        : "rounded-md bg-ice/5 px-2 py-1 text-[11px] text-ice/60 ring-1 ring-ice/10"
                    }
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>
          )}


          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-ice/50">Tinklas</span>
            <div className="flex flex-wrap justify-end gap-1">
              <button
                onClick={() => setBrand(null)}
                className={
                  brand === null
                    ? "rounded-md bg-mint/15 px-2 py-1 text-[11px] font-medium text-mint ring-1 ring-mint/30"
                    : "rounded-md bg-ice/5 px-2 py-1 text-[11px] text-ice/60 ring-1 ring-ice/10"
                }
              >
                Visi
              </button>
              {data.brands.map((b) => (
                <button
                  key={b}
                  onClick={() => setBrand(b)}
                  className={
                    brand === b
                      ? "rounded-md bg-mint/15 px-2 py-1 text-[11px] font-medium text-mint ring-1 ring-mint/30"
                      : "rounded-md bg-ice/5 px-2 py-1 text-[11px] text-ice/60 ring-1 ring-ice/10"
                  }
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </section>

        <PushOptIn city={city} fuel={fuel} />


        {tab === "nearby" && (
          <>
            <div className="mt-5 flex items-end justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {manualCity ? `Degalinės – ${city}` : "Artimiausios degalinės"}
                </p>
                <p className="text-[11px] text-ice/50">
                  Rikiuota pagal {FUEL_LABELS[fuel].toLowerCase()} kainą
                </p>
              </div>

              <p className="text-[11px] text-mint">
                {cheapest ? `Atnaujinta ${cheapest.updatedAt}` : ""}
              </p>
            </div>

            <div className="mt-3 space-y-3">
              {list.length === 0 && (
                <p className="rounded-2xl bg-ice/5 p-4 text-sm text-ice/60 ring-1 ring-ice/15">
                  Pagal pasirinktus filtrus degalinių nerasta. Pabandyk didesnį spindulį arba kitą
                  tinklą.
                </p>
              )}
              {list.map((s, i) => (
                <StationCard
                  key={s.id}
                  station={s}
                  fuel={fuel}
                  cheapest={i === 0}
                  favorite={favorites.includes(s.id)}
                  onToggleFavorite={() => toggleFavorite(s.id)}
                  onOpen={() => setOpenStationId(s.id)}
                  signal={signal}
                />
              ))}
            </div>

            {list.length > 1 && (
              <section className="mt-5 rounded-2xl bg-ice/5 p-4 ring-1 ring-ice/15">
                <p className="text-sm font-semibold">Sutaupymas per mėnesį</p>
                <p className="mt-1 text-2xl font-bold tracking-tight">
                  {monthlySaving.toFixed(2).replace(".", ",")} €
                </p>
                <p className="mt-2 text-[11px] text-ice/50">
                  Pildant 45 l kartą per savaitę pigiausioje ({cheapest?.brand}) vietoj
                  brangiausios ({priciest?.brand}) arti esančios degalinės.
                </p>
              </section>
            )}
          </>
        )}

        {tab === "trend" && (
          <>
            <MarketSignalCard signal={signal} />
            <PriceTrend fuel={fuel} title={city} points={trendPoints} />
          </>
        )}

        {tab === "calc" && (
          <section className="mt-5 rounded-2xl bg-ice/5 p-4 ring-1 ring-ice/15">
            <p className="text-sm font-semibold">Kelionės kuro skaičiuoklė</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-[11px] text-ice/60">
                Sąnaudos (l/100 km)
                <input
                  value={consumption}
                  onChange={(e) => setConsumption(e.target.value)}
                  inputMode="decimal"
                  className="mt-1 w-full rounded-xl bg-ice/5 px-3 py-2 text-sm text-ice ring-1 ring-ice/10 outline-none focus:ring-mint/50"
                />
              </label>
              <label className="text-[11px] text-ice/60">
                Atstumas (km)
                <input
                  value={tripKm}
                  onChange={(e) => setTripKm(e.target.value)}
                  inputMode="decimal"
                  className="mt-1 w-full rounded-xl bg-ice/5 px-3 py-2 text-sm text-ice ring-1 ring-ice/10 outline-none focus:ring-mint/50"
                />
              </label>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-[11px] text-ice/60">Pigiausioje ({cheapest?.brand ?? "—"})</p>
                <p className="text-2xl font-bold tracking-tight text-mint">{tripCost} €</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-ice/60">Brangiausioje ({priciest?.brand ?? "—"})</p>
                <p className="text-lg font-semibold">{tripCostWorst} €</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-ice/50">
              Skaičiuojama pagal {FUEL_LABELS[fuel].toLowerCase()} kainą{" "}
              {formatPrice(cheapest?.prices[fuel])}/l.
            </p>
          </section>
        )}

        {tab === "fav" && (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-semibold">Mėgstamos degalinės</p>
            {favoriteStations.length === 0 ? (
              <p className="rounded-2xl bg-ice/5 p-4 text-sm text-ice/60 ring-1 ring-ice/15">
                Kol kas nieko nepažymėjai. Degalinės kortelėje paspausk širdelę.
              </p>
            ) : (
              favoriteStations.map((s) => (
                <StationCard
                  key={s.id}
                  station={s}
                  fuel={fuel}
                  favorite
                  onToggleFavorite={() => toggleFavorite(s.id)}
                  onOpen={() => setOpenStationId(s.id)}
                  signal={signal}
                />
              ))
            )}
          </div>
        )}

        <p className="mt-6 text-center text-[11px] text-ice/40">
          Kainų šaltinis – Lietuvos energetikos agentūra.{" "}
          <Link to="/admin" className="text-ice/60 underline">
            Kainų pildymas
          </Link>
        </p>
      </div>

      {openStation && (
        <StationDetail
          station={openStation}
          fuel={fuel}
          favorite={favorites.includes(openStation.id)}
          onToggleFavorite={() => toggleFavorite(openStation.id)}
          onClose={() => setOpenStationId(null)}
        />
      )}


      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-ice/10 bg-frost/70 px-6 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-around">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-1 ${
                tab === t.id ? "text-mint" : "text-ice/50"
              }`}
            >
              <span className="text-lg">{t.icon}</span>
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
