export interface QualityRow {
  transaction_id: string;
  transaction_date: string;
  vendor_name_raw: string;
  amount: string;
  currency: string;
}

export interface QualityIssue {
  rowIndex: number;
  reason: string;
}

export interface QualityReport {
  blockers: QualityIssue[];
  warnings: QualityIssue[];
  score: number;
  canProceed: boolean;
}

export function checkQuality(rows: QualityRow[]): QualityReport {
  const blockers: QualityIssue[] = [];
  const warnings: QualityIssue[] = [];
  const seenIds = new Set<string>();

  let completenessOk = 0;
  let validityOk = 0;
  let uniquenessOk = 0;

  rows.forEach((row, i) => {
    const hasRequired = Boolean(
      row.transaction_id && row.transaction_date && row.vendor_name_raw && row.amount && row.currency,
    );
    if (!hasRequired) {
      blockers.push({ rowIndex: i, reason: '필수 컬럼 값 없음' });
    } else {
      completenessOk++;
    }

    const dateValid = !Number.isNaN(Date.parse(row.transaction_date));
    const amountValid = row.amount !== '' && !Number.isNaN(Number(row.amount));
    if (!dateValid) blockers.push({ rowIndex: i, reason: 'transaction_date 파싱 불가' });
    if (!amountValid) blockers.push({ rowIndex: i, reason: 'amount 숫자 변환 불가' });
    if (dateValid && amountValid) validityOk++;

    if (row.transaction_id) {
      if (seenIds.has(row.transaction_id)) {
        blockers.push({ rowIndex: i, reason: `transaction_id 중복: ${row.transaction_id}` });
      } else {
        seenIds.add(row.transaction_id);
        uniquenessOk++;
      }
    }

    if (row.vendor_name_raw && row.vendor_name_raw.trim().length <= 1) {
      warnings.push({ rowIndex: i, reason: 'vendor_name_raw 불완전' });
    }
    if (amountValid && Number(row.amount) <= 0) {
      warnings.push({ rowIndex: i, reason: 'amount가 0 이하' });
    }
  });

  const n = rows.length || 1;
  const completeness = completenessOk / n;
  const validity = validityOk / n;
  const uniqueness = uniquenessOk / n;
  const score = Math.round(completeness * 45 + validity * 35 + uniqueness * 20);

  return { blockers, warnings, score, canProceed: blockers.length === 0 };
}
