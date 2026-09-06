import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { generateDemoTransactions } from '../scripts/generate-demo-data';

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

    // Asserting uniqueness of `id` alone proves nothing — it is the primary key, so Postgres
    // guarantees it whether or not seeding is idempotent. The real check is that two seed runs
    // leave exactly ONE run's worth of rows behind.
    const expected = generateDemoTransactions('demo-project', 'demo-dataset', 'demo-org');
    expect(expected.length).toBe(84);
    expect(ids.length).toBe(expected.length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not duplicate opportunities after re-seeding', async () => {
    const { data, error } = await admin
      .from('opportunities')
      .select('id, type')
      .eq('project_id', 'demo-project');
    expect(error).toBeNull();
    const rows = data ?? [];

    // Exact count, not `>= 5`: a >= assertion still passes if the pre-insert delete silently
    // failed and opportunities accumulated across runs. A single correct seed run of the
    // 84-transaction demo dataset produces 14 (8 RECURRING_REVIEW, 2 DUPLICATE,
    // 2 PRICE_INCREASE, 2 ANOMALY).
    expect(rows.length).toBe(14);

    // Design doc "Testing Plan": opportunities >= 5 with all four types present, >= 1 each.
    expect(rows.length).toBeGreaterThanOrEqual(5);
    const types = new Set(rows.map((r) => r.type));
    expect(types).toContain('DUPLICATE');
    expect(types).toContain('PRICE_INCREASE');
    expect(types).toContain('ANOMALY');
    expect(types).toContain('RECURRING_REVIEW');
  });
});
