// Serverio pusės logika: kainų failo (Excel/CSV) nusiskaitymas iš nuorodos ir įrašymas į DB.
import * as XLSX from "xlsx";

type Field =
  | "brand"
  | "address"
  | "city"
  | "area"
  | "diesel"
  | "p95"
  | "p98"
  | "lpg"
  | "marked_diesel";

export type Row = {
  brand: string;
  address: string;
  city: string;
  area?: string;
  diesel?: number;
  p95?: number;
  p98?: number;
  lpg?: number;
  marked_diesel?: number;
};

function normalize(value: string) {
  return value
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Antraštės atpažinimas – tinka tiek lietuviškiems, tiek angliškiems variantams. */
function matchField(header: string): Field | undefined {
  const h = normalize(header);
  if (!h) return undefined;

  if (/dazyt/.test(h) && /dyzel/.test(h)) return "marked_diesel";
  if (/marked/.test(h)) return "marked_diesel";
  if (/dyzel|diesel/.test(h)) return "diesel";
  if (/98/.test(h)) return "p98";
  if (/95/.test(h)) return "p95";
  if (/\bsnd\b|lpg|dujos|autogaz/.test(h)) return "lpg";
  if (/tinkl|imon|brand|prekyb|degalines pavad|pavadinim/.test(h)) return "brand";
  if (/adres|address|gatv/.test(h)) return "address";
  if (/miest|gyvenviet|city|vietov/.test(h)) return "city";
  if (/savivaldyb|rajon|apskrit|area/.test(h)) return "area";
  return undefined;
}

function toPrice(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 && n < 10 ? Math.round(n * 1000) / 1000 : undefined;
}

/** Randa antraštės eilutę ir surenka duomenų eilutes iš dvimatės matricos. */
function rowsFromMatrix(matrix: unknown[][]): Row[] {
  let headerIndex = -1;
  let mapping: Array<Field | undefined> = [];

  for (let i = 0; i < Math.min(matrix.length, 30); i++) {
    const candidate = (matrix[i] ?? []).map((c) => matchField(String(c ?? "")));
    if (
      candidate.includes("address") &&
      (candidate.includes("brand") || candidate.includes("city")) &&
      candidate.some((f) => f === "diesel" || f === "p95" || f === "p98" || f === "lpg")
    ) {
      headerIndex = i;
      mapping = candidate;
      break;
    }
  }
  if (headerIndex === -1) return [];

  const rows: Row[] = [];
  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const cells = matrix[i] ?? [];
    const row: Partial<Row> = {};
    mapping.forEach((field, idx) => {
      if (!field) return;
      const raw = cells[idx];
      if (raw === undefined || raw === null || String(raw).trim() === "") return;
      if (field === "brand" || field === "address" || field === "city" || field === "area") {
        row[field] = String(raw).trim();
      } else {
        const price = toPrice(raw);
        if (price !== undefined) row[field] = price;
      }
    });
    if (!row.address || !row.brand) continue;
    if (!row.city) row.city = row.area ?? "Nežinoma";
    const hasPrice =
      row.diesel !== undefined ||
      row.p95 !== undefined ||
      row.p98 !== undefined ||
      row.lpg !== undefined ||
      row.marked_diesel !== undefined;
    if (!hasPrice) continue;
    rows.push(row as Row);
  }
  return rows;
}

/** Nusiskaito failą (xlsx / xls / csv) iš nuorodos ir grąžina eilutes. */
export async function fetchSourceRows(url: string): Promise<Row[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "PigiausiDegalai/1.0 (kainu atnaujinimas)" },
  });
  if (!res.ok) throw new Error(`Nepavyko atsisiųsti failo (${res.status}).`);

  const buffer = await res.arrayBuffer();
  const isCsv =
    /\.csv(\?|$)/i.test(url) ||
    (res.headers.get("content-type") ?? "").includes("text/csv");

  const workbook = isCsv
    ? XLSX.read(new TextDecoder("utf-8").decode(buffer), { type: "string", raw: true })
    : XLSX.read(new Uint8Array(buffer), { type: "array" });

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: null,
    });
    const rows = rowsFromMatrix(matrix);
    if (rows.length > 0) return rows;
  }
  return [];
}

/** Įrašo degalines ir kainas (naudoja service role klientą). */
export async function importRows(rows: Row[], date: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const seen = new Set<string>();
  const stationRows: Array<{
    brand: string;
    address: string;
    city: string;
    area: string | null;
  }> = [];
  for (const r of rows) {
    const key = `${r.address}|${r.brand}`;
    if (seen.has(key)) continue;
    seen.add(key);
    stationRows.push({
      brand: r.brand,
      address: r.address,
      city: r.city,
      area: r.area ?? null,
    });
  }

  const { data: saved, error: sErr } = await supabaseAdmin
    .from("stations")
    .upsert(stationRows, { onConflict: "address,brand" })
    .select("id, address, brand");
  if (sErr) throw new Error(`Nepavyko išsaugoti degalinių: ${sErr.message}`);

  const idByKey = new Map<string, string>(
    (saved ?? []).map((s) => [`${s.address}|${s.brand}`, s.id]),
  );

  const now = new Date().toISOString();
  const priceRows: Array<{
    station_id: string;
    fuel_type: string;
    price: number;
    price_date: string;
    updated_at: string;
  }> = [];

  for (const r of rows) {
    const id = idByKey.get(`${r.address}|${r.brand}`);
    if (!id) continue;
    const entries: Array<[string, number | undefined]> = [
      ["diesel", r.diesel],
      ["p95", r.p95],
      ["p98", r.p98],
      ["lpg", r.lpg],
      ["marked_diesel", r.marked_diesel],
    ];
    for (const [fuel_type, price] of entries) {
      if (typeof price === "number") {
        priceRows.push({ station_id: id, fuel_type, price, price_date: date, updated_at: now });
      }
    }
  }

  for (let i = 0; i < priceRows.length; i += 500) {
    const chunk = priceRows.slice(i, i + 500);
    const { error: pErr } = await supabaseAdmin
      .from("station_prices")
      .upsert(chunk, { onConflict: "station_id,fuel_type,price_date" });
    if (pErr) throw new Error(`Nepavyko išsaugoti kainų: ${pErr.message}`);
  }

  return { stations: stationRows.length, prices: priceRows.length };
}

/** Visas kasdienis ciklas: ENA Power BI API (arba atsarginis failo URL) -> DB -> būsenos įrašas. */
export async function runDailyImport() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: settings } = await supabaseAdmin
    .from("import_source")
    .select("source_url")
    .eq("id", true)
    .maybeSingle();

  const url = settings?.source_url?.trim();
  const finish = async (
    status: string,
    message: string,
    counts = { stations: 0, prices: 0 },
  ) => {
    await supabaseAdmin
      .from("import_source")
      .update({
        last_run_at: new Date().toISOString(),
        last_status: status,
        last_message: message,
        last_stations: counts.stations,
        last_prices: counts.prices,
      })
      .eq("id", true);

    // Perskaičiuojame naftos rinkos indikatorių (nepavykus – tiesiog nerodomas).
    try {
      const { updateMarketSignal } = await import("./market.server");
      const signal = await updateMarketSignal();
      console.log(`Rinkos indikatorius: ${signal.direction} (${signal.brent_change_pct} %).`);
    } catch (err) {
      console.error("Rinkos indikatoriaus klaida:", err);
    }

    // Kainos atsinaujino – išsiunčiame pranešimus prenumeratoriams.
    if (status === "sėkmė" && counts.prices > 0) {
      try {
        const { sendPriceUpdateNotifications } = await import("./push.server");
        const push = await sendPriceUpdateNotifications();
        console.log(`Pranešimai: išsiųsta ${push.sent}, praleista ${push.skipped}.`);
      } catch (err) {
        console.error("Pranešimų siuntimo klaida:", err);
      }
    }

    return { status, message, ...counts };
  };

  // 1. Pirmiausia bandoma pirminė ENA ataskaita (Power BI) – nebereikia jokios nuorodos.
  try {
    const { fetchEnaPowerBiRows } = await import("./powerbi.server");
    const { rows, date } = await fetchEnaPowerBiRows();
    const counts = await importRows(rows, date);
    if (counts.prices > 0) {
      return finish(
        "sėkmė",
        `Atnaujinta iš ENA: ${counts.prices} kainų (${counts.stations} degalinių).`,
        counts,
      );
    }
  } catch (err) {
    console.error("ENA Power BI importo klaida:", err);
  }

  // 2. Atsarginis kelias – administratoriaus nurodytas Excel/CSV failas.
  if (!url) {
    return finish("klaida", "Nepavyko gauti kainų iš ENA ataskaitos ir nenurodyta atsarginė failo nuoroda.");
  }

  try {
    const rows = await fetchSourceRows(url);
    if (rows.length === 0) {
      return finish("klaida", "Faile nerasta atpažįstamų degalinių kainų eilučių.");
    }
    const date = new Date().toISOString().slice(0, 10);
    const counts = await importRows(rows, date);
    return finish(
      "sėkmė",
      `Atnaujinta iš failo: ${counts.prices} kainų (${counts.stations} degalinių).`,
      counts,
    );
  } catch (err) {
    return finish("klaida", err instanceof Error ? err.message : "Nežinoma klaida.");
  }
}
