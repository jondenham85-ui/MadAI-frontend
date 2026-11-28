-- MADSI Facebook Page integration. Access tokens are AES-GCM encrypted by the Worker.
create table if not exists public.madsi_facebook_oauth_states (
  state_hash text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists madsi_facebook_oauth_states_expires_idx on public.madsi_facebook_oauth_states (expires_at);

create table if not exists public.madsi_facebook_connections (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  page_id text not null,
  page_name text not null,
  page_access_token_ciphertext text not null,
  granted_scopes text[] not null default '{}',
  page_tasks text[] not null default '{}',
  status text not null default 'connected' check (status in ('connected', 'revoked', 'error')),
  token_expires_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists madsi_facebook_connections_page_idx on public.madsi_facebook_connections (page_id);

create table if not exists public.madsi_facebook_publish_approvals (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 5000),
  status text not null default 'approved' check (status in ('approved', 'consumed', 'expired')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists madsi_facebook_publish_approvals_owner_idx on public.madsi_facebook_publish_approvals (owner_user_id, created_at desc);

alter table public.madsi_facebook_oauth_states enable row level security;
alter table public.madsi_facebook_connections enable row level security;
alter table public.madsi_facebook_publish_approvals enable row level security;
revoke all on public.madsi_facebook_oauth_states from anon, authenticated;
revoke all on public.madsi_facebook_connections from anon, authenticated;
revoke all on public.madsi_facebook_publish_approvals from anon, authenticated;
grant all on public.madsi_facebook_oauth_states to service_role;
grant all on public.madsi_facebook_connections to service_role;
grant all on public.madsi_facebook_publish_approvals to service_role;
