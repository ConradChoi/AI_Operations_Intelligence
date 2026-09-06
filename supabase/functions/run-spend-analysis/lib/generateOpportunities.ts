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

/**
 * Ease points contributed to `priority`, keyed by the opportunity's own `effort` label.
 * Every call site derives `ease` from `EASE[effort]` so the displayed effort label and the
 * priority score can always be reconciled by anyone reading the opportunities table.
 */
const EASE: Record<'low' | 'medium' | 'high', number> = { low: 30, medium: 15, high: 0 };

/**
 * Fraction of a recurring vendor's annual spend we assume is recoverable by
 * renegotiating or rightsizing the contract. Heuristic — see design doc Open Risks #2.
 */
const RECURRING_SAVINGS_RATE = 0.15;

function priorityScore(impact: number, confidencePct: number, ease: number): number {
  return Math.round(impact + (confidencePct / 100) * 30 + ease);
}

/** Scores the KRW value of an opportunity (its `estimated_value`) onto a 0-40 impact scale. */
function impactScore(valueKrw: number): number {
  return Math.max(0, Math.min(40, Math.round((valueKrw / 10_000_000) * 40)));
}

export function generateOpportunities(input: GenerateOpportunitiesInput): Opportunity[] {
  const opportunities: Opportunity[] = [];
  const base = { project_id: input.projectId, organization_id: input.organizationId, impact_type: 'cost_saving' as const, status: 'new' as const };

  for (const dup of input.duplicates) {
    const impact = impactScore(dup.amount);
    const confidence = 80;
    const effort = 'low' as const;
    opportunities.push({
      ...base,
      type: 'DUPLICATE',
      title: `${dup.vendorNormalized} 중복 결제 의심 (${dup.daysApart.toFixed(1)}일 간격)`,
      evidence_json: { transactionIds: dup.transactionIds, amount: dup.amount, daysApart: dup.daysApart },
      estimated_value: dup.amount,
      confidence,
      effort,
      priority: priorityScore(impact, confidence, EASE[effort]),
    });
  }

  for (const pc of input.priceChanges) {
    const annualValue = (pc.afterAverage - pc.beforeAverage) * 12;
    const impact = impactScore(annualValue);
    const confidence = 65;
    const effort = 'medium' as const;
    opportunities.push({
      ...base,
      type: 'PRICE_INCREASE',
      title: `${pc.vendorNormalized} 가격 ${(pc.increasePct * 100).toFixed(0)}% 인상`,
      evidence_json: { transactionIds: pc.transactionIds, beforeAverage: pc.beforeAverage, afterAverage: pc.afterAverage },
      estimated_value: Math.round(annualValue),
      confidence,
      effort,
      priority: priorityScore(impact, confidence, EASE[effort]),
    });
  }

  for (const an of input.anomalies) {
    const excess = an.amount - an.baselineAverage;
    const impact = impactScore(excess);
    const confidence = 55;
    // 'medium': acting on a one-off anomaly means investigating what the charge actually was
    // and chasing an explanation/dispute — not the mechanical refund request a DUPLICATE is.
    const effort = 'medium' as const;
    opportunities.push({
      ...base,
      type: 'ANOMALY',
      title: `${an.vendorNormalized} 이상 거래 (기준선 대비 ${an.ratio.toFixed(1)}배)`,
      evidence_json: { transactionId: an.transactionId, amount: an.amount, baselineAverage: an.baselineAverage },
      estimated_value: Math.round(excess),
      confidence,
      effort,
      priority: priorityScore(impact, confidence, EASE[effort]),
    });
  }

  for (const rec of input.recurring) {
    const annualValue = rec.averageAmount * 12;
    // The opportunity is renegotiating/rightsizing the contract, not cancelling the vendor —
    // so the estimate is a fraction of annual spend, never the whole thing. Full annual spend
    // is preserved in evidence_json.annualSpend.
    const estimatedSavings = Math.round(annualValue * RECURRING_SAVINGS_RATE);
    const impact = impactScore(estimatedSavings);
    const confidence = rec.monthsActive >= 6 ? 85 : rec.monthsActive >= 4 ? 70 : 55;
    const effort = 'low' as const;
    opportunities.push({
      ...base,
      type: 'RECURRING_REVIEW',
      title: `${rec.vendorNormalized} 반복결제 검토 (${rec.monthsActive}개월 연속)`,
      evidence_json: {
        transactionIds: rec.transactionIds,
        monthsActive: rec.monthsActive,
        averageAmount: rec.averageAmount,
        annualSpend: Math.round(annualValue),
        savingsRate: RECURRING_SAVINGS_RATE,
      },
      estimated_value: estimatedSavings,
      confidence,
      effort,
      priority: priorityScore(impact, confidence, EASE[effort]),
    });
  }

  return opportunities.sort((a, b) => b.priority - a.priority);
}
