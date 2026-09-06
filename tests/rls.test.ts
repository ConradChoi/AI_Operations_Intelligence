import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('RLS isolation', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const anon = createClient(SUPABASE_URL, ANON_KEY);

  beforeAll(async () => {
    // demo-org/demo-project/demo-dataset are the REAL seeded demo rows the live demo depends
    // on. Create them only if missing (ignoreDuplicates -> ON CONFLICT DO NOTHING) so this
    // test never overwrites the seeded org name / project period with its own placeholders,
    // and never deletes them in afterAll either.
    await admin
      .from('organizations')
      .upsert({ id: 'demo-org', name: 'Demo Org' }, { ignoreDuplicates: true });
    await admin
      .from('projects')
      .upsert({ id: 'demo-project', organization_id: 'demo-org' }, { ignoreDuplicates: true });
    await admin
      .from('datasets')
      .upsert({ id: 'demo-dataset', project_id: 'demo-project' }, { ignoreDuplicates: true });

    // The other-* rows below are this test's own fixtures and are removed in afterAll.
    await admin.from('organizations').upsert({ id: 'other-org', name: 'Other Org' });
    await admin.from('projects').upsert({ id: 'other-project', organization_id: 'other-org' });
    await admin.from('datasets').upsert({ id: 'other-dataset', project_id: 'other-project' });
    await admin.from('spend_transactions').upsert({
      id: 'tx_rls_demo',
      dataset_id: 'demo-dataset',
      project_id: 'demo-project',
      organization_id: 'demo-org',
      transaction_date: '2026-01-05',
      vendor_raw: 'Test Vendor',
      amount: 1000,
    });
    await admin.from('spend_transactions').upsert({
      id: 'tx_rls_other',
      dataset_id: 'other-dataset',
      project_id: 'other-project',
      organization_id: 'other-org',
      transaction_date: '2026-01-05',
      vendor_raw: 'Other Vendor',
      amount: 1000,
    });
  });

  // Every row created (or possibly created) by this file is removed again, so the live hosted
  // demo database is left exactly as it was found. Deleted child-first to respect the FK
  // chain organizations <- projects <- datasets <- spend_transactions.
  //
  // Deliberately NOT deleted: demo-org, demo-project, demo-dataset — those are the real seeded
  // demo rows that seed-demo.ts, tests/idempotency.test.ts and the live demo pages all use.
  afterAll(async () => {
    // tx_rls_hack is only reachable if the anon-insert RLS policy regressed; delete
    // defensively so a failing run cannot leave a forged row behind in demo-project.
    await admin
      .from('spend_transactions')
      .delete()
      .in('id', ['tx_rls_demo', 'tx_rls_other', 'tx_rls_hack']);
    await admin.from('datasets').delete().eq('id', 'other-dataset');
    await admin.from('projects').delete().eq('id', 'other-project');
    await admin.from('organizations').delete().eq('id', 'other-org');
  });

  it('anon can read demo-org transactions', async () => {
    const { data, error } = await anon
      .from('spend_transactions')
      .select('id')
      .eq('id', 'tx_rls_demo');
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it('anon cannot read other-org transactions', async () => {
    const { data, error } = await anon
      .from('spend_transactions')
      .select('id')
      .eq('id', 'tx_rls_other');
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('anon cannot insert transactions', async () => {
    const { error } = await anon.from('spend_transactions').insert({
      id: 'tx_rls_hack',
      dataset_id: 'demo-dataset',
      project_id: 'demo-project',
      organization_id: 'demo-org',
      transaction_date: '2026-01-05',
      vendor_raw: 'Hacked',
      amount: 1,
    });
    expect(error).not.toBeNull();
  });
});
