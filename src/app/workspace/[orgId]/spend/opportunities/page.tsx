import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { OpportunityTable } from '@/components/spend/OpportunityTable';

export const dynamic = 'force-dynamic';

export default async function WorkspaceSpendOpportunitiesPage({ params }: { params: { orgId: string } }) {
  const supabase = createSupabaseServerClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('organization_id', params.orgId)
    .eq('product_type', 'spend')
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('id, type, title, estimated_value, confidence, effort, priority')
    .eq('project_id', project.id)
    .order('priority', { ascending: false });

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-xl font-semibold">Savings Opportunities</h1>
      <div className="mt-6">
        <OpportunityTable opportunities={opportunities ?? []} />
      </div>
    </main>
  );
}
