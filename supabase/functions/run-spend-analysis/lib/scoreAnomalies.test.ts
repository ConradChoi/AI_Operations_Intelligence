import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { scoreAnomalies } from './scoreAnomalies.ts';
import type { SpendTransaction } from './types.ts';

function tx(id: string, vendor: string, amount: number): SpendTransaction {
  return {
    id,
    dataset_id: 'd',
    project_id: 'p',
    organization_id: 'o',
    transaction_date: '2026-01-05',
    vendor_raw: vendor,
    vendor_normalized: vendor,
    amount,
    currency: 'KRW',
    category: null,
  };
}

Deno.test('scoreAnomalies - one-off vendor spend far above dataset average is flagged (fallback baseline)', () => {
  const txs = [
    tx('t1', 'Notion', 180000),
    tx('t2', 'Slack', 320000),
    tx('t3', 'Zoom', 210000),
    tx('t4', 'Coupang', 4500000),
  ];
  const result = scoreAnomalies(txs);
  assertEquals(result.length, 1);
  assertEquals(result[0].transactionId, 't4');
});

Deno.test('scoreAnomalies - vendor with 3+ own transactions uses vendor-relative baseline, not dataset average', () => {
  const txs = [
    tx('t1', 'AWS', 1280000),
    tx('t2', 'AWS', 1280000),
    tx('t3', 'AWS', 1280000),
    tx('t4', 'AWS', 1730000),
    tx('t5', 'Notion', 180000),
  ];
  const result = scoreAnomalies(txs);
  assertEquals(result.length, 0);
});

Deno.test('scoreAnomalies - empty input returns empty array', () => {
  assertEquals(scoreAnomalies([]).length, 0);
});
