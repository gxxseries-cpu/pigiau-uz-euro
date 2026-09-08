CREATE TABLE public.market_signal (
  signal_date date PRIMARY KEY,
  brent_usd numeric NOT NULL,
  brent_usd_prev numeric NOT NULL,
  eur_usd numeric NOT NULL,
  eur_usd_prev numeric NOT NULL,
  brent_eur numeric NOT NULL,
  brent_eur_prev numeric NOT NULL,
  brent_change_pct numeric NOT NULL,
  fx_change_pct numeric NOT NULL,
  direction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.market_signal TO anon;
GRANT SELECT ON public.market_signal TO authenticated;
GRANT ALL ON public.market_signal TO service_role;
ALTER TABLE public.market_signal ENABLE ROW LEVEL SECURITY;
CREATE POLICY market_signal_public_read ON public.market_signal FOR SELECT USING (true);