create table memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

alter table memberships enable row level security;

create policy "members can read their own memberships"
  on memberships for select
  using (user_id = auth.uid());
