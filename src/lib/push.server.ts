/**
 * Pranešimų siuntimas po kasdienio kainų atnaujinimo.
 *
 * KONFIGURACIJA: siuntimui naudojamas Firebase Cloud Messaging per Lovable
 * gateway. Kad pranešimai realiai išeitų, projekte turi būti prijungtas
 * Firebase Cloud Messaging (tada atsiranda FIREBASE_MESSAGING_API_KEY).
 * Kol jo nėra, funkcija tik suskaičiuoja prenumeratorius ir nieko nesiunčia.
 */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

type Subscriber = { token: string; city: string | null; fuel: string | null };

function priceText(value: number | undefined) {
  return value === undefined ? "—" : `${value.toFixed(3).replace(".", ",")} €/l`;
}

/** Sudaro asmeninį pranešimo tekstą pagal naudotojo miestą. */
async function buildMessage(sub: Subscriber) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const today = new Date().toISOString().slice(0, 10);

  if (!sub.city) {
    return {
      title: "Kainos atnaujintos!",
      body: "Šiandienos degalų kainos jau programėlėje – pasižiūrėk, kur pigiausia.",
    };
  }

  const { data: stations } = await supabaseAdmin
    .from("stations")
    .select("id, brand, address")
    .eq("city", sub.city)
    .limit(200);

  const ids = (stations ?? []).map((s) => s.id);
  if (ids.length === 0) {
    return {
      title: "Kainos atnaujintos!",
      body: `Šiandienos degalų kainos jau programėlėje (${sub.city}).`,
    };
  }

  const { data: prices } = await supabaseAdmin
    .from("station_prices")
    .select("station_id, fuel_type, price")
    .eq("price_date", today)
    .in("station_id", ids)
    .in("fuel_type", ["diesel", "p95"]);

  const byStation = new Map<string, { diesel?: number; p95?: number }>();
  for (const p of prices ?? []) {
    const bucket = byStation.get(p.station_id) ?? {};
    if (p.fuel_type === "diesel") bucket.diesel = Number(p.price);
    if (p.fuel_type === "p95") bucket.p95 = Number(p.price);
    byStation.set(p.station_id, bucket);
  }

  // Pigiausia dyzelino degalinė mieste – artimiausios pakaitalas, kol
  // neturime naudotojo koordinačių serverio pusėje.
  let best: { name: string; diesel?: number; p95?: number } | null = null;
  for (const s of stations ?? []) {
    const b = byStation.get(s.id);
    if (!b || b.diesel === undefined) continue;
    if (!best || (best.diesel ?? Infinity) > b.diesel) {
      best = { name: `${s.brand}, ${s.address}`, diesel: b.diesel, p95: b.p95 };
    }
  }

  if (!best) {
    return {
      title: "Kainos atnaujintos!",
      body: `Šiandienos degalų kainos jau programėlėje (${sub.city}).`,
    };
  }

  return {
    title: "Kainos atnaujintos!",
    body: `Pigiausioje degalinėje (${best.name}): dyzelinas ${priceText(best.diesel)}, 95 benzinas ${priceText(best.p95)}.`,
  };
}

export async function sendPriceUpdateNotifications() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: subs } = await supabaseAdmin
    .from("push_subscribers")
    .select("token, city, fuel")
    .limit(2000);

  const list = (subs ?? []) as Subscriber[];
  if (list.length === 0) return { sent: 0, skipped: 0 };

  const lovableKey = process.env["LOVABLE_API_KEY"];
  const fcmKey = process.env["FIREBASE_MESSAGING_API_KEY"];
  if (!lovableKey || !fcmKey) {
    console.warn(
      `Pranešimai nesiųsti – nesukonfigūruotas Firebase Cloud Messaging (${list.length} prenumeratorių).`,
    );
    return { sent: 0, skipped: list.length };
  }

  let sent = 0;
  const cache = new Map<string, { title: string; body: string }>();
  for (const sub of list) {
    const cacheKey = sub.city ?? "";
    let message = cache.get(cacheKey);
    if (!message) {
      message = await buildMessage(sub);
      cache.set(cacheKey, message);
    }
    const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": fcmKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: { token: sub.token, notification: message, data: { path: "/" } },
      }),
    });
    if (res.ok) {
      sent += 1;
    } else {
      const text = await res.text();
      console.error(`Pranešimo siuntimas nepavyko [${res.status}]: ${text}`);
      if (res.status === 404 || res.status === 400) {
        await supabaseAdmin.from("push_subscribers").delete().eq("token", sub.token);
      }
    }
  }
  return { sent, skipped: list.length - sent };
}
