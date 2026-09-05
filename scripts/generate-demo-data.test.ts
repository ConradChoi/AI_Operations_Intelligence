import { describe, it, expect } from 'vitest';
import { generateDemoTransactions } from './generate-demo-data';

describe('generateDemoTransactions', () => {
  const txs = generateDemoTransactions('demo-project', 'demo-dataset', 'demo-org');

  it('generates at least 80 transactions across at least 14 vendors', () => {
    expect(txs.length).toBeGreaterThanOrEqual(80);
    const vendors = new Set(txs.map((t) => t.vendor_raw));
    expect(vendors.size).toBeGreaterThanOrEqual(14);
  });

  it('every transaction is tagged with the demo project/org/dataset', () => {
    for (const t of txs) {
      expect(t.project_id).toBe('demo-project');
      expect(t.dataset_id).toBe('demo-dataset');
      expect(t.organization_id).toBe('demo-org');
    }
  });

  it('has at least one vendor with 3+ months and a mid-period price jump (AWS)', () => {
    const aws = txs.filter((t) => t.vendor_raw === 'AWS Seoul');
    expect(aws.length).toBeGreaterThanOrEqual(6);
    const amounts = new Set(aws.map((t) => t.amount));
    expect(amounts.size).toBeGreaterThanOrEqual(2);
  });

  it('has at least one duplicate-payment pair (same vendor, same amount, within 3 days)', () => {
    const byVendor = new Map<string, typeof txs>();
    for (const t of txs) {
      if (!byVendor.has(t.vendor_raw)) byVendor.set(t.vendor_raw, []);
      byVendor.get(t.vendor_raw)!.push(t);
    }
    let foundDuplicate = false;
    for (const vendorTxs of byVendor.values()) {
      const sorted = [...vendorTxs].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
      for (let i = 0; i < sorted.length - 1; i++) {
        const days = Math.abs(
          new Date(sorted[i + 1].transaction_date).getTime() - new Date(sorted[i].transaction_date).getTime(),
        ) / (1000 * 60 * 60 * 24);
        if (days <= 3 && sorted[i].amount === sorted[i + 1].amount) foundDuplicate = true;
      }
    }
    expect(foundDuplicate).toBe(true);
  });

  it('has at least two transactions far above typical spend (anomaly candidates)', () => {
    const large = txs.filter((t) => t.amount >= 3_000_000);
    expect(large.length).toBeGreaterThanOrEqual(2);
  });
});
