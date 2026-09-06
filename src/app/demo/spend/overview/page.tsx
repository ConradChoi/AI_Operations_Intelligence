import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabaseClient';
import { formatKrw } from '@/lib/format';
import { KpiCard } from '@/components/spend/KpiCard';

// The demo data is re-seeded out-of-band (`npm run seed:demo`). Without this, Next.js would
// statically prerender this page at build time and the deployed demo would be frozen at
// whatever the database held when the build ran.
export const dynamic = 'force-dynamic';

export default async function SpendOverviewPage() {
  const supabase = createSupabaseClient();

  const { data: transactions } = await supabase
    .from('spend_transactions')
    .select('amount')
    .eq('project_id', 'demo-project');

  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('id, type, title, estimated_value, confidence')
    .eq('project_id', 'demo-project')
    .order('priority', { ascending: false })
    .limit(3);

  const totalSpend = (transactions ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
  const topOpportunities = opportunities ?? [];
  const topSavings = topOpportunities.reduce((sum, o) => sum + Number(o.estimated_value), 0);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-xl font-semibold">그로스핀 — Spend Overview (샘플)</h1>
      <div className="mt-6 grid grid-cols-3 gap-4">
        <KpiCard label="Total Spend (9개월)" value={formatKrw(totalSpend)} />
        <KpiCard label="거래 건수" value={String((transactions ?? []).length)} />
        <KpiCard label="Top 3 절감후보 합계" value={formatKrw(topSavings)} />
      </div>
      <h2 className="mt-8 text-lg font-medium">Top Opportunities</h2>
      <ul className="mt-4 space-y-2">
        {topOpportunities.map((o) => (
          <li key={o.id} className="rounded border border-gray-200 p-3">
            <p className="font-medium">{o.title}</p>
            <p className="text-sm text-gray-500">
              예상 절감: {formatKrw(Number(o.estimated_value))} · 확신도 {o.confidence}%
            </p>
          </li>
        ))}
      </ul>
      <Link href="/demo/spend/opportunities" className="mt-6 inline-block text-blue-600 underline">
        전체 Savings Opportunity 보기 →
      </Link>
    </main>
  );
}
