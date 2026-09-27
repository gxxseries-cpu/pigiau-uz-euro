/**
 * AdMob reklamos (tik native Capacitor programėlėje; naršyklėje nieko nedaro).
 *
 * Realūs ID – aplinkos kintamuosiuose (.env):
 *   VITE_ADMOB_BANNER_ID, VITE_ADMOB_INTERSTITIAL_ID, VITE_ADMOB_TESTING=false
 * Kol jų nėra – naudojami oficialūs Google testiniai ID.
 */

const TEST_BANNER = {
  android: "ca-app-pub-3940256099942544/6300978111",
  ios: "ca-app-pub-3940256099942544/2934735716",
};
const TEST_INTERSTITIAL = {
  android: "ca-app-pub-3940256099942544/1033173712",
  ios: "ca-app-pub-3940256099942544/4411468910",
};

const env = import.meta.env as Record<string, string | undefined>;
const TESTING = env.VITE_ADMOB_TESTING !== "false";

/** Kiek veiksmų (miesto keitimų / „Tendencijos" atidarymų) tarp pilno ekrano reklamų. */
const INTERSTITIAL_EVERY = 4;
/** Minimalus tarpas tarp pilno ekrano reklamų. */
const INTERSTITIAL_MIN_GAP_MS = 3 * 60 * 1000;
/** Po paleidimo pilno ekrano reklamos nerodome. */
const STARTUP_GRACE_MS = 60 * 1000;

/**
 * Būsima „be reklamų" prenumerata. Kol kas visada false.
 * Įgyvendinus Google Play Billing – grąžinti tikrą statusą.
 */
export function isPremiumUser(): boolean {
  return false;
}

let ready: Promise<boolean> | null = null;
let actions = 0;
let lastInterstitial = 0;
const startedAt = Date.now();

async function platform(): Promise<"android" | "ios" | null> {
  if (typeof window === "undefined") return null;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return null;
    const p = Capacitor.getPlatform();
    return p === "ios" ? "ios" : "android";
  } catch {
    return null;
  }
}

/** Inicializacija + GDPR (UMP) sutikimo langas ES vartotojams prieš pirmą reklamą. */
function init(): Promise<boolean> {
  if (ready) return ready;
  ready = (async () => {
    if (isPremiumUser()) return false;
    const p = await platform();
    if (!p) return false;
    try {
      const { AdMob, AdmobConsentStatus } = await import("@capacitor-community/admob");
      await AdMob.initialize({ initializeForTesting: TESTING });
      const info = await AdMob.requestConsentInfo();
      if (
        info.isConsentFormAvailable &&
        info.status === AdmobConsentStatus.REQUIRED
      ) {
        await AdMob.showConsentForm();
      }
      // Jei sutikimas nesuteiktas – SDK pats rodo tik neasmenintas reklamas (UMP/TCF).
      return true;
    } catch {
      return false;
    }
  })();
  return ready;
}

function ids(p: "android" | "ios") {
  return {
    banner: env.VITE_ADMOB_BANNER_ID || TEST_BANNER[p],
    interstitial: env.VITE_ADMOB_INTERSTITIAL_ID || TEST_INTERSTITIAL[p],
  };
}

/** Banner apačioje, virš meniu juostos. Grąžina true, jei parodytas. */
export async function showBanner(): Promise<boolean> {
  if (isPremiumUser() || !(await init())) return false;
  const p = await platform();
  if (!p) return false;
  try {
    const { AdMob, BannerAdPosition, BannerAdSize } = await import(
      "@capacitor-community/admob"
    );
    await AdMob.showBanner({
      adId: ids(p).banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 64, // virš apatinio meniu
      isTesting: TESTING,
    });
    return true;
  } catch {
    return false;
  }
}

export async function hideBanner() {
  if (!(await platform())) return;
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.removeBanner();
  } catch {
    /* nieko */
  }
}

/**
 * Pažymi veiksmą (miesto keitimas, „Tendencijos" atidarymas).
 * Pilno ekrano reklama – tik kas N veiksmų, ne dažniau nei kas 3 min. ir ne iškart po paleidimo.
 */
export async function trackAdAction() {
  if (isPremiumUser()) return;
  actions += 1;
  const now = Date.now();
  if (actions < INTERSTITIAL_EVERY) return;
  if (now - startedAt < STARTUP_GRACE_MS) return;
  if (now - lastInterstitial < INTERSTITIAL_MIN_GAP_MS) return;
  if (!(await init())) return;
  const p = await platform();
  if (!p) return;
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.prepareInterstitial({ adId: ids(p).interstitial, isTesting: TESTING });
    await AdMob.showInterstitial();
    actions = 0;
    lastInterstitial = Date.now();
  } catch {
    /* nepavyko užkrauti – bandysime vėliau */
  }
}
