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

  const byType = Object.fromEntries(result.map((o) => [o.type, o]));

  // estimated_value is a *savings* estimate for every type.
  assertEquals(byType.DUPLICATE.estimated_value, 1_280_000); // the duplicated charge itself
  assertEquals(byType.PRICE_INCREASE.estimated_value, (1_728_000 - 1_280_000) * 12);
  assertEquals(byType.ANOMALY.estimated_value, 4_500_000 - 500_000);
  // RECURRING_REVIEW: 15% of annual spend, NOT the whole annual spend.
  assertEquals(byType.RECURRING_REVIEW.estimated_value, Math.round(180_000 * 12 * 0.15));
  assert(
    byType.RECURRING_REVIEW.estimated_value < 180_000 * 12,
    'RECURRING_REVIEW must not claim the vendor entire annual spend as savings',
  );
  // ...while the full annual spend stays available as evidence.
  assertEquals(byType.RECURRING_REVIEW.evidence_json.annualSpend, 180_000 * 12);
  assertEquals(byType.RECURRING_REVIEW.evidence_json.averageAmount, 180_000);
});

Deno.test('generateOpportunities - priority ease term is consistent with the effort label', () => {
  // priority = impact + confidence/100*30 + EASE[effort], with EASE low=30, medium=15, high=0.
  const EASE: Record<string, number> = { low: 30, medium: 15, high: 0 };
  const impactScore = (v: number) => Math.max(0, Math.min(40, Math.round((v / 10_000_000) * 40)));

  const result = generateOpportunities({
    projectId: 'demo-project',
    organizationId: 'demo-org',
    duplicates: [
      { vendorNormalized: 'AWS', amount: 1_280_000, transactionIds: ['t1', 't2'], daysApart: 2 },
    ],
    priceChanges: [
      {
        vendorNormalized: 'AWS',
        beforeAverage: 1_280_000,
        afterAverage: 1_728_000,
        increasePct: 0.35,
        transactionIds: ['t1', 't2', 't3'],
      },
    ],
    anomalies: [
      { transactionId: 't9', vendorNormalized: 'Coupang', amount: 4_500_000, baselineAverage: 500_000, ratio: 9 },
    ],
    recurring: [
      { vendorNormalized: 'Notion', monthsActive: 6, averageAmount: 180_000, transactionIds: ['t4', 't5'] },
    ],
  });

  assertEquals(result.length, 4);
  for (const o of result) {
    const expected = Math.round(
      impactScore(o.estimated_value) + (o.confidence / 100) * 30 + EASE[o.effort],
    );
    assertEquals(
      o.priority,
      expected,
      `${o.type}: priority ${o.priority} cannot be reconciled with effort='${o.effort}' (expected ${expected})`,
    );
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
