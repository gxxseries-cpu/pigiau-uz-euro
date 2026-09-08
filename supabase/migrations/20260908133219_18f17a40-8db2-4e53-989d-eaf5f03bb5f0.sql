CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION pg_net;
CREATE EXTENSION pg_net SCHEMA extensions;

SELECT cron.unschedule('ena-daily-prices');
SELECT cron.schedule(
  'ena-daily-prices',
  '30 7 * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://project--6c2452af-e16c-4667-b8c6-119d6a3bca0f.lovable.app/api/public/cron/ena-prices',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ff13090ba93ca240b85ba4e54af9c1fec76d6014f5bbe482b8bf4fa648b4676e"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);