/**
 * Native programėlės (Capacitor) apdaila: tamsi būsenos juosta, paleidimo
 * ekrano paslėpimas ir „programos", o ne naršyklės, jausmas.
 * Naršyklėje šios funkcijos tyliai nieko nedaro.
 */
export async function initNativeShell() {
  if (typeof window === "undefined") return;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;

    document.documentElement.classList.add("native-app");

    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
    await StatusBar.setBackgroundColor({ color: "#0b1120" }).catch(() => undefined);

    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide().catch(() => undefined);
  } catch {
    // Capacitor nepasiekiamas – veikiame kaip įprasta svetainė.
  }
}
