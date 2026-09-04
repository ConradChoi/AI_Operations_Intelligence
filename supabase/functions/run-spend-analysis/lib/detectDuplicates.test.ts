import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { detectDuplicates } from './detectDuplicates.ts';
import type { SpendTransaction } from './types.ts';

function tx(overrides: Partial<SpendTransaction>): SpendTransaction {
  return {
    id: 'tx_1',
    dataset_id: 'd',
    project_id: 'p',
    organization_id: 'o',
    transaction_date: '2026-01-05',
    vendor_raw: 'AWS',
    vendor_normalized: 'AWS',
    amount: 1280000,
    currency: 'KRW',
    category: null,
    ...overrides,
  };
}

Deno.test('detectDuplicates - same vendor and amount within 3 days is flagged', () => {
  const txs = [
    tx({ id: 't1', transaction_date: '2026-03-05', amount: 1280000 }),
    tx({ id: 't2', transaction_date: '2026-03-07', amount: 1280000 }),
  ];
  const result = detectDuplicates(txs);
  assertEquals(result.length, 1);
  assertEquals(result[0].transactionIds, ['t1', 't2']);
});

Deno.test('detectDuplicates - same vendor 10 days apart is not flagged', () => {
  const txs = [
    tx({ id: 't1', transaction_date: '2026-03-05', amount: 1280000 }),
    tx({ id: 't2', transaction_date: '2026-03-15', amount: 1280000 }),
  ];
  assertEquals(detectDuplicates(txs).length, 0);
});

Deno.test('detectDuplicates - same day but amount differs by more than 1% is not flagged', () => {
  const txs = [
    tx({ id: 't1', transaction_date: '2026-03-05', amount: 1280000 }),
    tx({ id: 't2', transaction_date: '2026-03-05', amount: 1000000 }),
  ];
  assertEquals(detectDuplicates(txs).length, 0);
});
