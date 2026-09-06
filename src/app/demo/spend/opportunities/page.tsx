import { createSupabaseClient } from '@/lib/supabaseClient';
import { OpportunityTable } from '@/components/spend/OpportunityTable';

// The demo data is re-seeded out-of-band (`npm run seed:demo`). Without this, Next.js would
// statically prerender this page at build time and the deployed demo would be frozen at
// whatever the database held when the build ran.
export const dynamic = 'force-dynamic';

export default async function SpendOpportunitiesPage() {
  const supabase = createSupabaseClient();
  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('id, type, title, estimated_value, confidence, effort, priority')
    .eq('project_id', 'demo-project')
    .order('priority', { ascending: false });

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-xl font-semibold">Savings Opportunities (샘플)</h1>
      <div className="mt-6">
        <OpportunityTable opportunities={opportunities ?? []} />
      </div>
    </main>
  );
}
