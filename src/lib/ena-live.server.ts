// Serverio pusės logika: ENA tiesioginis kainų API (tas pats, kurį naudoja degalukainos.ena.lt).
// Jame matomos 10:00 kainos ir degalinių dienos eigoje pateikti pakeitimai.
import type { Row } from "./ena-import.server";

const API_URL = "https://api-degalukainos.ena.lt/api/v1/read/prices/latest";
// Viešas raktas, įdėtas į pačios degalukainos.ena.lt svetainės kodą.
const PUBLIC_TOKEN = "1|KIyMz1NebDWVphuzh7sDy68ANnqoTTABXh1uO4xN067fec57";

type LiveItem = {
  company_name?: string;
  municipality?: string;
  address?: string;
  fuel_type?: string;
  price?: string | number;
  submitted_at?: string;
};

function mapFuel(t: string | undefined): keyof Row | undefined {
  const v = (t ?? "").toLowerCase();
  if (v.includes("dazyt") || v.includes("žym")) return "marked_diesel";
  if (v.includes("dyzel")) return "diesel";
  if (v.includes("98")) return "p98";
  if (v.includes("95")) return "p95";
  if (v.includes("snd") || v.includes("duj")) return "lpg";
  return undefined;
}

export async function fetchEnaLiveRows(): Promise<{ rows: Row[]; date: string }> {
  const res = await fetch(API_URL, {
    headers: { Authorization: `Bearer ${PUBLIC_TOKEN}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`ENA tiesioginis API grąžino ${res.status}.`);
  const json = (await res.json()) as { data?: LiveItem[] };
  const items = json.data ?? [];

  const byStation = new Map<string, Row>();
  const dateCount = new Map<string, number>();
  for (const it of items) {
    const brand = String(it.company_name ?? "").trim();
    const address = String(it.address ?? "").trim();
    const fuel = mapFuel(it.fuel_type);
    const price = Number(String(it.price ?? "").replace(",", "."));
    if (!brand || !address || !fuel || !Number.isFinite(price) || price <= 0 || price > 10) continue;
    const day = String(it.submitted_at ?? "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) dateCount.set(day, (dateCount.get(day) ?? 0) + 1);

    const key = `${address}|${brand}`;
    let row = byStation.get(key);
    if (!row) {
      const area = String(it.municipality ?? "").trim();
      row = { brand, address, city: address.split(",")[0]?.trim() || area || "Nežinoma" };
      if (area) row.area = area;
      byStation.set(key, row);
    }
    (row as Record<string, unknown>)[fuel] = price;
  }

  const rows = [...byStation.values()];
  if (rows.length === 0) throw new Error("ENA tiesioginiame API nerasta kainų.");
  // Kainų data – dažniausia pateikimo diena (beveik visos degalinės – tos dienos 10:00).
  const date = [...dateCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!date) throw new Error("ENA tiesioginiame API nerasta kainų datos.");
  return { rows, date };
}
