interface SpendTransactionLike {
  transaction_date: string;
  amount: number;
  category: string | null;
  vendor_normalized: string | null;
}

export interface MonthlyTotal {
  month: string;
  total: number;
}

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface VendorTotal {
  vendor: string;
  total: number;
}

export interface MomDelta {
  currentMonth: string;
  previousMonth: string;
  deltaPct: number;
}

export function sumByMonth(transactions: SpendTransactionLike[]): MonthlyTotal[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    const month = t.transaction_date.slice(0, 7);
    totals.set(month, (totals.get(month) ?? 0) + t.amount);
  }
  return [...totals.entries()]
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function sumByCategory(transactions: SpendTransactionLike[]): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    const category = t.category ?? 'Uncategorized';
    totals.set(category, (totals.get(category) ?? 0) + t.amount);
  }
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export function topVendors(transactions: SpendTransactionLike[], limit: number): VendorTotal[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    const vendor = t.vendor_normalized ?? '(알 수 없음)';
    totals.set(vendor, (totals.get(vendor) ?? 0) + t.amount);
  }
  return [...totals.entries()]
    .map(([vendor, total]) => ({ vendor, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function momDelta(monthly: MonthlyTotal[]): MomDelta | null {
  if (monthly.length < 2) return null;
  const sorted = [...monthly].sort((a, b) => a.month.localeCompare(b.month));
  const current = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];
  if (previous.total === 0) return null;
  const deltaPct = ((current.total - previous.total) / previous.total) * 100;
  return { currentMonth: current.month, previousMonth: previous.month, deltaPct };
}
