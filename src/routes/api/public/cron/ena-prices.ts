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

        const { runDailyImport } = await import("@/lib/ena-import.server");
        const result = await runDailyImport();
        return Response.json(result, { status: result.status === "sėkmė" ? 200 : 500 });
      },
    },
  },
});
