-- Staging inbox mirrors the production Supabase webhook event table.
create table if not exists public.madsi_facebook_webhook_events (
 event_hash text primary key, page_id text not null, field text not null, event_time bigint,
 event_metadata jsonb not null default '{}'::jsonb,
 status text not null default 'pending' check (status in ('pending','processing','processed','failed')),
 received_at timestamptz not null default now(), claimed_at timestamptz, processed_at timestamptz,
 attempts integer not null default 0 check (attempts >= 0), last_error text
);
create index if not exists madsi_facebook_webhook_events_pending_idx on public.madsi_facebook_webhook_events (received_at) where status in ('pending','failed');
create index if not exists madsi_facebook_webhook_events_page_idx on public.madsi_facebook_webhook_events (page_id, received_at desc);
DO $access$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'madsi_staging') THEN
  GRANT USAGE ON SCHEMA public TO madsi_staging;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.madsi_facebook_webhook_events TO madsi_staging;
  DROP POLICY IF EXISTS madsi_staging_backend_access ON public.madsi_facebook_webhook_events;
  ALTER TABLE public.madsi_facebook_webhook_events ENABLE ROW LEVEL SECURITY;
  CREATE POLICY madsi_staging_backend_access ON public.madsi_facebook_webhook_events FOR ALL TO madsi_staging USING (true) WITH CHECK (true);
 END IF;
END $access$;
