alter table organizations enable row level security;
alter table projects enable row level security;
alter table datasets enable row level security;
alter table spend_transactions enable row level security;
alter table opportunities enable row level security;

create policy "demo org readable by anyone"
  on organizations for select
  using (id = 'demo-org');

create policy "demo project readable by anyone"
  on projects for select
  using (organization_id = 'demo-org');

create policy "demo dataset readable by anyone"
  on datasets for select
  using (project_id = 'demo-project');

create policy "demo transactions readable by anyone"
  on spend_transactions for select
  using (organization_id = 'demo-org');

create policy "demo opportunities readable by anyone"
  on opportunities for select
  using (organization_id = 'demo-org');
