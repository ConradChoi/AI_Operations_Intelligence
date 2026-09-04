import type { SpendTransaction } from './types.ts';

export interface RecurringInfo {
  vendorNormalized: string;
  monthsActive: number;
  averageAmount: number;
  transactionIds: string[];
}

export function detectRecurring(transactions: SpendTransaction[]): RecurringInfo[] {
  const byVendor = new Map<string, SpendTransaction[]>();
  for (const t of transactions) {
    const key = t.vendor_normalized ?? t.vendor_raw;
    if (!byVendor.has(key)) byVendor.set(key, []);
    byVendor.get(key)!.push(t);
  }

  const results: RecurringInfo[] = [];
  for (const [vendor, txs] of byVendor) {
    const sorted = [...txs].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
    const months = new Set(sorted.map((t) => t.transaction_date.slice(0, 7)));
    if (months.size < 3) continue;

    const avg = sorted.reduce((s, t) => s + t.amount, 0) / sorted.length;
    results.push({
      vendorNormalized: vendor,
      monthsActive: months.size,
      averageAmount: avg,
      transactionIds: sorted.map((t) => t.id),
    });
  }
  return results;
}
