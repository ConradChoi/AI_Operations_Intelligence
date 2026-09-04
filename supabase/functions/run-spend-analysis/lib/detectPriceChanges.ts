import type { SpendTransaction } from './types.ts';
import type { RecurringInfo } from './detectRecurring.ts';

export interface PriceChangeInfo {
  vendorNormalized: string;
  beforeAverage: number;
  afterAverage: number;
  increasePct: number;
  transactionIds: string[];
}

export function detectPriceChanges(
  transactions: SpendTransaction[],
  recurringVendors: RecurringInfo[],
): PriceChangeInfo[] {
  const recurringSet = new Set(recurringVendors.map((r) => r.vendorNormalized));
  const byVendor = new Map<string, SpendTransaction[]>();
  for (const t of transactions) {
    const key = t.vendor_normalized ?? t.vendor_raw;
    if (!recurringSet.has(key)) continue;
    if (!byVendor.has(key)) byVendor.set(key, []);
    byVendor.get(key)!.push(t);
  }

  const results: PriceChangeInfo[] = [];
  for (const [vendor, txs] of byVendor) {
    const sorted = [...txs].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
    if (sorted.length < 4) continue;
    const mid = Math.floor(sorted.length / 2);
    const before = sorted.slice(0, mid);
    const after = sorted.slice(mid);
    const beforeAvg = before.reduce((s, t) => s + t.amount, 0) / before.length;
    const afterAvg = after.reduce((s, t) => s + t.amount, 0) / after.length;
    const increasePct = (afterAvg - beforeAvg) / beforeAvg;
    if (increasePct >= 0.15) {
      results.push({
        vendorNormalized: vendor,
        beforeAverage: beforeAvg,
        afterAverage: afterAvg,
        increasePct,
        transactionIds: sorted.map((t) => t.id),
      });
    }
  }
  return results;
}
