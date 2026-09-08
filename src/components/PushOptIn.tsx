import { useEffect, useState } from "react";

import { currentPushState, enablePush, type PushState } from "@/lib/push";

const DISMISS_KEY = "degalai-push-dismissed";

/** Pirmą kartą atidarius programėlę pasiūlome pranešimus apie atsinaujinusias kainas. */
export function PushOptIn({ city, fuel }: { city: string; fuel: string }) {
  const [state, setState] = useState<PushState | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setState(currentPushState());
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (state === null || dismissed || state === "leista" || state === "nepalaikoma") return null;

  const close = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const allow = async () => {
    const next = await enablePush(city, fuel);
    setState(next);
    if (next === "leista") {
      setNote("Pranešimai įjungti – parašysime, kai atsinaujins kainos.");
      setTimeout(close, 1800);
    } else if (next === "atmesta") {
      setNote("Pranešimai neleisti. Įjungti galima naršyklės svetainės nustatymuose.");
    } else {
      setNote("Peržiūros lange leidimo paprašyti negalima – atidaryk programėlę atskirame skirtuke.");
    }
  };

  return (
    <section className="mt-4 rounded-2xl bg-mint/10 p-4 ring-1 ring-mint/30">
      <p className="text-sm font-semibold">Pranešimai apie kainas</p>
      <p className="mt-1 text-[12px] text-ice/70">
        Norime pranešti, kai atsinaujina kuro kainos jūsų mieste – iškart matysite artimiausios
        degalinės dyzelino ir 95 benzino kainą.
      </p>
      {note && <p className="mt-2 text-[11px] text-mint">{note}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={allow}
          className="flex-1 rounded-xl bg-mint py-2.5 text-sm font-semibold text-frost"
        >
          Leisti pranešimus
        </button>
        <button
          onClick={close}
          className="rounded-xl bg-ice/5 px-4 text-sm text-ice/70 ring-1 ring-ice/10"
        >
          Ne dabar
        </button>
      </div>
    </section>
  );
}
