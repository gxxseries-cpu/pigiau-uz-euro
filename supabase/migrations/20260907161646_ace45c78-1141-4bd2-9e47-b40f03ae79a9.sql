CREATE TABLE public.stations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  area TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (address, brand)
);

CREATE TABLE public.station_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('diesel','p95','p98','lpg','marked_diesel')),
  price NUMERIC(6,3) NOT NULL CHECK (price > 0),
  price_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (station_id, fuel_type, price_date)
);

CREATE INDEX station_prices_date_idx ON public.station_prices (price_date DESC);
CREATE INDEX stations_city_idx ON public.stations (city);

CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.stations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stations TO authenticated;
GRANT ALL ON public.stations TO service_role;

GRANT SELECT ON public.station_prices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.station_prices TO authenticated;
GRANT ALL ON public.station_prices TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "stations_public_read" ON public.stations FOR SELECT USING (true);
CREATE POLICY "stations_admin_write" ON public.stations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "prices_public_read" ON public.station_prices FOR SELECT USING (true);
CREATE POLICY "prices_admin_write" ON public.station_prices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "roles_read_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

INSERT INTO public.stations (brand, area, address, city, lat, lon) VALUES
  ('Viada', 'Palemonas', 'Palemono g. 171, Kaunas', 'Kaunas', 54.9068, 24.0248),
  ('Circle K', 'Centras', 'K. Donelaičio g. 62, Kaunas', 'Kaunas', 54.8985, 23.9130),
  ('Neste', 'Šilainiai', 'Baltų pr. 89, Kaunas', 'Kaunas', 54.9382, 23.8788),
  ('Emsi', 'Petrašiūnai', 'R. Kalantos g. 12, Kaunas', 'Kaunas', 54.8720, 23.9999),
  ('Orlen', 'Aleksotas', 'Veiverių g. 134, Kaunas', 'Kaunas', 54.8790, 23.8770),
  ('Emsi', 'Naujoji Vilnia', 'Pramonės g. 141, Vilnius', 'Vilnius', 54.6710, 25.3450),
  ('Viada', 'Žirmūnai', 'Liepkalnio g. 18, Vilnius', 'Vilnius', 54.6690, 25.2960),
  ('Circle K', 'Pilaitė', 'Ukmergės g. 244, Vilnius', 'Vilnius', 54.7259, 25.2050),
  ('Neste', 'Antakalnis', 'Antakalnio g. 128, Vilnius', 'Vilnius', 54.7180, 25.3200),
  ('Orlen', 'Lazdynai', 'Laisvės pr. 121, Vilnius', 'Vilnius', 54.6870, 25.1950),
  ('Emsi', 'Debrecenas', 'Taikos pr. 88, Klaipėda', 'Klaipėda', 55.6800, 21.1600),
  ('Circle K', 'Smeltė', 'Šilutės pl. 24, Klaipėda', 'Klaipėda', 55.6650, 21.1700),
  ('Neste', 'Centras', 'Šilutės pl. 2, Klaipėda', 'Klaipėda', 55.7000, 21.1400),
  ('Viada', 'Centras', 'Aido g. 8, Šiauliai', 'Šiauliai', 55.9200, 23.3200),
  ('Emsi', 'Pramonės rajonas', 'Pramonės g. 4, Panevėžys', 'Panevėžys', 55.7300, 24.3600);

WITH base(address, fuel_type, price) AS (
  VALUES
    ('Palemono g. 171, Kaunas', 'diesel', 1.999), ('Palemono g. 171, Kaunas', 'p95', 2.039), ('Palemono g. 171, Kaunas', 'lpg', 0.929), ('Palemono g. 171, Kaunas', 'marked_diesel', 1.649),
    ('K. Donelaičio g. 62, Kaunas', 'diesel', 2.059), ('K. Donelaičio g. 62, Kaunas', 'p95', 2.099), ('K. Donelaičio g. 62, Kaunas', 'p98', 2.219),
    ('Baltų pr. 89, Kaunas', 'diesel', 2.039), ('Baltų pr. 89, Kaunas', 'p95', 2.079), ('Baltų pr. 89, Kaunas', 'lpg', 0.949),
    ('R. Kalantos g. 12, Kaunas', 'diesel', 2.019), ('R. Kalantos g. 12, Kaunas', 'p95', 2.069), ('R. Kalantos g. 12, Kaunas', 'marked_diesel', 1.669),
    ('Veiverių g. 134, Kaunas', 'diesel', 2.049), ('Veiverių g. 134, Kaunas', 'p95', 2.089), ('Veiverių g. 134, Kaunas', 'p98', 2.229), ('Veiverių g. 134, Kaunas', 'lpg', 0.959),
    ('Pramonės g. 141, Vilnius', 'diesel', 2.029), ('Pramonės g. 141, Vilnius', 'p95', 2.069), ('Pramonės g. 141, Vilnius', 'lpg', 0.939), ('Pramonės g. 141, Vilnius', 'marked_diesel', 1.659),
    ('Liepkalnio g. 18, Vilnius', 'diesel', 2.049), ('Liepkalnio g. 18, Vilnius', 'p95', 2.089), ('Liepkalnio g. 18, Vilnius', 'lpg', 0.955),
    ('Ukmergės g. 244, Vilnius', 'diesel', 2.069), ('Ukmergės g. 244, Vilnius', 'p95', 2.109), ('Ukmergės g. 244, Vilnius', 'p98', 2.239),
    ('Antakalnio g. 128, Vilnius', 'diesel', 2.059), ('Antakalnio g. 128, Vilnius', 'p95', 2.099), ('Antakalnio g. 128, Vilnius', 'p98', 2.229),
    ('Laisvės pr. 121, Vilnius', 'diesel', 2.055), ('Laisvės pr. 121, Vilnius', 'p95', 2.095), ('Laisvės pr. 121, Vilnius', 'lpg', 0.965),
    ('Taikos pr. 88, Klaipėda', 'diesel', 2.019), ('Taikos pr. 88, Klaipėda', 'p95', 2.059), ('Taikos pr. 88, Klaipėda', 'lpg', 0.935),
    ('Šilutės pl. 24, Klaipėda', 'diesel', 2.065), ('Šilutės pl. 24, Klaipėda', 'p95', 2.105), ('Šilutės pl. 24, Klaipėda', 'p98', 2.225),
    ('Šilutės pl. 2, Klaipėda', 'diesel', 2.045), ('Šilutės pl. 2, Klaipėda', 'p95', 2.085),
    ('Aido g. 8, Šiauliai', 'diesel', 2.035), ('Aido g. 8, Šiauliai', 'p95', 2.075), ('Aido g. 8, Šiauliai', 'lpg', 0.945),
    ('Pramonės g. 4, Panevėžys', 'diesel', 2.025), ('Pramonės g. 4, Panevėžys', 'p95', 2.065), ('Pramonės g. 4, Panevėžys', 'marked_diesel', 1.665)
)
INSERT INTO public.station_prices (station_id, fuel_type, price, price_date, updated_at)
SELECT s.id, b.fuel_type, ROUND((b.price - d * 0.004)::numeric, 3), CURRENT_DATE - d,
       (CURRENT_DATE - d)::timestamptz + interval '10 hours 24 minutes'
FROM base b
JOIN public.stations s ON s.address = b.address
CROSS JOIN generate_series(0, 6) AS d;