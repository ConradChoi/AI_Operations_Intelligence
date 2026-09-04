export interface SpendTransaction {
  id: string;
  dataset_id: string;
  project_id: string;
  organization_id: string;
  transaction_date: string;
  vendor_raw: string;
  vendor_normalized: string | null;
  amount: number;
  currency: string;
  category: string | null;
}

export type OpportunityType = 'DUPLICATE' | 'PRICE_INCREASE' | 'RECURRING_REVIEW' | 'ANOMALY';

export interface Opportunity {
  project_id: string;
  organization_id: string;
  type: OpportunityType;
  title: string;
  evidence_json: Record<string, unknown>;
  impact_type: 'cost_saving';
  estimated_value: number;
  confidence: number;
  effort: 'low' | 'medium' | 'high';
  priority: number;
  status: 'new';
}
