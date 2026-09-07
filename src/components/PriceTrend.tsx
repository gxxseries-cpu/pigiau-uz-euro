import { FUEL_LABELS, PRICE_HISTORY, formatPrice, type FuelType } from "@/data/stations";

export function PriceTrend({ fuel, city }: { fuel: FuelType; city: string }) {
  const data = PRICE_HISTORY[fuel];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 320;
    const y = 56 - ((v - min) / span) * 46;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const change = data[data.length - 1] - data[0];
  const pct = ((change / data[0]) * 100).toFixed(1).replace(".", ",");

  return (
    <section className="relative mt-5 rounded-2xl bg-ice/5 p-4 ring-1 ring-ice/15">
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Kainų tendencija (7 d.)</p>
        <span className="text-[11px] text-mint">
          {change >= 0 ? "↑" : "↓"} {pct.replace("-", "")} %
        </span>
      </div>
      <p className="mt-1 text-2xl font-bold tracking-tight">{formatPrice(data[data.length - 1])}</p>
      <svg className="mt-3 h-16 w-full" viewBox="0 0 320 64" fill="none" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5fe7c2" stopOpacity="0.35" />
            <stop offset="1" stopColor="#5fe7c2" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M${points.join(" L")} L320,64 L0,64 Z`} fill="url(#trendArea)" />
        <path
          d={`M${points.join(" L")}`}
          stroke="#5fe7c2"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="mt-2 text-[11px] text-ice/50">
        Vidutinė {FUEL_LABELS[fuel].toLowerCase()} kaina per 7 dienas · {city}
      </p>
    </section>
  );
}
