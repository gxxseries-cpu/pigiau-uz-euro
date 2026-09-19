/**
 * Pranešimų (push) registravimas.
 *
 * Du keliai:
 *  1. Native programėlė (Capacitor Android/iOS) – `@capacitor/push-notifications`
 *     gauna tikrą Firebase (FCM) įrenginio raktą, todėl pranešimai ateina su
 *     garsu, kaip bet kurioje kitoje telefono programėlėje.
 *  2. Naršyklė / PWA – Firebase Web SDK (`getToken` su VAPID raktu) ir
 *     `public/firebase-messaging-sw.js` service worker.
 *
 * Raktai laikomi projekto nustatymuose (Firebase Cloud Messaging jungtis),
 * NE kode. Serveris siunčia pranešimus – žr. `src/lib/push.server.ts`.
 */
import { supabase } from "@/integrations/supabase/client";

export type PushState = "nepalaikoma" | "nepaklausta" | "leista" | "atmesta";

const DEVICE_KEY = "degalai-push-device";

const webAppId = import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID"] as
  | string
  | undefined;
const vapidKey = import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY"] as
  | string
  | undefined;

const firebaseConfig = {
  apiKey: import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY"] as
    | string
    | undefined,
  projectId: import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID"] as
    | string
    | undefined,
  appId: webAppId,
  messagingSenderId: webAppId?.split(":")[1] ?? "",
};

function fallbackToken() {
  let token = localStorage.getItem(DEVICE_KEY);
  if (!token) {
    token = `web-${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_KEY, token);
  }
  return token;
}

/** Ar programėlė veikia kaip native programa telefone (ne naršyklėje). */
export async function isNativeApp() {
  if (typeof window === "undefined") return false;
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function currentPushState(): PushState {
  if (typeof window === "undefined") return "nepalaikoma";
  if (!("Notification" in window)) return "nepaklausta"; // native programėlėje Notification gali nebūti
  if (Notification.permission === "granted") return "leista";
  if (Notification.permission === "denied") return "atmesta";
  return "nepaklausta";
}

/** Įrašo įrenginį į prenumeratorių sąrašą (miestas ir kuras – pranešimo turiniui). */
export async function registerPushSubscriber(city: string, fuel: string, token?: string) {
  const { error } = await supabase.from("push_subscribers").insert({
    token: token ?? fallbackToken(),
    platform: token && !token.startsWith("web-") ? "fcm" : "web",
    city,
    fuel,
  });
  // Pakartotinis registravimas (unikalus token) – normalu, klaidos nerodome.
  if (error && !error.message.includes("duplicate")) {
    console.error("Nepavyko išsaugoti pranešimų prenumeratos:", error.message);
  }
}

/** Native (Capacitor) pranešimų registracija – grąžina FCM raktą arba null. */
async function nativeToken(): Promise<string | null> {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  let status = await PushNotifications.checkPermissions();
  if (status.receive === "prompt" || status.receive === "prompt-with-rationale") {
    status = await PushNotifications.requestPermissions();
  }
  if (status.receive !== "granted") return null;

  return await new Promise<string | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), 12000);
    void PushNotifications.addListener("registration", (t) => {
      clearTimeout(timer);
      resolve(t.value);
    });
    void PushNotifications.addListener("registrationError", () => {
      clearTimeout(timer);
      resolve(null);
    });
    void PushNotifications.register();
  });
}

/** Naršyklės (PWA) FCM raktas – grąžina raktą arba null. */
async function webToken(): Promise<string | null> {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !webAppId || !vapidKey) return null;
  const [{ initializeApp, getApps }, { getMessaging, getToken, isSupported }] = await Promise.all([
    import("firebase/app"),
    import("firebase/messaging"),
  ]);
  if (!(await isSupported())) return null;

  const query = new URLSearchParams({
    apiKey: firebaseConfig.apiKey,
    projectId: firebaseConfig.projectId,
    appId: webAppId,
    messagingSenderId: firebaseConfig.messagingSenderId,
  }).toString();
  const registration = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${query}`,
  );
  const app = getApps()[0] ?? initializeApp(firebaseConfig as Record<string, string>);
  const messaging = getMessaging(app);
  return await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration }).catch(
    () => null,
  );
}

/** Paklausia leidimo ir, jei leista, užregistruoja įrenginį tikriems pranešimams. */
export async function enablePush(city: string, fuel: string): Promise<PushState> {
  if (typeof window === "undefined") return "nepalaikoma";

  if (await isNativeApp()) {
    const token = await nativeToken().catch(() => null);
    if (!token) {
      await registerPushSubscriber(city, fuel);
      return "atmesta";
    }
    await registerPushSubscriber(city, fuel, token);
    return "leista";
  }

  if (!("Notification" in window)) return "nepalaikoma";
  if (window.top !== window.self && Notification.permission !== "granted") {
    // Peržiūros lange (iframe) naršyklė leidimo neprašo – reikia atskiro skirtuko.
    return "nepaklausta";
  }
  const permission =
    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "atmesta" : "nepaklausta";

  const token = await webToken().catch(() => null);
  await registerPushSubscriber(city, fuel, token ?? undefined);
  return "leista";
}
