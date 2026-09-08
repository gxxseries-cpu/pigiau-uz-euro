import { useQuery } from "@tanstack/react-query";

import { BrandLogo } from "@/components/BrandLogo";
import { PriceTrend } from "@/components/PriceTrend";
import { DISCOUNT_DISCLAIMER, discountsForBrand } from "@/data/discounts";
import {
  FUEL_LABELS,
  formatKm,
  formatPrice,
  type FuelType,
  type Station,
} from "@/data/stations";
import { getStationTrend } from "@/lib/fuel.functions";

const FUELS: FuelType[] = ["diesel", "p95", "p98", "lpg"];

export function StationDetail({
  station,
  fuel,
  favorite,
  onToggleFavorite,
  onClose,
}: {
  station: Station;
  fuel: FuelType;
  favorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
}) {
  const discounts = discountsForBrand(station.brand);
  const { data: points } = useQuery({
    queryKey: ["station-trend", station.id, fuel],
    queryFn: () => getStationTrend({ data: { stationId: station.id, fuel } }),
  });

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${station.brand} ${station.address}`,
  )}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-frost/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-frost px-4 pb-8 pt-4 ring-1 ring-ice/15"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ice/20" />

        <div className="flex items-start gap-3">
          <BrandLogo brand={station.brand} size={38} />
          <div className="flex-1">
            <h2 className="text-base font-semibold">
              {station.brand}
              {station.area ? ` · ${station.area}` : ""}
            </h2>
            <p className="text-[12px] text-ice/60">{station.address}</p>
            <p className="text-[11px] text-ice/40">
              {station.city} · {formatKm(station.distanceKm)} · atnaujinta {station.updatedAt}
            </p>
          </div>
          <button onClick={onToggleFavorite} className="text-lg" aria-label="Mėgstama degalinė">
            {favorite ? "💚" : "🤍"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {FUELS.map((f) => (
            <div key={f} className="rounded-xl bg-ice/5 px-3 py-2 ring-1 ring-ice/10">
              <p className="text-[11px] text-ice/50">{FUEL_LABELS[f]}</p>
              <p className="text-lg font-semibold">{formatPrice(station.prices[f])}</p>
            </div>
          ))}
          {station.prices.markedDiesel !== undefined && (
            <div className="rounded-xl bg-ice/5 px-3 py-2 ring-1 ring-ice/10">
              <p className="text-[11px] text-ice/50">Dažytas dyzelinas</p>
              <p className="text-lg font-semibold">{formatPrice(station.prices.markedDiesel)}</p>
            </div>
          )}
        </div>

        {discounts.length > 0 && (
          <section className="mt-4 rounded-2xl bg-ice/5 p-4 ring-1 ring-ice/15">
            <p className="text-sm font-semibold">Žinomos nuolaidos</p>
            <div className="mt-2 space-y-3">
              {discounts.map((d) => (
                <div key={d.title}>
                  <p className="text-[13px] font-medium">{d.title}</p>
                  <p className="mt-0.5 text-[12px] text-ice/60">{d.text}</p>
                  <a
                    href={d.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-mint underline"
                  >
                    Šaltinis: {d.sourceLabel}
                  </a>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-ice/40">{DISCOUNT_DISCLAIMER}</p>
          </section>
        )}

        <PriceTrend fuel={fuel} title={station.brand} points={points ?? []} />

        <div className="mt-4 flex gap-2">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-xl bg-mint py-3 text-center text-sm font-semibold text-frost"
          >
            Vesti navigaciją
          </a>
          <button
            onClick={onClose}
            className="rounded-xl bg-ice/5 px-4 text-sm ring-1 ring-ice/10"
          >
            Uždaryti
          </button>
        </div>
      </div>
    </div>
  );
}
