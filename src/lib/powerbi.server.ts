// Serverio pusės logika: ENA kainų nuskaitymas iš viešos ENA Power BI ataskaitos API.
// Ataskaita https://www.ena.lt/dk-irankis/ siunčia užklausas į viešą Power BI API
// su resource key raktu; atsakymas – suspaustas DSR formatas (ValueDicts + R/Ø bitų kaukės).
import type { Row } from "./ena-import.server";

const QUERYDATA_URL =
  "https://wabi-west-europe-e-primary-api.analysis.windows.net/public/reports/querydata?synchronous=true";
const RESOURCE_KEY = "60850ad8-c1ee-47ef-8a08-339eaee7bff4";
const MODEL_ID = 8451841;
const DATASET_ID = "300e7751-6e12-405c-890d-fee9774f760a";
const REPORT_ID = "f3173649-69eb-4914-918e-ff07b3445245";
const VISUAL_ID = "084f0df92910be7114d8";
const PAGE_SIZE = 5000;

const COLUMNS: Array<[string, string]> = [
  ["Įmonė (Degalinių tinklas)", "brand"],
  ["Degalinės vieta (Savivaldybė)", "area"],
  ["Degalinės vieta (Gyvenvietė, gatvė)", "address"],
  ["Degalų tipas", "fuel"],
  ["Kaina", "price"],
  ["Data", "date"],
];

function col(prop: string) {
  return { Column: { Expression: { SourceRef: { Source: "d" } }, Property: prop } };
}

function buildBody(where: unknown[], start: number, count: number) {
  const select = COLUMNS.map(([prop, name]) => ({ ...col(prop), Name: name }));
  return {
    version: "1.0.0",
    queries: [
      {
        Query: {
          Commands: [
            {
              SemanticQueryDataShapeCommand: {
                Query: {
                  Version: 2,
                  From: [{ Name: "d", Entity: "degalu_kainos", Type: 0 }],
                  Select: select,
                  Where: where,
                },
                Binding: {
                  Primary: {
                    Groupings: [
                      {
                        Projections: COLUMNS.map((_, i) => i),
                        Paging: { Row: { Start: start, Count: count } },
                      },
                    ],
                  },
                  // DataReduction privalo būti Binding viduje – kitaip API grąžina tik 100 eilučių.
                  DataReduction: { DataVolume: 3, Primary: { Window: { Count: count } } },
                  Version: 1,
                },
              },
              ExecutionMetricsKind: 1,
            },
          ],
        },
        QueryId: "",
        ApplicationContext: { DatasetId: DATASET_ID, Sources: [{ ReportId: REPORT_ID, VisualId: VISUAL_ID }] },
      },
    ],
    cancelQueries: [],
    modelId: MODEL_ID,
  };
}

type DsrItem = { S?: Array<{ DN?: string }>; C: unknown[]; R?: number; "Ø"?: number };

/** Dekoduoja Power BI DSR (dsr/DS/PH/DM0) formatą į eilučių masyvą. */
function decodeDsr(data: any): unknown[][] {
  const ds = data?.dsr?.DS?.[0];
  const dm0: Array<DsrItem> = ds?.PH?.flatMap((ph: any) => ph?.DM0 ?? []) ?? [];
  if (dm0.length === 0) return [];
  const cols: Array<{ DN?: string }> = dm0[0]?.S ?? [];
  const dicts: Record<string, unknown[]> = ds?.ValueDicts ?? {};
  const bit = (i: number, mask: number) => ((mask >> i) & 1) === 1;

  const rows: unknown[][] = [];
  let prev: unknown[] = [];
  for (const item of dm0) {
    const cur = [...(item.C ?? [])];
    const rMask = item.R ?? 0;
    const nullMask = item["Ø"] ?? 0;
    if (item.R !== undefined || item["Ø"] !== undefined) {
      // Bitų kaukės pažymi, kurie stulpeliai turi būti atkurti iš ankstesnės eilutės arba null.
      for (let i = 0; i < cols.length; i++) {
        if (bit(i, rMask)) cur.splice(i, 0, prev[i] ?? null);
        else if (bit(i, nullMask)) cur.splice(i, 0, null);
      }
    }
    prev = cur;
    const row = cols.map((c, i) => {
      let v = cur[i];
      if (c?.DN) {
        const dict = dicts[c.DN];
        if (dict && typeof v === "number" && Number.isInteger(v) && v < dict.length) v = dict[v];
      }
      if (typeof v === "string") v = v.replace(/^'/, "");
      return v;
    });
    rows.push(row);
  }
  return rows;
}

function normalizeFuel(value: unknown): "diesel" | "p95" | "p98" | "lpg" | "marked_diesel" | undefined {
  const s = String(value ?? "").toLowerCase();
  if (/dazyt/.test(s) && /dyzel/.test(s)) return "marked_diesel";
  if (/dyzel/.test(s)) return "diesel";
  if (/98/.test(s)) return "p98";
  if (/95/.test(s)) return "p95";
  if (/snd/.test(s) || /dujos/.test(s)) return "lpg";
  return undefined;
}

function toPrice(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n < 10 ? Math.round(n * 1000) / 1000 : undefined;
}

function dateToLiteral(date: Date) {
  const d = date.toISOString().slice(0, 10);
  return `datetime'${d}T00:00:00'`;
}

function dateWhere(date: Date) {
  const lit = dateToLiteral(date);
  return [
    {
      Condition: {
        In: {
          Expressions: [col("Data")],
          Values: [[{ Literal: { Value: lit } }]],
        },
      },
    },
  ];
}

/** Nuskaito kainas už datą (su puslapiavimu). */
async function fetchRowsForDate(date: Date): Promise<unknown[][]> {
  const where = dateWhere(date);
  const all: unknown[][] = [];
  for (let start = 0; start < 100000; start += PAGE_SIZE) {
    const res = await fetch(QUERYDATA_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "x-powerbi-resourcekey": RESOURCE_KEY,
        requestid: crypto.randomUUID(),
        activityid: crypto.randomUUID(),
        origin: "https://app.powerbi.com",
        referer: "https://app.powerbi.com/",
      },
      body: JSON.stringify(buildBody(where, start, PAGE_SIZE)),
    });
    if (!res.ok) throw new Error(`Power BI užklausa grąžino ${res.status}.`);
    const json = await res.json();
    const data = json?.results?.[0]?.result?.data;
    const page = data?.dsr?.DS?.[0]?.PH?.[0]?.DM0 ?? [];
    all.push(...decodeDsr(data));
    if (page.length < PAGE_SIZE) break;
  }
  return all;
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** ENA kainos vienai datai – kartojamos iki 3 dienų atgal, kol randama duomenų. */
export async function fetchEnaPowerBiRows(): Promise<{ rows: Row[]; date: string }> {
  // ENA ataskaitos datos laukas yra UTC vidurnaktis; Vilniaus laiku 10:30 tai dar ta pati diena.
  const now = new Date();
  const candidates = [0, -1, -2].map((offset) => new Date(now.getTime() + offset * MILLISECONDS_PER_DAY));
  for (const date of candidates) {
    const raw = await fetchRowsForDate(date);
    if (raw.length === 0) continue;
    const dateKey = date.toISOString().slice(0, 10);
    const rows: Row[] = [];
    for (const r of raw) {
      const brand = String(r[0] ?? "").trim();
      const address = String(r[2] ?? "").trim();
      const price = toPrice(r[4]);
      const fuel = normalizeFuel(r[3]);
      if (!brand || !address || fuel === undefined || price === undefined) continue;
      const area = String(r[1] ?? "").trim();
      const city = address.split(",")[0]?.trim() || area || "Nežinoma";
      const mapped: Row = { brand, address, city };
      if (area) mapped.area = area;
      mapped[fuel] = price;
      rows.push(mapped);
    }
    if (rows.length > 0) return { rows, date: dateKey };
  }
  throw new Error("ENA ataskaitoje nerasta šios savaitės kainų.");
}
