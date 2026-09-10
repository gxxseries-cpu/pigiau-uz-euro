import { createFileRoute, Link } from "@tanstack/react-router";

import { InstallSection } from "@/components/InstallSection";
import { PermissionsPanel } from "@/components/PermissionsPanel";
import { APP_NAME, APP_VERSION, CONTACT_EMAIL, LEGAL_UPDATED } from "@/data/legal";

const TITLE = "Apie programą – Pigiausi Degalai";
const DESC =
  "Programėlės versija, privatumo politika, naudojimosi sąlygos, leidimų valdymas ir kontaktinis el. paštas.";

export const Route = createFileRoute("/apie")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const updated = new Date(LEGAL_UPDATED).toLocaleDateString("lt-LT", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-frost font-sans text-ice antialiased">
      <div className="pointer-events-none absolute -left-24 top-[-8%] h-[440px] w-[440px] rounded-full bg-mint/20 blur-[120px]" />

      <div className="relative mx-auto max-w-md px-4 pb-16 pt-6">
        <Link to="/" className="text-[12px] text-ice/60 underline">
          ← Atgal į kainas
        </Link>

        <div className="mt-4 flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-mint/15 text-mint ring-1 ring-mint/30">
            <span className="text-lg font-bold">⛽</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{APP_NAME}</h1>
            <p className="text-[11px] text-ice/50">Versija {APP_VERSION}</p>
          </div>
        </div>

        <section className="mt-4 rounded-2xl bg-ice/5 p-4 ring-1 ring-ice/15">
          <p className="text-sm font-semibold">Apie</p>
          <p className="mt-2 text-[13px] leading-relaxed text-ice/70">
            Programėlė rodo degalų kainas Lietuvoje pagal viešus Lietuvos energetikos agentūros
            (ena.lt) duomenis, padeda rasti pigiausią degalinę netoliese, palyginti tinklus ir
            pasižiūrėti kainų tendenciją. Registracija nereikalinga.
          </p>
        </section>

        <section className="mt-4 rounded-2xl bg-ice/5 p-4 ring-1 ring-ice/15">
          <p className="text-sm font-semibold">Dokumentai</p>
          <div className="mt-3 space-y-2">
            <Link
              to="/privatumo-politika"
              className="flex items-center justify-between rounded-xl bg-ice/5 px-3 py-2.5 text-[13px] ring-1 ring-ice/10"
            >
              <span>Privatumo politika</span>
              <span className="text-ice/40">→</span>
            </Link>
            <Link
              to="/naudojimosi-salygos"
              className="flex items-center justify-between rounded-xl bg-ice/5 px-3 py-2.5 text-[13px] ring-1 ring-ice/10"
            >
              <span>Naudojimosi sąlygos</span>
              <span className="text-ice/40">→</span>
            </Link>
          </div>
          <p className="mt-2 text-[11px] text-ice/40">Atnaujinta {updated}</p>
        </section>

        <PermissionsPanel />

        <section className="mt-4 rounded-2xl bg-ice/5 p-4 ring-1 ring-ice/15">
          <p className="text-sm font-semibold">Atsiliepimai ir klaidos</p>
          <p className="mt-2 text-[13px] text-ice/70">
            Radai netikslumą ar turi idėją? Rašyk:{" "}
            <span className="font-semibold text-mint">{CONTACT_EMAIL}</span>
          </p>
        </section>

        <p className="mt-6 text-center text-[11px] text-ice/40">
          Kainų šaltinis – Lietuvos energetikos agentūra (ena.lt). Kainos orientacinės.
        </p>
      </div>
    </div>
  );
}
