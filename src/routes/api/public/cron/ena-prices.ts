import { createFileRoute } from "@tanstack/react-router";

async function authorize(request: Request) {
  const expected = process.env["ENA_CRON_TOKEN"];
  if (!expected) return new Response("Server configuration error", { status: 500 });
  const token = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token || token !== expected) return new Response("Unauthorized", { status: 401 });
  return null;
}

export const Route = createFileRoute("/api/public/cron/ena-prices")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authorize(request);
        if (denied) return denied;

        try {
          const { runDailyImport } = await import("@/lib/ena-import.server");
          // runDailyImport pati apdoroja klaidas ir įrašo būseną – atsakymas visada 200.
          return Response.json(await runDailyImport());
        } catch (err) {
          console.error("ENA importo klaida:", err);
          return Response.json(
            {
              status: "klaida",
              message: err instanceof Error ? err.message : "Nežinoma klaida.",
              stations: 0,
              prices: 0,
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
