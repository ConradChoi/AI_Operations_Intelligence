import { describe, it, expect } from 'vitest';
import { suggestColumnMapping, STANDARD_FIELDS } from './columnMapping';

describe('STANDARD_FIELDS', () => {
  it('lists exactly the 5 required Spend fields plus optional passthrough fields', () => {
    const required = STANDARD_FIELDS.filter((f) => f.required).map((f) => f.field);
    expect(required.sort()).toEqual(
      ['amount', 'currency', 'transaction_date', 'transaction_id', 'vendor_name_raw'].sort(),
    );
  });
});

describe('suggestColumnMapping', () => {
  it('maps exact standard header names with full confidence', () => {
    const result = suggestColumnMapping(['transaction_id', 'amount']);
    expect(result[0]).toEqual({ header: 'transaction_id', field: 'transaction_id', confidence: 1 });
    expect(result[1].field).toBe('amount');
  });

  it('maps Korean synonyms to the correct standard field', () => {
    const result = suggestColumnMapping(['거래일자', '거래처', '금액']);
    expect(result[0].field).toBe('transaction_date');
    expect(result[1].field).toBe('vendor_name_raw');
    expect(result[2].field).toBe('amount');
  });

  it('maps close English variants above the confidence threshold', () => {
    const result = suggestColumnMapping(['vendor']);
    expect(result[0].field).toBe('vendor_name_raw');
  });

  it('leaves unrecognizable headers unmapped', () => {
    const result = suggestColumnMapping(['xyz123random']);
    expect(result[0].field).toBeNull();
    expect(result[0].confidence).toBe(0);
  });
});
