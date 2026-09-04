import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { detectPriceChanges } from './detectPriceChanges.ts';
import type { SpendTransaction } from './types.ts';
import type { RecurringInfo } from './detectRecurring.ts';

function tx(id: string, date: string, amount: number): SpendTransaction {
  return {
    id,
    dataset_id: 'd',
    project_id: 'p',
    organization_id: 'o',
    transaction_date: date,
    vendor_raw: 'AWS',
    vendor_normalized: 'AWS',
    amount,
    currency: 'KRW',
    category: null,
  };
}

const recurring: RecurringInfo[] = [
  { vendorNormalized: 'AWS', monthsActive: 6, averageAmount: 1400000, transactionIds: [] },
];

Deno.test('detectPriceChanges - flags vendor with 15%+ increase between first and second half', () => {
  const txs = [
    tx('t1', '2026-01-05', 1000000),
    tx('t2', '2026-02-05', 1000000),
    tx('t3', '2026-03-05', 1000000),
    tx('t4', '2026-04-05', 1350000),
    tx('t5', '2026-05-05', 1350000),
    tx('t6', '2026-06-05', 1350000),
  ];
  const result = detectPriceChanges(txs, recurring);
  assertEquals(result.length, 1);
  assertEquals(result[0].vendorNormalized, 'AWS');
});

Deno.test('detectPriceChanges - flat pricing is not flagged', () => {
  const txs = [
    tx('t1', '2026-01-05', 1000000),
    tx('t2', '2026-02-05', 1000000),
    tx('t3', '2026-03-05', 1000000),
    tx('t4', '2026-04-05', 1000000),
  ];
  assertEquals(detectPriceChanges(txs, recurring).length, 0);
});

Deno.test('detectPriceChanges - vendor not in recurring list is ignored', () => {
  const txs = [
    tx('t1', '2026-01-05', 1000000),
    tx('t2', '2026-02-05', 1350000),
  ];
  assertEquals(detectPriceChanges(txs, []).length, 0);
});
