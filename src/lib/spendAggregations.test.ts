import { describe, it, expect } from 'vitest';
import { sumByMonth, sumByCategory, topVendors, momDelta } from './spendAggregations';

interface Tx {
  transaction_date: string;
  amount: number;
  category: string | null;
  vendor_normalized: string | null;
}

function tx(overrides: Partial<Tx>): Tx {
  return {
    transaction_date: '2026-01-05',
    amount: 100000,
    category: 'Cloud Infrastructure',
    vendor_normalized: 'AWS',
    ...overrides,
  };
}

describe('sumByMonth', () => {
  it('groups by year-month and sums amounts, sorted chronologically', () => {
    const result = sumByMonth([
      tx({ transaction_date: '2026-02-10', amount: 100 }),
      tx({ transaction_date: '2026-01-05', amount: 200 }),
      tx({ transaction_date: '2026-01-20', amount: 50 }),
    ]);
    expect(result).toEqual([
      { month: '2026-01', total: 250 },
      { month: '2026-02', total: 100 },
    ]);
  });

  it('returns an empty array for no transactions', () => {
    expect(sumByMonth([])).toEqual([]);
  });
});

describe('sumByCategory', () => {
  it('groups by category and sums amounts, sorted by total descending', () => {
    const result = sumByCategory([
      tx({ category: 'Design SaaS', amount: 50 }),
      tx({ category: 'Cloud Infrastructure', amount: 300 }),
      tx({ category: 'Design SaaS', amount: 100 }),
    ]);
    expect(result).toEqual([
      { category: 'Cloud Infrastructure', total: 300 },
      { category: 'Design SaaS', total: 150 },
    ]);
  });

  it('falls back to Uncategorized for null category', () => {
    const result = sumByCategory([tx({ category: null, amount: 10 })]);
    expect(result).toEqual([{ category: 'Uncategorized', total: 10 }]);
  });
});

describe('topVendors', () => {
  it('groups by vendor, sums amounts, and returns the top N descending', () => {
    const result = topVendors(
      [
        tx({ vendor_normalized: 'AWS', amount: 100 }),
        tx({ vendor_normalized: 'Notion', amount: 500 }),
        tx({ vendor_normalized: 'AWS', amount: 50 }),
        tx({ vendor_normalized: 'Slack', amount: 20 }),
      ],
      2,
    );
    expect(result).toEqual([
      { vendor: 'Notion', total: 500 },
      { vendor: 'AWS', total: 150 },
    ]);
  });

  it('falls back to vendor_raw-equivalent Uncategorized-style label only when vendor_normalized is null', () => {
    const result = topVendors([{ ...tx({ amount: 10 }), vendor_normalized: null }], 5);
    expect(result[0].vendor).toBe('(알 수 없음)');
  });
});

describe('momDelta', () => {
  it('computes percentage change between the last two months', () => {
    const result = momDelta([
      { month: '2026-01', total: 1000 },
      { month: '2026-02', total: 1200 },
    ]);
    expect(result).toEqual({ currentMonth: '2026-02', previousMonth: '2026-01', deltaPct: 20 });
  });

  it('returns null when fewer than 2 months are present', () => {
    expect(momDelta([{ month: '2026-01', total: 1000 }])).toBeNull();
    expect(momDelta([])).toBeNull();
  });

  it('returns null when the previous month total is zero (avoid divide-by-zero)', () => {
    expect(
      momDelta([
        { month: '2026-01', total: 0 },
        { month: '2026-02', total: 500 },
      ]),
    ).toBeNull();
  });
});
