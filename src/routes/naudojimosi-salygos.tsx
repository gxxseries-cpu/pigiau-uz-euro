import { createFileRoute } from "@tanstack/react-router";

import { LegalDocView } from "@/components/LegalDocView";
import { TERMS_OF_USE } from "@/data/legal";

const TITLE = "Naudojimosi sąlygos – Pigiausi Degalai";
const DESC =
  "Kainų informacija orientacinė, indikatorius – prielaida, nuolaidų sąlygas tikrink degalinėse. Programėlės naudojimosi sąlygos.";

export const Route = createFileRoute("/naudojimosi-salygos")({
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
  component: () => <LegalDocView doc={TERMS_OF_USE} />,
});
