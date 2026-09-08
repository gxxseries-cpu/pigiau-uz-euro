/**
 * Pranešimų (push) prenumeratos registravimas naršyklėje.
 *
 * KONFIGURACIJA: tikram mobiliam push sluoksniui reikia Capacitor + Firebase
 * Cloud Messaging (arba OneSignal). Kai bus paruošta native aplikacija:
 *   1. Prijunk Firebase Cloud Messaging (raktai laikomi projekto nustatymuose,
 *      NE kode): web API key, app ID ir VAPID key.
 *   2. Naršyklei – `getToken(messaging, { vapidKey })`, Capacitor Android/iOS –
 *      `PushNotifications.register()`; abiem atvejais gautą įrenginio raktą
 *      perduok į `registerPushSubscriber({ token, city, fuel })`.
 *   3. Serveris (kasdienis importas) siunčia pranešimus visiems raktams –
 *      žr. `src/lib/push.server.ts`.
 * Kol raktų nėra, saugomas lokalus įrenginio identifikatorius, kad kasdienis
 * pranešimų siuntimas jau turėtų prenumeratorių sąrašą.
 */
import { supabase } from "@/integrations/supabase/client";

export type PushState = "nepalaikoma" | "nepaklausta" | "leista" | "atmesta";

const DEVICE_KEY = "degalai-push-device";

function deviceToken() {
  let token = localStorage.getItem(DEVICE_KEY);
  if (!token) {
    token = `web-${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_KEY, token);
  }
  return token;
}

export function currentPushState(): PushState {
  if (typeof window === "undefined" || !("Notification" in window)) return "nepalaikoma";
  if (Notification.permission === "granted") return "leista";
  if (Notification.permission === "denied") return "atmesta";
  return "nepaklausta";
}

/** Įrašo įrenginį į prenumeratorių sąrašą (miestas ir kuras – pranešimo turiniui). */
export async function registerPushSubscriber(city: string, fuel: string) {
  const { error } = await supabase
    .from("push_subscribers")
    .insert({ token: deviceToken(), platform: "web", city, fuel });
  // Pakartotinis registravimas (unikalus token) – normalu, klaidos nerodome.
  if (error && !error.message.includes("duplicate")) {
    console.error("Nepavyko išsaugoti pranešimų prenumeratos:", error.message);
  }
}

/** Paklausia leidimo ir, jei leista, užregistruoja įrenginį. */
export async function enablePush(city: string, fuel: string): Promise<PushState> {
  if (currentPushState() === "nepalaikoma") return "nepalaikoma";
  if (window.top !== window.self && Notification.permission !== "granted") {
    // Peržiūros lange (iframe) naršyklė leidimo neprašo – reikia atskiro skirtuko.
    return "nepaklausta";
  }
  const permission =
    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "atmesta" : "nepaklausta";
  await registerPushSubscriber(city, fuel);
  return "leista";
}
