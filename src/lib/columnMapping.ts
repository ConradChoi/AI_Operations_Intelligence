export interface StandardField {
  field: string;
  required: boolean;
  synonyms: string[];
}

export const STANDARD_FIELDS: StandardField[] = [
  { field: 'transaction_id', required: true, synonyms: ['transaction_id', 'id', 'tx_id', '거래id', '거래번호'] },
  { field: 'transaction_date', required: true, synonyms: ['transaction_date', 'date', '거래일', '거래일자', '날짜'] },
  {
    field: 'vendor_name_raw',
    required: true,
    synonyms: ['vendor_name_raw', 'vendor', 'vendor_name', '거래처', '가맹점', '공급사'],
  },
  { field: 'amount', required: true, synonyms: ['amount', '금액', '거래금액'] },
  { field: 'currency', required: true, synonyms: ['currency', '통화'] },
  { field: 'department', required: false, synonyms: ['department', '부서'] },
  { field: 'memo', required: false, synonyms: ['memo', '메모', '비고'] },
];

const CONFIDENCE_THRESHOLD = 0.5;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
}

function bigrams(s: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  return set;
}

function diceCoefficient(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  const bigramsA = bigrams(na);
  const bigramsB = bigrams(nb);
  if (bigramsA.size === 0 || bigramsB.size === 0) return 0;
  let intersection = 0;
  for (const bg of bigramsA) if (bigramsB.has(bg)) intersection++;
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

export interface MappingSuggestion {
  header: string;
  field: string | null;
  confidence: number;
}

export function suggestColumnMapping(headers: string[]): MappingSuggestion[] {
  return headers.map((header) => {
    let best: { field: string; score: number } | null = null;
    for (const std of STANDARD_FIELDS) {
      for (const syn of std.synonyms) {
        const score = diceCoefficient(header, syn);
        if (!best || score > best.score) best = { field: std.field, score };
      }
    }
    if (best && best.score >= CONFIDENCE_THRESHOLD) {
      return { header, field: best.field, confidence: best.score };
    }
    return { header, field: null, confidence: 0 };
  });
}
