import { useEffect, useState } from "react";

/** Rodoma tik vieną kartą per sesiją – kad nekankintų kas kartą atidarius. */
const SPLASH_KEY = "degalai-splash-parodyta";

/**
 * Paleidimo ekranas: logotipas iškyla iš apačios į ekrano centrą,
 * trumpai pabūna ir visas ekranas išblunka, atidengdamas programėlę.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(() => {
    if (typeof sessionStorage === "undefined") return false;
    return !sessionStorage.getItem(SPLASH_KEY);
  });
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    sessionStorage.setItem(SPLASH_KEY, "1");
    // Išblunkimo pradžia po animacijos (~1,6 s), pilnas paslėpimas po perėjimo.
    const fadeTimer = setTimeout(() => setFading(true), 1600);
    const hideTimer = setTimeout(() => setVisible(false), 2200);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-frost transition-opacity duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="splash-rise flex flex-col items-center gap-3">
        <img
          src="/icon-192.png"
          alt=""
          className="h-24 w-24 rounded-3xl shadow-2xl shadow-black/40 ring-1 ring-ice/20"
        />
        <p className="text-lg font-bold tracking-tight text-ice">Pigiausi Degalai</p>
        <p className="text-[12px] text-ice/50">Degalų kainos Lietuvoje</p>
      </div>
    </div>
  );
}
