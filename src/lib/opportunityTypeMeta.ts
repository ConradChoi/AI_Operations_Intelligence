export type OpportunityType = 'DUPLICATE' | 'PRICE_INCREASE' | 'RECURRING_REVIEW' | 'ANOMALY';

export interface OpportunityTypeMeta {
  label: string;
  color: string;
}

const META: Record<OpportunityType, OpportunityTypeMeta> = {
  DUPLICATE: { label: '중복 결제', color: '#eb6834' },
  PRICE_INCREASE: { label: '가격 인상', color: '#eda100' },
  RECURRING_REVIEW: { label: '반복결제 검토', color: '#2a78d6' },
  ANOMALY: { label: '이상 거래', color: '#e34948' },
};

export function opportunityTypeMeta(type: string): OpportunityTypeMeta {
  return META[type as OpportunityType] ?? { label: type, color: '#898781' };
}
