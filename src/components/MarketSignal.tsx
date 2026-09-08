import type { MarketSignal } from "@/lib/fuel.functions";

const DISCLAIMER =
  "Tai orientacinė prielaida, paremta pasauline naftos rinka ir valiutų kursu — realią kainą degalinėse lemia ir kiti veiksniai (mokesčiai, konkurencija, tiekėjų sutartys), todėl ji gali skirtis.";

function pct(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2).replace(".", ",")} %`;
}

/** Mažas, neįkyrus indikatorius degalinės kortelėje. Nežymaus pokyčio nerodome. */
export function MarketSignalBadge({ signal }: { signal: MarketSignal | null }) {
  if (!signal || signal.direction === "flat") return null;
  const up = signal.direction === "up";
  return (
    <span
      title={DISCLAIMER}
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
        up ? "bg-rose-400/15 text-rose-300" : "bg-mint/15 text-mint"
      }`}
    >
      {up ? "↑ greičiausiai brangs" : "↓ greičiausiai pigs"}
    </span>
  );
}

const WORDING: Record<MarketSignal["direction"], string> = {
  up: "aukštesnė nei šiandien",
  down: "žemesnė nei šiandien",
  flat: "panaši į šiandienos",
};

/** Platesnis paaiškinimas „Tendencijos“ skiltyje. */
export function MarketSignalCard({ signal }: { signal: MarketSignal | null }) {
  if (!signal) return null;
  return (
    <section className="mt-5 rounded-2xl bg-ice/5 p-4 ring-1 ring-ice/15">
      <p className="text-sm font-semibold">Kainų pokyčio prielaida</p>
      <p className="mt-1 text-[13px] leading-relaxed text-ice/80">
        Pasaulinės naftos (Brent) kaina eurais pakito {pct(signal.brentChangePct)}, EUR/USD kursas
        pakito {pct(signal.fxChangePct)}. Tai gali reikšti, kad rytoj kuro kaina Lietuvoje bus{" "}
        <span
          className={
            signal.direction === "up"
              ? "font-semibold text-rose-300"
              : signal.direction === "down"
                ? "font-semibold text-mint"
                : "font-semibold"
          }
        >
          {WORDING[signal.direction]}
        </span>
        .
      </p>
      <p className="mt-2 text-[11px] text-ice/50">
        Brent: {signal.brentUsd.toFixed(2).replace(".", ",")} USD/bar. ·{" "}
        {signal.brentEur.toFixed(2).replace(".", ",")} € /bar. · EUR/USD{" "}
        {signal.eurUsd.toFixed(4).replace(".", ",")} · duomenys {signal.date}
      </p>
      <p className="mt-2 text-[10px] leading-relaxed text-ice/40">{DISCLAIMER}</p>
    </section>
  );
}
