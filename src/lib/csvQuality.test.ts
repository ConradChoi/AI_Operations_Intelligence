import { describe, it, expect } from 'vitest';
import { checkQuality, type QualityRow } from './csvQuality';

function row(overrides: Partial<QualityRow>): QualityRow {
  return {
    transaction_id: 'tx_1',
    transaction_date: '2026-01-05',
    vendor_name_raw: 'AWS',
    amount: '100000',
    currency: 'KRW',
    ...overrides,
  };
}

describe('checkQuality', () => {
  it('gives a clean dataset a perfect score and allows proceeding', () => {
    const report = checkQuality([row({ transaction_id: 'a' }), row({ transaction_id: 'b' })]);
    expect(report.blockers).toHaveLength(0);
    expect(report.score).toBe(100);
    expect(report.canProceed).toBe(true);
  });

  it('flags a missing required field as a Blocker', () => {
    const report = checkQuality([row({ vendor_name_raw: '' })]);
    expect(report.blockers.length).toBeGreaterThan(0);
    expect(report.canProceed).toBe(false);
  });

  it('flags an unparseable date as a Blocker', () => {
    const report = checkQuality([row({ transaction_date: 'not-a-date' })]);
    expect(report.blockers.some((b) => b.reason.includes('transaction_date'))).toBe(true);
    expect(report.canProceed).toBe(false);
  });

  it('flags a non-numeric amount as a Blocker', () => {
    const report = checkQuality([row({ amount: 'abc' })]);
    expect(report.blockers.some((b) => b.reason.includes('amount'))).toBe(true);
    expect(report.canProceed).toBe(false);
  });

  it('flags duplicate transaction_id within the same batch as a Blocker', () => {
    const report = checkQuality([row({ transaction_id: 'dup' }), row({ transaction_id: 'dup' })]);
    expect(report.blockers.some((b) => b.reason.includes('중복'))).toBe(true);
    expect(report.canProceed).toBe(false);
  });

  it('flags a near-empty vendor name as a Warning, not a Blocker', () => {
    const report = checkQuality([row({ vendor_name_raw: 'A' })]);
    expect(report.blockers).toHaveLength(0);
    expect(report.warnings.length).toBeGreaterThan(0);
    expect(report.canProceed).toBe(true);
  });

  it('flags a zero or negative amount as a Warning, not a Blocker', () => {
    const report = checkQuality([row({ amount: '0' })]);
    expect(report.blockers).toHaveLength(0);
    expect(report.warnings.some((w) => w.reason.includes('amount'))).toBe(true);
  });
});
