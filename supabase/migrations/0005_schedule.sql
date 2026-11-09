create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'weekly-posts',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := '__PROJECT_URL__/functions/v1/weekly',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '__CRON_SECRET__'),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
