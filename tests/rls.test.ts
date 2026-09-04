import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('RLS isolation', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const anon = createClient(SUPABASE_URL, ANON_KEY);

  beforeAll(async () => {
    await admin.from('organizations').upsert({ id: 'demo-org', name: 'Demo Org' });
    await admin.from('organizations').upsert({ id: 'other-org', name: 'Other Org' });
    await admin.from('projects').upsert({ id: 'demo-project', organization_id: 'demo-org' });
    await admin.from('projects').upsert({ id: 'other-project', organization_id: 'other-org' });
    await admin.from('datasets').upsert({ id: 'demo-dataset', project_id: 'demo-project' });
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
