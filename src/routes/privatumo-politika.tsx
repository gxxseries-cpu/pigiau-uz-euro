import { createFileRoute } from "@tanstack/react-router";

import { LegalDocView } from "@/components/LegalDocView";
import { PRIVACY_POLICY } from "@/data/legal";

const TITLE = "Privatumo politika – Pigiausi Degalai";
const DESC =
  "Kokius duomenis naudoja degalų kainų programėlė: lokacija, pranešimų raktas, saugojimo laikas ir kaip atsisakyti.";

export const Route = createFileRoute("/privatumo-politika")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <LegalDocView doc={PRIVACY_POLICY} />,
});
