import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { normalizeVendor } from './lib/normalizeVendor.ts';
import { categorize } from './lib/categorize.ts';
import { detectRecurring } from './lib/detectRecurring.ts';
import { detectDuplicates } from './lib/detectDuplicates.ts';
import { detectPriceChanges } from './lib/detectPriceChanges.ts';
import { scoreAnomalies } from './lib/scoreAnomalies.ts';
import { generateOpportunities } from './lib/generateOpportunities.ts';
import type { SpendTransaction } from './lib/types.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  let body: { project_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const projectId = body.project_id;
  if (!projectId) {
    return new Response(JSON.stringify({ error: 'project_id is required' }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: rawTransactions, error: fetchError } = await supabase
    .from('spend_transactions')
    .select('*')
    .eq('project_id', projectId);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  const organizationId = rawTransactions?.[0]?.organization_id ?? '';

  const transactions: SpendTransaction[] = (rawTransactions ?? []).map((t) => {
    const vendorNormalized = normalizeVendor(t.vendor_raw);
    return {
      ...t,
      vendor_normalized: vendorNormalized,
      category: categorize(vendorNormalized),
    } as SpendTransaction;
  });

  const recurring = detectRecurring(transactions);
  const duplicates = detectDuplicates(transactions);
  const priceChanges = detectPriceChanges(transactions, recurring);
  const anomalies = scoreAnomalies(transactions);
  const opportunities = generateOpportunities({
    projectId,
    organizationId,
    duplicates,
    priceChanges,
    anomalies,
    recurring,
  });

  const { error: updateError } = await supabase.from('spend_transactions').upsert(
    transactions.map((t) => ({
      id: t.id,
      dataset_id: t.dataset_id,
      project_id: t.project_id,
      organization_id: t.organization_id,
      transaction_date: t.transaction_date,
      vendor_raw: t.vendor_raw,
      vendor_normalized: t.vendor_normalized,
      amount: t.amount,
      currency: t.currency,
      category: t.category,
    })),
  );
  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
  }

  const { error: deleteError } = await supabase.from('opportunities').delete().eq('project_id', projectId);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  if (opportunities.length > 0) {
    const { error: insertError } = await supabase.from('opportunities').insert(opportunities);
    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
    }
  }

  return new Response(
    JSON.stringify({ opportunities_count: opportunities.length, opportunities }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
