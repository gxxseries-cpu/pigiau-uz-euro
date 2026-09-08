import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";

const TITLE = "Prisijungimas – Pigiausi Degalai";
const DESC = "Prisijunk, kad galėtum pildyti degalinių kainas.";

export const Route = createFileRoute("/auth")({
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
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        setMessage("Paskyra sukurta. Jei reikia – patvirtink el. paštą ir prisijunk.");
        setMode("login");
      }
    } catch (err) {
      setMessage(
        err instanceof Error && err.message.includes("Invalid login")
          ? "Neteisingas el. paštas arba slaptažodis."
          : "Nepavyko. Patikrink duomenis ir pabandyk dar kartą.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-frost px-4 font-sans text-ice">
      <div className="w-full max-w-sm rounded-2xl bg-ice/5 p-5 ring-1 ring-ice/15">
        <h1 className="text-lg font-semibold">
          {mode === "login" ? "Prisijungimas" : "Nauja paskyra"}
        </h1>
        <p className="mt-1 text-[12px] text-ice/50">Kainų pildymo skydelis</p>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block text-[11px] text-ice/60">
            El. paštas
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl bg-ice/5 px-3 py-2 text-sm text-ice ring-1 ring-ice/10 outline-none focus:ring-mint/50"
            />
          </label>
          <label className="block text-[11px] text-ice/60">
            Slaptažodis
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl bg-ice/5 px-3 py-2 text-sm text-ice ring-1 ring-ice/10 outline-none focus:ring-mint/50"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-frost disabled:opacity-60"
          >
            {busy ? "Vykdoma…" : mode === "login" ? "Prisijungti" : "Registruotis"}
          </button>
        </form>

        {message && <p className="mt-3 text-[12px] text-ice/70">{message}</p>}

        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 text-[12px] text-mint underline"
        >
          {mode === "login" ? "Neturi paskyros? Registruokis" : "Jau turi paskyrą? Prisijunk"}
        </button>
      </div>
    </div>
  );
}
