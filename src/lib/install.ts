/**
 * PWA diegimo valdymas.
 *
 * „beforeinstallprompt" įvykis Chrome/Android naršyklėje leidžia paleisti
 * sistemą diegimo dialogą savo mygtuku. Jį pagauname anksti (modulio lygiu),
 * nes įvykis suveikia vieną kartą pačioje pradžioje ir greitai praeina.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallState =
  | "galima" // mygtukas gali paleisti sistemą diegimo langą
  | "nepalaikoma" // pvz. iOS Safari – rodomos rankinės instrukcijos
  | "idiegta"; // jau atidaryta kaip instaliuota programėlė

let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari instaliuotai programėlei
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function notify() {
  listeners.forEach((cb) => cb());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

export function getInstallState(): InstallState {
  if (typeof window === "undefined") return "nepalaikoma";
  if (isStandalone()) return "idiegta";
  if (deferredPrompt) return "galima";
  return "nepalaikoma";
}

/** Paleidžia sistemos diegimo dialogą. Grąžina, ar naudotojas sutiko įdiegti. */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  try {
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") deferredPrompt = null;
    notify();
    return outcome === "accepted";
  } catch {
    return false;
  }
}

export function subscribeInstall(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
