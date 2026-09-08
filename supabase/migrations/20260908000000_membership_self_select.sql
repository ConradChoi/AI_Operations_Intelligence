create policy "users can read their own memberships"
  on memberships for select
  using (user_id = auth.uid());
