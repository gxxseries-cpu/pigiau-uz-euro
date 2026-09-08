import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  claimAdmin,
  geocodeStations,
  getAdminStatus,
  importPrices,
} from "@/lib/admin.functions";

const TITLE = "Kainų pildymas – Pigiausi Degalai";
const DESC = "Administratoriaus skydelis: degalinių kainų importas ir adresų koordinatės.";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type ParsedRow = {
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

const HEADER_MAP: Record<string, keyof ParsedRow> = {
  tinklas: "brand",
  brand: "brand",
  adresas: "address",
  address: "address",
  miestas: "city",
  city: "city",
  rajonas: "area",
  area: "area",
  dyzelinas: "diesel",
  diesel: "diesel",
  b95: "p95",
  p95: "p95",
  "benzinas 95": "p95",
  b98: "p98",
  p98: "p98",
  "benzinas 98": "p98",
  snd: "lpg",
  lpg: "lpg",
  dujos: "lpg",
  "dazytas dyzelinas": "marked_diesel",
  "dažytas dyzelinas": "marked_diesel",
  marked_diesel: "marked_diesel",
};

function num(value: string) {
  const v = Number(value.trim().replace(",", "."));
  return Number.isFinite(v) && v > 0 ? v : undefined;
}

function parseCsv(text: string): { rows: ParsedRow[]; errors: string[] } {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  const errors: string[] = [];
  if (lines.length < 2) return { rows: [], errors: ["Failas tuščias arba be duomenų."] };

  const delimiter = (lines[0]!.match(/;/g)?.length ?? 0) >= (lines[0]!.match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = lines[0]!.split(delimiter).map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));
  const keys = headers.map((h) => HEADER_MAP[h]);

  if (!keys.includes("brand") || !keys.includes("address") || !keys.includes("city")) {
    return {
      rows: [],
      errors: ["Faile turi būti stulpeliai: tinklas, adresas, miestas (ir bent viena kuro kaina)."],
    };
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]!.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
    const row: Partial<ParsedRow> = {};
    keys.forEach((key, idx) => {
      const value = cells[idx];
      if (!key || value === undefined || value === "") return;
      if (key === "brand" || key === "address" || key === "city" || key === "area") {
        row[key] = value;
      } else {
        row[key] = num(value);
      }
    });
    if (!row.brand || !row.address || !row.city) {
      errors.push(`${i + 1} eilutė praleista – nėra tinklo, adreso arba miesto.`);
      continue;
    }
    rows.push(row as ParsedRow);
  }
  return { rows, errors };
}

function AdminPage() {
  const navigate = useNavigate();
  const statusFn = useServerFn(getAdminStatus);
  const claimFn = useServerFn(claimAdmin);
  const importFn = useServerFn(importPrices);
  const geocodeFn = useServerFn(geocodeStations);

  const status = useQuery({ queryKey: ["admin-status"], queryFn: () => statusFn() });

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File) => {
    setResult(null);
    const text = await file.text();
    const parsed = parseCsv(text);
    setRows(parsed.rows);
    setIssues(parsed.errors);
  };

  const doImport = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await importFn({ data: { date, rows } });
      setResult(`Įkelta: ${res.stations} degalinių, ${res.prices} kainų.`);
      setRows([]);
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Nepavyko įkelti duomenų.");
    } finally {
      setBusy(false);
    }
  };

  const doGeocode = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await geocodeFn();
      setResult(
        res.processed === 0
          ? "Visos degalinės jau turi koordinates."
          : `Koordinatės nustatytos: ${res.geocoded} iš ${res.processed}. Jei liko be koordinačių – paspausk dar kartą.`,
      );
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Nepavyko nustatyti koordinačių.");
    } finally {
      setBusy(false);
    }
  };

  const doClaim = async () => {
    setBusy(true);
    try {
      await claimFn();
      await status.refetch();
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Nepavyko.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-frost px-4 py-6 font-sans text-ice">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Kainų pildymas</h1>
            <p className="text-[11px] text-ice/50">1 etapas – rankinis importas</p>
          </div>
          <div className="flex gap-2">
            <Link to="/" className="rounded-lg bg-ice/5 px-2.5 py-1.5 text-[11px] ring-1 ring-ice/10">
              Į pradžią
            </Link>
            <button
              onClick={signOut}
              className="rounded-lg bg-ice/5 px-2.5 py-1.5 text-[11px] ring-1 ring-ice/10"
            >
              Atsijungti
            </button>
          </div>
        </div>

        {status.isLoading && <p className="mt-6 text-sm text-ice/60">Kraunama…</p>}

        {status.data && !status.data.isAdmin && (
          <section className="mt-5 rounded-2xl bg-ice/5 p-4 ring-1 ring-ice/15">
            {status.data.adminExists ? (
              <p className="text-sm text-ice/70">
                Ši paskyra neturi administratoriaus teisių. Paprašyk administratoriaus jas priskirti.
              </p>
            ) : (
              <>
                <p className="text-sm text-ice/70">
                  Administratoriaus dar nėra. Gali priskirti šią rolę sau.
                </p>
                <button
                  onClick={doClaim}
                  disabled={busy}
                  className="mt-3 rounded-xl bg-mint px-4 py-2 text-sm font-semibold text-frost disabled:opacity-60"
                >
                  Tapti administratoriumi
                </button>
              </>
            )}
          </section>
        )}

        {status.data?.isAdmin && (
          <>
            <section className="mt-5 rounded-2xl bg-ice/5 p-4 ring-1 ring-ice/15">
              <p className="text-sm font-semibold">Kainų failas (CSV)</p>
              <p className="mt-1 text-[11px] text-ice/50">
                Stulpeliai: tinklas; adresas; miestas; rajonas; dyzelinas; b95; b98; snd; dažytas
                dyzelinas. Kainas galima rašyti su kableliu (1,999).
              </p>

              <label className="mt-3 block text-[11px] text-ice/60">
                Kainų data
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-ice/5 px-3 py-2 text-sm text-ice ring-1 ring-ice/10 outline-none focus:ring-mint/50"
                />
              </label>

              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onFile(file);
                }}
                className="mt-3 w-full rounded-xl bg-ice/5 px-3 py-2 text-[12px] text-ice/70 ring-1 ring-ice/10"
              />

              {rows.length > 0 && (
                <>
                  <p className="mt-3 text-[12px] text-mint">Paruošta eilučių: {rows.length}</p>
                  <ul className="mt-2 space-y-1 text-[11px] text-ice/50">
                    {rows.slice(0, 3).map((r, i) => (
                      <li key={i}>
                        {r.brand} · {r.address} · dyz. {r.diesel ?? "—"}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={doImport}
                    disabled={busy}
                    className="mt-3 w-full rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-frost disabled:opacity-60"
                  >
                    {busy ? "Įkeliama…" : "Įkelti kainas"}
                  </button>
                </>
              )}

              {issues.length > 0 && (
                <ul className="mt-3 space-y-1 text-[11px] text-amber-300/80">
                  {issues.slice(0, 5).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mt-4 rounded-2xl bg-ice/5 p-4 ring-1 ring-ice/15">
              <p className="text-sm font-semibold">Adresų koordinatės</p>
              <p className="mt-1 text-[11px] text-ice/50">
                Naujoms degalinėms nustatomos koordinatės pagal adresą (iki 15 per kartą), kad
                veiktų atstumo paieška.
              </p>
              <button
                onClick={doGeocode}
                disabled={busy}
                className="mt-3 w-full rounded-xl bg-ice/10 px-4 py-2.5 text-sm font-semibold text-ice ring-1 ring-ice/15 disabled:opacity-60"
              >
                {busy ? "Vykdoma…" : "Nustatyti koordinates"}
              </button>
            </section>
          </>
        )}

        {result && <p className="mt-4 text-[12px] text-ice/70">{result}</p>}
      </div>
    </div>
  );
}
