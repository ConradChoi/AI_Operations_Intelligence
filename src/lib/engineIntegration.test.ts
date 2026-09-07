import { describe, it, expect } from 'vitest';
import { normalizeVendor } from '../../supabase/functions/run-spend-analysis/lib/normalizeVendor.ts';
import { categorize } from '../../supabase/functions/run-spend-analysis/lib/categorize.ts';
import { detectRecurring } from '../../supabase/functions/run-spend-analysis/lib/detectRecurring.ts';
import { detectDuplicates } from '../../supabase/functions/run-spend-analysis/lib/detectDuplicates.ts';
import { detectPriceChanges } from '../../supabase/functions/run-spend-analysis/lib/detectPriceChanges.ts';
import { scoreAnomalies } from '../../supabase/functions/run-spend-analysis/lib/scoreAnomalies.ts';
import { generateOpportunities } from '../../supabase/functions/run-spend-analysis/lib/generateOpportunities.ts';
import type { SpendTransaction } from '../../supabase/functions/run-spend-analysis/lib/types.ts';

function tx(id: string, date: string, vendorRaw: string, amount: number): SpendTransaction {
  const vendorNormalized = normalizeVendor(vendorRaw);
  return {
    id,
    dataset_id: 'd1',
    project_id: 'p1',
    organization_id: 'o1',
    transaction_date: date,
    vendor_raw: vendorRaw,
    vendor_normalized: vendorNormalized,
    amount,
    currency: 'KRW',
    category: categorize(vendorNormalized),
  };
}

describe('engine reuse from Node (not just Deno)', () => {
  it('runs the full detection pipeline in-process and produces opportunities', () => {
    const transactions: SpendTransaction[] = [
      tx('t1', '2026-01-05', 'AWS Seoul', 1000000),
      tx('t2', '2026-02-05', 'AWS Seoul', 1000000),
      tx('t3', '2026-03-05', 'AWS Seoul', 1000000),
      tx('t4', '2026-03-07', 'AWS Seoul', 1000000),
      tx('t5', '2026-01-10', 'Random Vendor', 10000000),
    ];

    const recurring = detectRecurring(transactions);
    const duplicates = detectDuplicates(transactions);
    const priceChanges = detectPriceChanges(transactions, recurring);
    const anomalies = scoreAnomalies(transactions);
    const opportunities = generateOpportunities({
      projectId: 'p1',
      organizationId: 'o1',
      duplicates,
      priceChanges,
      anomalies,
      recurring,
    });

    expect(transactions[0].vendor_normalized).toBe('AWS');
    expect(transactions[0].category).toBe('Cloud Infrastructure');
    expect(recurring).toHaveLength(1);
    expect(duplicates).toHaveLength(1);
    expect(anomalies.length).toBeGreaterThanOrEqual(1);
    expect(priceChanges).toHaveLength(0);
    expect(opportunities.length).toBeGreaterThan(0);
    expect(opportunities.every((o) => o.project_id === 'p1' && o.organization_id === 'o1')).toBe(true);
  });
});
