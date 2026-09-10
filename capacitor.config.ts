import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor konfigūracija „Pigiausi Degalai" native versijai (Google Play / App Store).
 *
 * Programėlė yra serverio pusėje renderinamas puslapis, todėl native apvalkalas
 * krauna publikuotą svetainę (server.url). Pakeitus svetainės adresą – atnaujink čia.
 */
const config: CapacitorConfig = {
  appId: "lt.pigiausidegalai.app",
  appName: "Pigiausi Degalai",
  webDir: "public",
  server: {
    url: "https://pigiau-uz-euro.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#0b1120",
  },
  ios: {
    backgroundColor: "#0b1120",
    contentInset: "always",
  },
};

export default config;
