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
    // Slepiame naršyklės pojūtį: jokio zoom, jokio teksto perdidinimo.
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    backgroundColor: "#0b1120",
    contentInset: "always",
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#0b1120",
      launchAutoHide: true,
      launchShowDuration: 900,
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0b1120",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
