import type { SpendTransaction } from './types.ts';

export interface AnomalyInfo {
  transactionId: string;
  vendorNormalized: string;
  amount: number;
  baselineAverage: number;
  ratio: number;
}

export function scoreAnomalies(transactions: SpendTransaction[]): AnomalyInfo[] {
  if (transactions.length === 0) return [];

  const byVendor = new Map<string, SpendTransaction[]>();
  for (const t of transactions) {
    const key = t.vendor_normalized ?? t.vendor_raw;
    if (!byVendor.has(key)) byVendor.set(key, []);
    byVendor.get(key)!.push(t);
  }

  const datasetAverage = transactions.reduce((s, t) => s + t.amount, 0) / transactions.length;

  const anomalies: AnomalyInfo[] = [];
  for (const t of transactions) {
    const key = t.vendor_normalized ?? t.vendor_raw;
    const vendorTxs = byVendor.get(key)!;
    let baseline: number;
    if (vendorTxs.length >= 3) {
      const others = vendorTxs.filter((v) => v.id !== t.id);
      baseline = others.reduce((s, v) => s + v.amount, 0) / others.length;
    } else {
      baseline = datasetAverage;
    }
    const ratio = t.amount / baseline;
    if (ratio >= 3) {
      anomalies.push({
        transactionId: t.id,
        vendorNormalized: key,
        amount: t.amount,
        baselineAverage: baseline,
        ratio,
      });
    }
  }
  return anomalies;
}
