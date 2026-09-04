import type { SpendTransaction } from './types.ts';

export interface DuplicatePair {
  vendorNormalized: string;
  amount: number;
  transactionIds: [string, string];
  daysApart: number;
}

function daysBetween(a: string, b: string): number {
  const diff = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return diff / (1000 * 60 * 60 * 24);
}

export function detectDuplicates(transactions: SpendTransaction[]): DuplicatePair[] {
  const byVendor = new Map<string, SpendTransaction[]>();
  for (const t of transactions) {
    const key = t.vendor_normalized ?? t.vendor_raw;
    if (!byVendor.has(key)) byVendor.set(key, []);
    byVendor.get(key)!.push(t);
  }

  const pairs: DuplicatePair[] = [];
  for (const [vendor, txs] of byVendor) {
    const sorted = [...txs].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
    for (let i = 0; i < sorted.length - 1; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const b = sorted[j];
        const days = daysBetween(a.transaction_date, b.transaction_date);
        if (days > 3) break;
        const amountDiffPct = Math.abs(a.amount - b.amount) / a.amount;
        if (amountDiffPct <= 0.01) {
          pairs.push({
            vendorNormalized: vendor,
            amount: a.amount,
            transactionIds: [a.id, b.id],
            daysApart: days,
          });
        }
      }
    }
  }
  return pairs;
}
