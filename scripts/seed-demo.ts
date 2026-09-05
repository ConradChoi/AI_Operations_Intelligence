import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { generateDemoTransactions } from './generate-demo-data';

config({ path: '.env.local' });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const functionsUrl = process.env.SUPABASE_FUNCTIONS_URL ?? `${supabaseUrl}/functions/v1`;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('Seeding demo organization/project/dataset...');
  await supabase.from('organizations').upsert({
    id: 'demo-org',
    name: '그로스핀 (가상 마케팅 에이전시)',
    industry: 'agency',
  });
  await supabase.from('projects').upsert({
    id: 'demo-project',
    organization_id: 'demo-org',
    product_type: 'spend',
    period_from: '2026-01-01',
    period_to: '2026-09-30',
  });
  await supabase.from('datasets').upsert({
    id: 'demo-dataset',
    project_id: 'demo-project',
    filename: 'demo_spend_transactions.csv',
    schema_type: 'spend',
    quality_score: 100,
    status: 'seeded',
  });

  console.log('Clearing previous demo transactions and opportunities...');
  await supabase.from('opportunities').delete().eq('project_id', 'demo-project');
  await supabase.from('spend_transactions').delete().eq('project_id', 'demo-project');

  const transactions = generateDemoTransactions('demo-project', 'demo-dataset', 'demo-org');
  console.log(`Inserting ${transactions.length} demo transactions...`);
  const { error: insertError } = await supabase.from('spend_transactions').insert(
    transactions.map((t) => ({ ...t })),
  );
  if (insertError) throw new Error(`Failed to insert transactions: ${insertError.message}`);

  console.log('Running detection engine via run-spend-analysis...');
  const response = await fetch(`${functionsUrl}/run-spend-analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ project_id: 'demo-project' }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`run-spend-analysis failed: ${JSON.stringify(result)}`);

  console.log(`Done. ${result.opportunities_count} opportunities generated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
