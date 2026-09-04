import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { detectRecurring } from './detectRecurring.ts';
import type { SpendTransaction } from './types.ts';

function tx(overrides: Partial<SpendTransaction>): SpendTransaction {
  return {
    id: 'tx_1',
    dataset_id: 'd',
    project_id: 'p',
    organization_id: 'o',
    transaction_date: '2026-01-05',
    vendor_raw: 'Notion',
    vendor_normalized: 'Notion',
    amount: 180000,
    currency: 'KRW',
    category: null,
    ...overrides,
  };
}

Deno.test('detectRecurring - vendor with 3+ distinct months is flagged', () => {
  const txs = [
    tx({ id: 't1', transaction_date: '2026-01-05' }),
    tx({ id: 't2', transaction_date: '2026-02-05' }),
    tx({ id: 't3', transaction_date: '2026-03-05' }),
  ];
  const result = detectRecurring(txs);
  assertEquals(result.length, 1);
  assertEquals(result[0].vendorNormalized, 'Notion');
  assertEquals(result[0].monthsActive, 3);
});

Deno.test('detectRecurring - vendor with only 2 distinct months is not flagged', () => {
  const txs = [
    tx({ id: 't1', transaction_date: '2026-01-05' }),
    tx({ id: 't2', transaction_date: '2026-02-05' }),
  ];
  assertEquals(detectRecurring(txs).length, 0);
});

Deno.test('detectRecurring - flags vendor even if amount changed mid-way (price change is a separate concern)', () => {
  const txs = [
    tx({ id: 't1', transaction_date: '2026-01-05', amount: 100000 }),
    tx({ id: 't2', transaction_date: '2026-02-05', amount: 100000 }),
    tx({ id: 't3', transaction_date: '2026-03-05', amount: 150000 }),
  ];
  const result = detectRecurring(txs);
  assertEquals(result.length, 1);
});
