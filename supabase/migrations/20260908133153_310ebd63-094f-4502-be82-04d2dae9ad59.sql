CREATE TABLE public.import_source (
  id boolean NOT NULL PRIMARY KEY DEFAULT true CHECK (id),
  source_url text,
  last_run_at timestamptz,
  last_status text,
  last_message text,
  last_stations integer NOT NULL DEFAULT 0,
  last_prices integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.import_source TO authenticated;
GRANT ALL ON public.import_source TO service_role;

ALTER TABLE public.import_source ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_source_admin_all" ON public.import_source
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER import_source_updated_at
  BEFORE UPDATE ON public.import_source
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.import_source (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'ena-daily-prices',
  '30 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--6c2452af-e16c-4667-b8c6-119d6a3bca0f.lovable.app/api/public/cron/ena-prices',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ff13090ba93ca240b85ba4e54af9c1fec76d6014f5bbe482b8bf4fa648b4676e"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);