import { useEffect, useState } from "react";

import { currentPushState, enablePush, type PushState } from "@/lib/push";

type LocState = "nepalaikoma" | "nepaklausta" | "leista" | "atmesta";

const LOC_LABEL: Record<LocState, string> = {
  nepalaikoma: "Nepalaikoma šiame įrenginyje",
  nepaklausta: "Dar nepaprašyta",
  leista: "Leista",
  atmesta: "Neleista",
};

const PUSH_LABEL: Record<PushState, string> = {
  nepalaikoma: "Nepalaikoma šiame įrenginyje",
  nepaklausta: "Dar nepaprašyta",
  leista: "Leista",
  atmesta: "Neleista",
};

function StatusRow({
  title,
  why,
  state,
  ok,
}: {
  title: string;
  why: string;
  state: string;
  ok: boolean;
}) {
  return (
    <div className="mt-3 rounded-xl bg-ice/5 p-3 ring-1 ring-ice/10">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        <span
          className={
            ok
              ? "rounded-md bg-mint/15 px-2 py-0.5 text-[11px] font-medium text-mint ring-1 ring-mint/30"
              : "rounded-md bg-ice/5 px-2 py-0.5 text-[11px] text-ice/60 ring-1 ring-ice/15"
          }
        >
          {state}
        </span>
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-ice/60">{why}</p>
    </div>
  );
}

/** Leidimų būsena ir paaiškinimai – naudotojas mato, kas leista, ir kur tai pakeisti. */
export function PermissionsPanel() {
  const [loc, setLoc] = useState<LocState>("nepaklausta");
  const [push, setPush] = useState<PushState>("nepaklausta");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setPush(currentPushState());
    if (!("geolocation" in navigator)) {
      setLoc("nepalaikoma");
      return;
    }
    if (!navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((p) => {
        const map = { granted: "leista", denied: "atmesta", prompt: "nepaklausta" } as const;
        setLoc(map[p.state]);
      })
      .catch(() => undefined);
  }, []);

  const askPush = async () => {
    const next = await enablePush("Vilnius", "diesel");
    setPush(next);
    if (next === "atmesta") {
      setNote("Pranešimai neleisti. Įjungti galima telefono arba naršyklės nustatymuose.");
    } else if (next === "leista") {
      setNote("Pranešimai įjungti.");
    } else {
      setNote("Peržiūros lange leidimo paprašyti negalima – atidaryk programėlę atskirai.");
    }
  };

  const askLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      () => setLoc("leista"),
      () => setLoc("atmesta"),
      { timeout: 8000 },
    );
  };

  return (
    <section className="mt-4 rounded-2xl bg-ice/5 p-4 ring-1 ring-ice/15">
      <p className="text-sm font-semibold">Leidimai</p>
      <p className="mt-1 text-[12px] text-ice/60">
        Programėlė leidimų pati atšaukti negali – juos pakeisti gali telefono arba naršyklės
        nustatymuose: Nustatymai → Programėlės → Pigiausi Degalai → Leidimai.
      </p>

      <StatusRow
        title="Lokacija"
        why="Naudojama tik tavo miestui nustatyti ir artimiausioms degalinėms surikiuoti. Koordinatės nesaugomos serveryje."
        state={LOC_LABEL[loc]}
        ok={loc === "leista"}
      />
      <StatusRow
        title="Pranešimai"
        why="Naudojami tik tam, kad praneštume, kai atsinaujina kuro kainos. Galima išjungti bet kada."
        state={PUSH_LABEL[push]}
        ok={push === "leista"}
      />

      {note && <p className="mt-3 text-[11px] text-mint">{note}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {loc !== "leista" && loc !== "nepalaikoma" && (
          <button
            onClick={askLocation}
            className="rounded-xl bg-ice/5 px-3 py-2 text-[12px] text-ice/80 ring-1 ring-ice/15"
          >
            Leisti lokaciją
          </button>
        )}
        {push !== "leista" && push !== "nepalaikoma" && (
          <button
            onClick={askPush}
            className="rounded-xl bg-ice/5 px-3 py-2 text-[12px] text-ice/80 ring-1 ring-ice/15"
          >
            Leisti pranešimus
          </button>
        )}
        <a
          href="app-settings:"
          onClick={(e) => {
            e.preventDefault();
            setNote(
              "Leidimus keisk telefono nustatymuose: Nustatymai → Programėlės → Pigiausi Degalai → Leidimai. Naršyklėje – paspausk užrakto ikoną adreso juostoje.",
            );
          }}
          className="rounded-xl bg-mint px-3 py-2 text-[12px] font-semibold text-frost"
        >
          Atidaryti nustatymus
        </a>
      </div>
    </section>
  );
}
