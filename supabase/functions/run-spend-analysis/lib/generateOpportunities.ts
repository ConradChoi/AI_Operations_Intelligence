import type { RecurringInfo } from './detectRecurring.ts';
import type { DuplicatePair } from './detectDuplicates.ts';
import type { PriceChangeInfo } from './detectPriceChanges.ts';
import type { AnomalyInfo } from './scoreAnomalies.ts';
import type { Opportunity } from './types.ts';

export interface GenerateOpportunitiesInput {
  projectId: string;
  organizationId: string;
  duplicates: DuplicatePair[];
  priceChanges: PriceChangeInfo[];
  anomalies: AnomalyInfo[];
  recurring: RecurringInfo[];
}

function priorityScore(impact: number, confidencePct: number, ease: number): number {
  return Math.round(impact + (confidencePct / 100) * 30 + ease);
}

function impactScore(annualValueKrw: number): number {
  return Math.max(0, Math.min(40, Math.round((annualValueKrw / 10_000_000) * 40)));
}

export function generateOpportunities(input: GenerateOpportunitiesInput): Opportunity[] {
  const opportunities: Opportunity[] = [];
  const base = { project_id: input.projectId, organization_id: input.organizationId, impact_type: 'cost_saving' as const, status: 'new' as const };

  for (const dup of input.duplicates) {
    const impact = impactScore(dup.amount);
    const confidence = 80;
    const ease = 30;
    opportunities.push({
      ...base,
      type: 'DUPLICATE',
      title: `${dup.vendorNormalized} 중복 결제 의심 (${dup.daysApart.toFixed(1)}일 간격)`,
      evidence_json: { transactionIds: dup.transactionIds, amount: dup.amount, daysApart: dup.daysApart },
      estimated_value: dup.amount,
      confidence,
      effort: 'low',
      priority: priorityScore(impact, confidence, ease),
    });
  }

  for (const pc of input.priceChanges) {
    const annualValue = (pc.afterAverage - pc.beforeAverage) * 12;
    const impact = impactScore(annualValue);
    const confidence = 65;
    const ease = 15;
    opportunities.push({
      ...base,
      type: 'PRICE_INCREASE',
      title: `${pc.vendorNormalized} 가격 ${(pc.increasePct * 100).toFixed(0)}% 인상`,
      evidence_json: { transactionIds: pc.transactionIds, beforeAverage: pc.beforeAverage, afterAverage: pc.afterAverage },
      estimated_value: Math.round(annualValue),
      confidence,
      effort: 'medium',
      priority: priorityScore(impact, confidence, ease),
    });
  }

  for (const an of input.anomalies) {
    const excess = an.amount - an.baselineAverage;
    const impact = impactScore(excess);
    const confidence = 55;
    const ease = 20;
    opportunities.push({
      ...base,
      type: 'ANOMALY',
      title: `${an.vendorNormalized} 이상 거래 (기준선 대비 ${an.ratio.toFixed(1)}배)`,
      evidence_json: { transactionId: an.transactionId, amount: an.amount, baselineAverage: an.baselineAverage },
      estimated_value: Math.round(excess),
      confidence,
      effort: 'low',
      priority: priorityScore(impact, confidence, ease),
    });
  }

  for (const rec of input.recurring) {
    const annualValue = rec.averageAmount * 12;
    const impact = impactScore(annualValue);
    const confidence = rec.monthsActive >= 6 ? 85 : rec.monthsActive >= 4 ? 70 : 55;
    const ease = 25;
    opportunities.push({
      ...base,
      type: 'RECURRING_REVIEW',
      title: `${rec.vendorNormalized} 반복결제 검토 (${rec.monthsActive}개월 연속)`,
      evidence_json: { transactionIds: rec.transactionIds, monthsActive: rec.monthsActive, averageAmount: rec.averageAmount },
      estimated_value: Math.round(annualValue),
      confidence,
      effort: 'low',
      priority: priorityScore(impact, confidence, ease),
    });
  }

  return opportunities.sort((a, b) => b.priority - a.priority);
}
