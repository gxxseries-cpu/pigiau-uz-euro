import { BrandLogo } from "@/components/BrandLogo";
import { MarketSignalBadge } from "@/components/MarketSignal";
import type { MarketSignal } from "@/lib/fuel.functions";
import {
  FUEL_LABELS,
  FUEL_SHORT,
  formatKm,
  formatPrice,
  type FuelType,
  type Station,
} from "@/data/stations";

type Props = {
  station: Station;
  fuel: FuelType;
  cheapest?: boolean;
  favorite: boolean;
  onToggleFavorite: () => void;
  onOpen?: () => void;
};

const SECONDARY: FuelType[] = ["p95", "p98", "diesel", "lpg"];

export function StationCard({
  station,
  fuel,
  cheapest,
  favorite,
  onToggleFavorite,
  onOpen,
}: Props) {
  const secondary = SECONDARY.filter((f) => f !== fuel).slice(0, 3);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${station.brand} ${station.address}`,
  )}`;
  const shareText = `${station.brand}, ${station.address} — ${FUEL_LABELS[fuel]} ${formatPrice(
    station.prices[fuel],
  )}/l`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Pigiausi Degalai", text: shareText });
      } catch {
        /* vartotojas atšaukė */
      }
    } else {
      await navigator.clipboard?.writeText(shareText);
    }
  };

  return (
    <article
      className={
        cheapest
          ? "relative overflow-hidden rounded-2xl bg-mint/10 p-4 ring-1 ring-mint/40"
          : "rounded-2xl bg-ice/5 p-4 ring-1 ring-ice/15"
      }
    >
      {cheapest && (
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-mint to-transparent" />
      )}
      <div className="flex items-start justify-between gap-2">
        <button onClick={onOpen} className="flex flex-1 items-start gap-2.5 text-left">
          <BrandLogo brand={station.brand} size={30} />
          <span className="block">
            {cheapest && (
              <span className="mb-1 inline-block rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-frost">
                Pigiausia
              </span>
            )}
            <span className="block text-base font-semibold">
              {station.brand}
              {station.area ? ` · ${station.area}` : ""}
            </span>
            <span className="block text-[12px] text-ice/60">{station.address}</span>
            {onOpen && (
              <span className="mt-0.5 block text-[10px] text-mint">
                Daugiau informacijos ir nuolaidos →
              </span>
            )}
          </span>
        </button>
        <button onClick={onToggleFavorite} className="text-lg" aria-label="Mėgstama degalinė">
          {favorite ? "💚" : "🤍"}
        </button>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-[11px] text-ice/60">{FUEL_LABELS[fuel]} / l</p>
          <p className="text-2xl font-bold tracking-tight">
            {formatPrice(station.prices[fuel]).replace(" €", "")}{" "}
            <span className="text-sm font-medium text-ice/60">€</span>
          </p>
        </div>
        <p className={`text-xs ${cheapest ? "font-medium text-mint" : "text-ice/60"}`}>
          {formatKm(station.distanceKm)}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {secondary.map((f) => (
          <div key={f} className="rounded-lg bg-ice/5 px-2 py-1.5 ring-1 ring-ice/10">
            <p className="text-[10px] text-ice/50">{FUEL_SHORT[f]}</p>
            <p className="text-sm font-semibold">{formatPrice(station.prices[f])}</p>
          </div>
        ))}
      </div>

      {station.prices.markedDiesel !== undefined && (
        <p className="mt-2 text-[11px] text-ice/50">
          Dažytas dyzelinas: {formatPrice(station.prices.markedDiesel)}
        </p>
      )}
      <p className="mt-1 text-[11px] text-ice/50">Kainos atnaujintos {station.updatedAt}</p>

      <div className="mt-3 flex gap-2">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className={
            cheapest
              ? "flex-1 rounded-xl bg-mint py-2.5 text-center text-sm font-semibold text-frost"
              : "flex-1 rounded-xl bg-ice/5 py-2.5 text-center text-sm font-semibold ring-1 ring-ice/10"
          }
        >
          Vesti navigaciją
        </a>
        <button
          onClick={share}
          aria-label="Dalintis"
          className="rounded-xl bg-ice/5 px-3 text-sm ring-1 ring-ice/10"
        >
          ↗
        </button>
      </div>
    </article>
  );
}
