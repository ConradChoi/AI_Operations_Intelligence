export interface DemoTransaction {
  id: string;
  dataset_id: string;
  project_id: string;
  organization_id: string;
  transaction_date: string;
  vendor_raw: string;
  amount: number;
  currency: string;
}

interface RecurringVendorSpec {
  vendorRaw: string;
  monthlyAmount: number;
  priceIncreaseAtMonth?: number;
  priceIncreaseFactor?: number;
}

const RECURRING_VENDORS: RecurringVendorSpec[] = [
  { vendorRaw: 'AWS Seoul', monthlyAmount: 1_280_000, priceIncreaseAtMonth: 6, priceIncreaseFactor: 1.35 },
  { vendorRaw: 'Notion Labs', monthlyAmount: 180_000 },
  { vendorRaw: 'Slack Technologies', monthlyAmount: 320_000 },
  { vendorRaw: 'Figma Inc', monthlyAmount: 250_000, priceIncreaseAtMonth: 5, priceIncreaseFactor: 1.2 },
  { vendorRaw: 'Zoom Video Communications', monthlyAmount: 210_000 },
  { vendorRaw: 'Google Cloud Platform', monthlyAmount: 940_000 },
  { vendorRaw: 'Adobe Creative Cloud', monthlyAmount: 410_000 },
  { vendorRaw: 'HubSpot Inc', monthlyAmount: 890_000 },
];

const ONEOFF_VENDORS = [
  'Coupang Business',
  'KT 통신',
  '스타벅스코리아',
  '메쉬코리아',
  '카카오모빌리티',
  '토스페이먼츠',
  'CJ대한통운',
  '배달의민족',
];

function monthKey(startYear: number, startMonth: number, offset: number): { year: number; month: number } {
  const total = startMonth - 1 + offset;
  return { year: startYear + Math.floor(total / 12), month: (total % 12) + 1 };
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export function generateDemoTransactions(
  projectId: string,
  datasetId: string,
  organizationId: string,
): DemoTransaction[] {
  const transactions: DemoTransaction[] = [];
  let seq = 1;
  const startYear = 2026;
  const startMonth = 1;
  const monthsCount = 9;

  const nextId = () => `tx_${String(seq++).padStart(4, '0')}`;

  for (const spec of RECURRING_VENDORS) {
    for (let m = 0; m < monthsCount; m++) {
      const { year, month } = monthKey(startYear, startMonth, m);
      let amount = spec.monthlyAmount;
      if (spec.priceIncreaseAtMonth && m + 1 >= spec.priceIncreaseAtMonth) {
        amount = Math.round(spec.monthlyAmount * (spec.priceIncreaseFactor ?? 1));
      }
      transactions.push({
        id: nextId(),
        dataset_id: datasetId,
        project_id: projectId,
        organization_id: organizationId,
        transaction_date: `${year}-${pad2(month)}-05`,
        vendor_raw: spec.vendorRaw,
        amount,
        currency: 'KRW',
      });
    }
  }

  // duplicate payment candidates
  transactions.push({
    id: nextId(),
    dataset_id: datasetId,
    project_id: projectId,
    organization_id: organizationId,
    transaction_date: '2026-03-07',
    vendor_raw: 'AWS Seoul',
    amount: 1_280_000,
    currency: 'KRW',
  });
  transactions.push({
    id: nextId(),
    dataset_id: datasetId,
    project_id: projectId,
    organization_id: organizationId,
    transaction_date: '2026-07-06',
    vendor_raw: 'HubSpot Inc',
    amount: 890_000,
    currency: 'KRW',
  });

  // anomaly candidates (one-off large transactions)
  transactions.push({
    id: nextId(),
    dataset_id: datasetId,
    project_id: projectId,
    organization_id: organizationId,
    transaction_date: '2026-04-15',
    vendor_raw: 'Coupang Business',
    amount: 4_500_000,
    currency: 'KRW',
  });
  transactions.push({
    id: nextId(),
    dataset_id: datasetId,
    project_id: projectId,
    organization_id: organizationId,
    transaction_date: '2026-08-20',
    vendor_raw: '메쉬코리아',
    amount: 3_200_000,
    currency: 'KRW',
  });

  // one-off vendor noise for realism
  for (let i = 0; i < ONEOFF_VENDORS.length; i++) {
    const vendor = ONEOFF_VENDORS[i];
    const m = i % monthsCount;
    const { year, month } = monthKey(startYear, startMonth, m);
    transactions.push({
      id: nextId(),
      dataset_id: datasetId,
      project_id: projectId,
      organization_id: organizationId,
      transaction_date: `${year}-${pad2(month)}-${pad2(10 + i)}`,
      vendor_raw: vendor,
      amount: 50_000 + i * 15_000,
      currency: 'KRW',
    });
  }

  return transactions;
}
