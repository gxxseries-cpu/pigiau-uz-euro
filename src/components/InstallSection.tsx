import { useEffect, useState } from "react";

import {
  getInstallState,
  promptInstall,
  subscribeInstall,
  type InstallState,
} from "@/lib/install";

const isIos = () =>
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !(window as unknown as { MSStream?: unknown }).MSStream;

/** „Įdiegti programėlę" skiltis – paleidžia sistemos diegimą arba paaiškina rankinius žingsnius. */
export function InstallSection() {
  const [state, setState] = useState<InstallState>("nepalaikoma");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setState(getInstallState());
    return subscribeInstall(() => setState(getInstallState()));
  }, []);

  const install = async () => {
    setBusy(true);
    const ok = await promptInstall();
    setBusy(false);
    if (ok) setDone(true);
  };

  if (state === "idiegta") {
    return (
      <section className="mt-4 rounded-2xl bg-mint/10 p-4 ring-1 ring-mint/30">
        <p className="text-sm font-semibold text-mint">Programėlė įdiegta ✓</p>
        <p className="mt-1 text-[12px] text-ice/70">
          Ji atsidaro be naršyklės, iš pagrindinio ekrano piktogramos.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-2xl bg-ice/5 p-4 ring-1 ring-ice/15">
      <p className="text-sm font-semibold">Įdiegti į telefoną</p>
      <p className="mt-1 text-[12px] leading-relaxed text-ice/60">
        Įdiegus programėlę atsiras pagrindinio ekrano piktograma ir atsidarys pilname ekrane, be
        naršyklės juostų. Duomenys atsinaujins automatiškai.
      </p>

      {state === "galima" && (
        <button
          onClick={install}
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-mint px-4 py-3 text-[13px] font-semibold text-frost disabled:opacity-60"
        >
          {busy ? "Diegiama…" : done ? "Įdiegta ✓" : "Įdiegti programėlę"}
        </button>
      )}

      {state === "nepalaikoma" && (
        <div className="mt-3 space-y-2">
          <div className="rounded-xl bg-ice/5 p-3 ring-1 ring-ice/10">
            <p className="text-[12px] font-semibold text-ice/80">
              {isIos() ? "iPhone (Safari)" : "Kompiuteris ar kita naršyklė"}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-ice/60">
              {isIos()
                ? "Atidaryk puslapį per Safari, apačioje paspausk mygtuką „Dalintis“ (kvadratas su strėle į viršų) ir rinkis „Pridėti prie pagrindinio ekrano“."
                : "Atidaryk puslapį per Chrome ir meniu (trys taškai dešinėje viršuje) rinkis „Įdiegti programėlę“ arba „Pridėti prie pagrindinio ekrano“. iPhone naudok Safari → „Dalintis“ → „Pridėti prie pagrindinio ekrano“."}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
