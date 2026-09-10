import { Link } from "@tanstack/react-router";

import { APP_NAME, LEGAL_UPDATED, type LegalDoc } from "@/data/legal";

/** Bendras teisinio turinio atvaizdavimas – turinys redaguojamas src/data/legal.ts. */
export function LegalDocView({ doc }: { doc: LegalDoc }) {
  const updated = new Date(LEGAL_UPDATED).toLocaleDateString("lt-LT", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-frost font-sans text-ice antialiased">
      <div className="pointer-events-none absolute -left-24 top-[-8%] h-[440px] w-[440px] rounded-full bg-mint/20 blur-[120px]" />

      <div className="relative mx-auto max-w-md px-4 pb-16 pt-6">
        <Link to="/apie" className="text-[12px] text-ice/60 underline">
          ← Atgal į „Apie programą“
        </Link>

        <h1 className="mt-4 text-xl font-semibold tracking-tight">{doc.title}</h1>
        <p className="mt-1 text-[11px] text-ice/50">
          {APP_NAME} · atnaujinta {updated}
        </p>
        <p className="mt-3 text-sm text-ice/70">{doc.intro}</p>

        <div className="mt-5 space-y-4">
          {doc.sections.map((s) => (
            <section key={s.title} className="rounded-2xl bg-ice/5 p-4 ring-1 ring-ice/15">
              <h2 className="text-sm font-semibold">{s.title}</h2>
              {s.paragraphs?.map((p) => (
                <p key={p} className="mt-2 text-[13px] leading-relaxed text-ice/70">
                  {p}
                </p>
              ))}
              {s.bullets && (
                <ul className="mt-2 space-y-1.5">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex gap-2 text-[13px] leading-relaxed text-ice/70">
                      <span className="text-mint">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <p className="mt-6 text-center text-[11px] text-ice/40">
          Paskutinį kartą atnaujinta {updated}
        </p>
      </div>
    </div>
  );
}
