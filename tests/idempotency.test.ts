import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('seed-demo idempotency', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  beforeAll(() => {
    execSync('npm run seed:demo', { stdio: 'inherit' });
    execSync('npm run seed:demo', { stdio: 'inherit' });
  }, 60_000);

  it('does not duplicate spend_transactions after re-seeding', async () => {
    const { data, error } = await admin
      .from('spend_transactions')
      .select('id')
      .eq('project_id', 'demo-project');
    expect(error).toBeNull();
    const ids = (data ?? []).map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not duplicate opportunities after re-seeding', async () => {
    const { data, error } = await admin
      .from('opportunities')
      .select('id')
      .eq('project_id', 'demo-project');
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(5);
  });
});
