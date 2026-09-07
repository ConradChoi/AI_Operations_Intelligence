create policy "members can read their organization"
  on organizations for select
  using (
    exists (select 1 from memberships m where m.organization_id = organizations.id and m.user_id = auth.uid())
  );

create policy "members can read their projects"
  on projects for select
  using (
    exists (select 1 from memberships m where m.organization_id = projects.organization_id and m.user_id = auth.uid())
  );

create policy "members can read their datasets"
  on datasets for select
  using (
    exists (
      select 1 from memberships m
      join projects p on p.organization_id = m.organization_id
      where p.id = datasets.project_id and m.user_id = auth.uid()
    )
  );

create policy "members can read their spend transactions"
  on spend_transactions for select
  using (
    exists (select 1 from memberships m where m.organization_id = spend_transactions.organization_id and m.user_id = auth.uid())
  );

create policy "members can read their opportunities"
  on opportunities for select
  using (
    exists (select 1 from memberships m where m.organization_id = opportunities.organization_id and m.user_id = auth.uid())
  );
