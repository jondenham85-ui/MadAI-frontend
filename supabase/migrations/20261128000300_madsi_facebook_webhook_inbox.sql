-- Durable, deduplicated Facebook webhook inbox. Payload content and credentials are intentionally not stored.
create table if not exists public.madsi_facebook_webhook_events (
 event_hash text primary key, page_id text not null, field text not null, event_time bigint,
 event_metadata jsonb not null default '{}'::jsonb,
 status text not null default 'pending' check (status in ('pending','processing','processed','failed')),
 received_at timestamptz not null default now(), processed_at timestamptz,
 attempts integer not null default 0 check (attempts >= 0), last_error text
);
create index if not exists madsi_facebook_webhook_events_pending_idx on public.madsi_facebook_webhook_events (received_at) where status in ('pending','failed');
create index if not exists madsi_facebook_webhook_events_page_idx on public.madsi_facebook_webhook_events (page_id, received_at desc);
alter table public.madsi_facebook_webhook_events enable row level security;
revoke all on public.madsi_facebook_webhook_events from anon, authenticated;
grant all on public.madsi_facebook_webhook_events to service_role;
