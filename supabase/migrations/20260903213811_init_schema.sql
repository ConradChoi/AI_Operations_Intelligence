create table organizations (
  id text primary key,
  name text not null,
  industry text,
  created_at timestamptz not null default now()
);

create table projects (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  product_type text not null default 'spend',
  period_from date,
  period_to date,
  created_at timestamptz not null default now()
);

create table datasets (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  filename text,
  schema_type text not null default 'spend',
  quality_score int,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table spend_transactions (
  id text primary key,
  dataset_id text not null references datasets(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  organization_id text not null references organizations(id) on delete cascade,
  transaction_date date not null,
  vendor_raw text not null,
  vendor_normalized text,
  amount numeric not null,
  currency text not null default 'KRW',
  category text,
  recurring_flag boolean,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references projects(id) on delete cascade,
  organization_id text not null references organizations(id) on delete cascade,
  type text not null,
  title text not null,
  evidence_json jsonb,
  impact_type text,
  estimated_value numeric,
  confidence int,
  effort text,
  priority numeric,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index idx_spend_transactions_project on spend_transactions(project_id);
create index idx_spend_transactions_vendor on spend_transactions(vendor_normalized);
create index idx_opportunities_project on opportunities(project_id);
