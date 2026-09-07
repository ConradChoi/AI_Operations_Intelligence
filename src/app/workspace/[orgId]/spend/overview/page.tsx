import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatKrw } from '@/lib/format';
import { sumByMonth, sumByCategory, topVendors, momDelta } from '@/lib/spendAggregations';
import { opportunityTypeMeta } from '@/lib/opportunityTypeMeta';
import { StatTile } from '@/components/spend/StatTile';
import { CategoryBarChart } from '@/components/spend/CategoryBarChart';
import { MonthlyTrendChart } from '@/components/spend/MonthlyTrendChart';
import { TopVendorsTable } from '@/components/spend/TopVendorsTable';
import { WalletIcon, RepeatIcon, PiggyBankIcon, AlertTriangleIcon } from '@/components/spend/icons';

import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface EvidenceJson {
  annualSpend?: number;
}

export default async function WorkspaceSpendOverviewPage({ params }: { params: { orgId: string } }) {
  const supabase = createSupabaseServerClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('organization_id', params.orgId)
    .eq('product_type', 'spend')
    .maybeSingle();

  // RLS로 인해 다른 조직 데이터는 project가 null로 돌아온다 — 존재 여부를 노출하지 않도록
  // "권한 없음" 대신 404로 처리한다 (스펙의 Error Handling 원칙).
  if (!project) {
    notFound();
  }

  const { data: transactions } = await supabase
    .from('spend_transactions')
    .select('amount, transaction_date, category, vendor_normalized')
    .eq('project_id', project.id);

  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('id, type, title, estimated_value, confidence, evidence_json')
    .eq('project_id', project.id)
    .order('priority', { ascending: false });

  const txs = (transactions ?? []).map((t) => ({ ...t, amount: Number(t.amount) }));
  const opps = (opportunities ?? []).map((o) => ({ ...o, estimated_value: Number(o.estimated_value) }));

  const totalSpend = txs.reduce((sum, t) => sum + t.amount, 0);
  const monthly = sumByMonth(txs);
  const delta = momDelta(monthly);
  const categoryTotals = sumByCategory(txs);
  const vendors = topVendors(txs, 5);

  const recurringOpportunities = opps.filter((o) => o.type === 'RECURRING_REVIEW');
  const recurringAnnualSpend = recurringOpportunities.reduce(
    (sum, o) => sum + ((o.evidence_json as EvidenceJson | null)?.annualSpend ?? 0),
    0,
  );
  const identifiedSavings = opps.reduce((sum, o) => sum + o.estimated_value, 0);
  const anomalyCount = opps.filter((o) => o.type === 'ANOMALY').length;
  const topOpportunities = opps.slice(0, 3);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-xl font-semibold text-[#0b0b0b]">Spend Overview</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="총 지출"
          value={formatKrw(totalSpend)}
          icon={<WalletIcon />}
          delta={delta ? { pct: delta.deltaPct, label: '전월 대비' } : undefined}
        />
        <StatTile
          label="반복결제 규모"
          value={formatKrw(recurringAnnualSpend)}
          icon={<RepeatIcon />}
          sublabel={`${recurringOpportunities.length}개 벤더 (연간 환산)`}
        />
        <StatTile
          label="식별된 절감액"
          value={formatKrw(identifiedSavings)}
          icon={<PiggyBankIcon />}
          sublabel={`${opps.length}개 절감후보 기준`}
        />
        <StatTile label="이상거래" value={`${anomalyCount}건`} icon={<AlertTriangleIcon />} sublabel="즉시 확인 권장" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-[#e1e0d9] p-4">
          <h2 className="text-sm font-medium text-[#52514e]">카테고리별 지출</h2>
          <div className="mt-4">
            <CategoryBarChart data={categoryTotals} />
          </div>
        </section>
        <section className="rounded-lg border border-[#e1e0d9] p-4">
          <h2 className="text-sm font-medium text-[#52514e]">상위 5개 공급사</h2>
          <div className="mt-4">
            <TopVendorsTable vendors={vendors} totalSpend={totalSpend} />
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-[#e1e0d9] p-4">
        <h2 className="text-sm font-medium text-[#52514e]">월별 지출 추이</h2>
        <div className="mt-4">
          <MonthlyTrendChart data={monthly} />
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-[#e1e0d9] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-[#52514e]">절감후보 하이라이트</h2>
          <Link href={`/workspace/${params.orgId}/spend/opportunities`} className="text-sm text-[#2a78d6] underline">
            전체 보기 →
          </Link>
        </div>
        <ul className="mt-4 space-y-2">
          {topOpportunities.map((o) => {
            const meta = opportunityTypeMeta(o.type);
            return (
              <li key={o.id} className="flex items-start gap-3 rounded border border-[#e1e0d9] p-3">
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: meta.color }}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-[#898781]">{meta.label}</p>
                  <p className="font-medium text-[#0b0b0b]">{o.title}</p>
                  <p className="text-sm text-[#52514e]">
                    예상 절감: {formatKrw(o.estimated_value)} · 확신도 {o.confidence}%
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
