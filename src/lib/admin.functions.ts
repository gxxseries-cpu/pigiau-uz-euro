import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const rowSchema = z.object({
  brand: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  area: z.string().optional(),
  diesel: z.number().optional(),
  p95: z.number().optional(),
  p98: z.number().optional(),
  lpg: z.number().optional(),
  marked_diesel: z.number().optional(),
});

const importSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rows: z.array(rowSchema).min(1).max(2000),
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Neturite administratoriaus teisių.");
}

/** Ar prisijungęs naudotojas yra administratorius, ir ar administratorius jau egzistuoja. */
export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    return { isAdmin: Boolean(data), adminExists: (count ?? 0) > 0 };
  });

/** Pirmasis prisijungęs naudotojas gali pasiskirti administratoriaus rolę. */
export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("Administratorius jau priskirtas.");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error("Nepavyko priskirti rolės.");
    return { ok: true };
  });

/** Rankinis kainų importas (CSV / Excel eilutės). */
export const importPrices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => importSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const stationRows = data.rows.map((r) => ({
      brand: r.brand.trim(),
      address: r.address.trim(),
      city: r.city.trim(),
      area: r.area?.trim() || null,
    }));

    const { data: saved, error: sErr } = await context.supabase
      .from("stations")
      .upsert(stationRows, { onConflict: "address,brand" })
      .select("id, address, brand");
    if (sErr) throw new Error(`Nepavyko išsaugoti degalinių: ${sErr.message}`);

    const idByKey = new Map<string, string>(
      (saved ?? []).map((s: any) => [`${s.address}|${s.brand}`, s.id]),
    );

    const priceRows: Array<{
      station_id: string;
      fuel_type: string;
      price: number;
      price_date: string;
      updated_at: string;
    }> = [];
    const now = new Date().toISOString();

    for (const r of data.rows) {
      const id = idByKey.get(`${r.address.trim()}|${r.brand.trim()}`);
      if (!id) continue;
      const entries: Array<[string, number | undefined]> = [
        ["diesel", r.diesel],
        ["p95", r.p95],
        ["p98", r.p98],
        ["lpg", r.lpg],
        ["marked_diesel", r.marked_diesel],
      ];
      for (const [fuel_type, price] of entries) {
        if (typeof price === "number" && price > 0) {
          priceRows.push({
            station_id: id,
            fuel_type,
            price: Math.round(price * 1000) / 1000,
            price_date: data.date,
            updated_at: now,
          });
        }
      }
    }

    if (priceRows.length > 0) {
      const { error: pErr } = await context.supabase
        .from("station_prices")
        .upsert(priceRows, { onConflict: "station_id,fuel_type,price_date" });
      if (pErr) throw new Error(`Nepavyko išsaugoti kainų: ${pErr.message}`);
    }

    return { stations: saved?.length ?? 0, prices: priceRows.length };
  });

/** Adresų geokodavimas per OpenStreetMap Nominatim (koordinatės išsaugomos DB). */
export const geocodeStations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);

    const { data: missing, error } = await context.supabase
      .from("stations")
      .select("id, address, city")
      .is("lat", null)
      .limit(15);
    if (error) throw new Error(`Nepavyko gauti degalinių: ${error.message}`);

    let done = 0;
    for (const station of missing ?? []) {
      const query = encodeURIComponent(`${station.address}, Lietuva`);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=lt&q=${query}`,
          { headers: { "User-Agent": "PigiausiDegalai/1.0 (lovable app)" } },
        );
        if (!res.ok) continue;
        const json = (await res.json()) as Array<{ lat: string; lon: string }>;
        const hit = json[0];
        if (!hit) continue;
        await context.supabase
          .from("stations")
          .update({ lat: Number(hit.lat), lon: Number(hit.lon), updated_at: new Date().toISOString() })
          .eq("id", station.id);
        done += 1;
      } catch (e) {
        console.error("Geokodavimo klaida", e);
      }
      await new Promise((r) => setTimeout(r, 1100));
    }

    return { processed: missing?.length ?? 0, geocoded: done };
  });

/** Automatinio atnaujinimo nustatymai ir paskutinio paleidimo būsena. */
export const getImportSource = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("import_source")
      .select("source_url, last_run_at, last_status, last_message, last_stations, last_prices")
      .eq("id", true)
      .maybeSingle();
    return data ?? null;
  });

/** Išsaugo kainų failo nuorodą, iš kurios kasdien nusiskaitomos kainos. */
export const saveImportSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ url: z.string().url().max(2000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("import_source")
      .update({ source_url: data.url.trim() })
      .eq("id", true);
    if (error) throw new Error(`Nepavyko išsaugoti nuorodos: ${error.message}`);
    return { ok: true };
  });

/** Paleidžia atnaujinimą iš karto (tas pats veiksmas, kurį kasdien vykdo tvarkaraštis). */
export const runImportNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { runDailyImport } = await import("@/lib/ena-import.server");
    return runDailyImport();
  });
