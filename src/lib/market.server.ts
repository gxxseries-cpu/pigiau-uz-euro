// Serverio pusė: pasaulinės naftos rinkos (Brent) ir EUR/USD kurso indikatorius.
// Rezultatas įrašomas į public.market_signal, kad klientas jį tik nuskaitytų.

/** Slenkstis procentais, nuo kurio laikoma, kad kaina greičiausiai keisis. */
export const SIGNAL_THRESHOLD_PCT = 1;

/** Kiek dienų vidurkinama, kad pokytis būtų stabilesnis. */
const WINDOW_DAYS = 3;

type Series = Array<{ date: string; value: number }>;

function avg(values: number[]) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Brent uždarymo kainos (USD/barelis) – vieši rinkos duomenys, be API rakto. */
async function fetchBrentSeries(): Promise<Series> {
  const res = await fetch(
    "https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=1d&range=1mo",
    { headers: { "User-Agent": "PigiausiDegalai/1.0" } },
  );
  if (!res.ok) throw new Error(`Naftos kainų šaltinis neprieinamas (${res.status}).`);
  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: Array<number | null> }> };
      }>;
    };
  };
  const result = json.chart?.result?.[0];
  const stamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const series: Series = [];
  for (let i = 0; i < stamps.length; i++) {
    const close = closes[i];
    const ts = stamps[i];
    if (typeof close === "number" && Number.isFinite(close) && typeof ts === "number") {
      series.push({ date: new Date(ts * 1000).toISOString().slice(0, 10), value: close });
    }
  }
  if (series.length < WINDOW_DAYS * 2) throw new Error("Nepakanka naftos kainų duomenų.");
  return series;
}

/** EUR/USD kursas iš Europos Centrinio Banko (Frankfurter API, be registracijos). */
async function fetchEurUsdSeries(): Promise<Series> {
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const res = await fetch(
    `https://api.frankfurter.dev/v1/${start.toISOString().slice(0, 10)}..?base=EUR&symbols=USD`,
  );
  if (!res.ok) throw new Error(`Valiutų kurso šaltinis neprieinamas (${res.status}).`);
  const json = (await res.json()) as { rates?: Record<string, { USD?: number }> };
  const series = Object.entries(json.rates ?? {})
    .map(([date, r]) => ({ date, value: Number(r.USD) }))
    .filter((p) => Number.isFinite(p.value) && p.value > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (series.length < 2) throw new Error("Nepakanka valiutų kurso duomenų.");
  return series;
}

function direction(changePct: number) {
  if (changePct > SIGNAL_THRESHOLD_PCT) return "up";
  if (changePct < -SIGNAL_THRESHOLD_PCT) return "down";
  return "flat";
}

/**
 * Suskaičiuoja dienos indikatorių ir įrašo jį į DB.
 * Jei bent vienas šaltinis neprieinamas – nieko neįrašo (geriau nerodyti, nei rodyti klaidingai).
 */
export async function updateMarketSignal() {
  const [brent, fx] = await Promise.all([fetchBrentSeries(), fetchEurUsdSeries()]);

  const fxByDate = new Map(fx.map((p) => [p.date, p.value]));
  const lastFx = fx[fx.length - 1]!.value;
  const rateFor = (date: string) => fxByDate.get(date) ?? lastFx;

  // Naftos kaina eurais: USD kaina / EUR-USD kursas.
  const inEur = brent.map((p) => ({ date: p.date, value: p.value / rateFor(p.date) }));

  const recent = inEur.slice(-WINDOW_DAYS);
  const previous = inEur.slice(-WINDOW_DAYS * 2, -WINDOW_DAYS);
  const brentEur = avg(recent.map((p) => p.value));
  const brentEurPrev = avg(previous.map((p) => p.value));
  const changePct = ((brentEur - brentEurPrev) / brentEurPrev) * 100;

  const brentUsd = avg(brent.slice(-WINDOW_DAYS).map((p) => p.value));
  const brentUsdPrev = avg(brent.slice(-WINDOW_DAYS * 2, -WINDOW_DAYS).map((p) => p.value));
  const eurUsd = avg(fx.slice(-WINDOW_DAYS).map((p) => p.value));
  const eurUsdPrev = avg(fx.slice(-WINDOW_DAYS * 2, -WINDOW_DAYS).map((p) => p.value));

  const round = (v: number, d = 4) => Math.round(v * 10 ** d) / 10 ** d;
  const row = {
    signal_date: new Date().toISOString().slice(0, 10),
    brent_usd: round(brentUsd, 2),
    brent_usd_prev: round(brentUsdPrev, 2),
    eur_usd: round(eurUsd),
    eur_usd_prev: round(eurUsdPrev),
    brent_eur: round(brentEur, 2),
    brent_eur_prev: round(brentEurPrev, 2),
    brent_change_pct: round(changePct, 2),
    fx_change_pct: round(((eurUsd - eurUsdPrev) / eurUsdPrev) * 100, 2),
    direction: direction(changePct),
  };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("market_signal")
    .upsert(row, { onConflict: "signal_date" });
  if (error) throw new Error(`Nepavyko išsaugoti rinkos indikatoriaus: ${error.message}`);
  return row;
}
