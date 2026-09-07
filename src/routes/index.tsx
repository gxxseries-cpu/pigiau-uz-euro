import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { PriceTrend } from "@/components/PriceTrend";
import { StationCard } from "@/components/StationCard";
import {
  BRANDS,
  CITIES,
  FUEL_LABELS,
  STATIONS,
  formatPrice,
  type FuelType,
} from "@/data/stations";

const TITLE = "Pigiausi Degalai – degalų kainos Lietuvoje";
const DESC =
  "Rask pigiausią kurą arti savęs: degalinių kainos, atstumai, kainų tendencija ir kelionės kuro skaičiuoklė.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: Index,
});

const FUELS: FuelType[] = ["diesel", "p95", "p98", "lpg"];
const RADIUSES = [5, 10, 20];
const TABS = [
  { id: "nearby", label: "Artimiausi", icon: "📍" },
  { id: "trend", label: "Tendencija", icon: "📈" },
  { id: "calc", label: "Skaičiuoklė", icon: "🧮" },
  { id: "fav", label: "Mėgstami", icon: "🤍" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Index() {
  const [city, setCity] = useState("Vilnius");
  const [locationState, setLocationState] = useState<"tikrinama" | "nustatyta" | "rankinė">(
    "tikrinama",
  );
  const [pickingCity, setPickingCity] = useState(false);
  const [fuel, setFuel] = useState<FuelType>("diesel");
  const [radius, setRadius] = useState(10);
  const [brand, setBrand] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [tab, setTab] = useState<TabId>("nearby");
  const [consumption, setConsumption] = useState("6,5");
  const [tripKm, setTripKm] = useState("300");

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationState("rankinė");
      setPickingCity(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setCity("Vilnius");
        setLocationState("nustatyta");
      },
      () => {
        setLocationState("rankinė");
        setPickingCity(true);
      },
      { timeout: 8000 },
    );
  }, []);

  const cityStations = useMemo(() => STATIONS.filter((s) => s.city === city), [city]);

  const list = useMemo(() => {
    return cityStations
      .filter((s) => s.distanceKm <= radius)
      .filter((s) => (brand ? s.brand === brand : true))
      .filter((s) => s.prices[fuel] !== undefined)
      .sort((a, b) => (a.prices[fuel] ?? 0) - (b.prices[fuel] ?? 0))
      .slice(0, 5);
  }, [cityStations, radius, brand, fuel]);

  const favoriteStations = STATIONS.filter((s) => favorites.includes(s.id));
  const cheapest = list[0];
  const priciest = list[list.length - 1];
  const monthlySaving =
    cheapest && priciest
      ? ((priciest.prices[fuel] ?? 0) - (cheapest.prices[fuel] ?? 0)) * 45 * 4
      : 0;

  const toggleFavorite = (id: string) =>
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const litersPer100 = Number(consumption.replace(",", ".")) || 0;
  const km = Number(tripKm.replace(",", ".")) || 0;
  const tripCost = cheapest
    ? ((km / 100) * litersPer100 * (cheapest.prices[fuel] ?? 0)).toFixed(2).replace(".", ",")
    : "0,00";
  const tripCostWorst = priciest
    ? ((km / 100) * litersPer100 * (priciest.prices[fuel] ?? 0)).toFixed(2).replace(".", ",")
    : "0,00";

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
              <p className="text-[11px] text-ice/50">Degalų kainų radaras</p>
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
            <div className="mt-3 flex flex-wrap gap-1.5">
              {CITIES.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCity(c);
                    setLocationState("rankinė");
                    setPickingCity(false);
                  }}
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
              {BRANDS.map((b) => (
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

        {tab === "nearby" && (
          <>
            <div className="mt-5 flex items-end justify-between">
              <div>
                <p className="text-sm font-semibold">Artimiausios degalinės</p>
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

        {tab === "trend" && <PriceTrend fuel={fuel} city={city} />}

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
                <p className="text-[11px] text-ice/60">
                  Pigiausioje ({cheapest?.brand ?? "—"})
                </p>
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
                />
              ))
            )}
          </div>
        )}

        <p className="mt-6 text-center text-[11px] text-ice/40">
          Testiniai duomenys. Realios kainos – Lietuvos energetikos agentūra.
        </p>
      </div>

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
