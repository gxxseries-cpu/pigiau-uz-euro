CREATE TABLE public.push_subscribers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'web',
  city text,
  fuel text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.push_subscribers TO anon;
GRANT INSERT ON public.push_subscribers TO authenticated;
GRANT ALL ON public.push_subscribers TO service_role;

ALTER TABLE public.push_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subscribers_public_insert ON public.push_subscribers
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TRIGGER push_subscribers_updated_at
  BEFORE UPDATE ON public.push_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();