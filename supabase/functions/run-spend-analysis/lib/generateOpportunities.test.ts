import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { generateOpportunities } from './generateOpportunities.ts';

Deno.test('generateOpportunities - produces one opportunity per input signal, sorted by priority desc', () => {
  const result = generateOpportunities({
    projectId: 'demo-project',
    organizationId: 'demo-org',
    duplicates: [
      { vendorNormalized: 'AWS', amount: 1280000, transactionIds: ['t1', 't2'], daysApart: 2 },
    ],
    priceChanges: [
      {
        vendorNormalized: 'AWS',
        beforeAverage: 1280000,
        afterAverage: 1728000,
        increasePct: 0.35,
        transactionIds: ['t1', 't2', 't3'],
      },
    ],
    anomalies: [
      { transactionId: 't9', vendorNormalized: 'Coupang', amount: 4500000, baselineAverage: 500000, ratio: 9 },
    ],
    recurring: [
      { vendorNormalized: 'Notion', monthsActive: 6, averageAmount: 180000, transactionIds: ['t4', 't5'] },
    ],
  });

  assertEquals(result.length, 4);
  const types = result.map((o) => o.type).sort();
  assertEquals(types, ['ANOMALY', 'DUPLICATE', 'PRICE_INCREASE', 'RECURRING_REVIEW']);
  for (let i = 0; i < result.length - 1; i++) {
    assert(result[i].priority >= result[i + 1].priority);
  }
  for (const o of result) {
    assertEquals(o.project_id, 'demo-project');
    assertEquals(o.organization_id, 'demo-org');
    assertEquals(o.status, 'new');
    assert(o.priority >= 0 && o.priority <= 100);
  }
});

Deno.test('generateOpportunities - empty input produces empty output', () => {
  const result = generateOpportunities({
    projectId: 'demo-project',
    organizationId: 'demo-org',
    duplicates: [],
    priceChanges: [],
    anomalies: [],
    recurring: [],
  });
  assertEquals(result.length, 0);
});
