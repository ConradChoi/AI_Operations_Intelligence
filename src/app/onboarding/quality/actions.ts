'use server';

import { randomUUID } from 'crypto';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { QualityRow } from '@/lib/csvQuality';
import { normalizeVendor } from '@engine/normalizeVendor.ts';
import { categorize } from '@engine/categorize.ts';
import { detectRecurring } from '@engine/detectRecurring.ts';
import { detectDuplicates } from '@engine/detectDuplicates.ts';
import { detectPriceChanges } from '@engine/detectPriceChanges.ts';
import { scoreAnomalies } from '@engine/scoreAnomalies.ts';
import { generateOpportunities } from '@engine/generateOpportunities.ts';
import type { SpendTransaction } from '@engine/types.ts';

export interface FinalizeUploadInput {
  organizationId: string;
  projectId: string;
  fileName: string;
  fileBuffer: ArrayBuffer;
  rows: QualityRow[];
}

export interface FinalizeUploadResult {
  organizationId: string;
  datasetId: string;
  opportunitiesCount: number;
}

export async function finalizeUpload(input: FinalizeUploadInput): Promise<FinalizeUploadResult> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  const admin = createSupabaseAdminClient();

  const { data: membership } = await admin
    .from('memberships')
    .select('id')
    .eq('organization_id', input.organizationId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership) throw new Error('이 조직에 대한 권한이 없습니다.');

  const datasetId = randomUUID();

  const { error: uploadError } = await admin.storage
    .from('spend-uploads')
    .upload(`${input.organizationId}/${datasetId}/${input.fileName}`, Buffer.from(input.fileBuffer), {
      contentType: 'text/csv',
    });
  if (uploadError) throw new Error(`파일 업로드 실패: ${uploadError.message}`);

  const { error: datasetError } = await admin.from('datasets').insert({
    id: datasetId,
    project_id: input.projectId,
    filename: input.fileName,
    schema_type: 'spend',
    status: 'uploaded',
  });
  if (datasetError) throw new Error(`데이터셋 생성 실패: ${datasetError.message}`);

  const transactions: SpendTransaction[] = input.rows.map((row, i) => {
    const vendorNormalized = normalizeVendor(row.vendor_name_raw);
    return {
      id: row.transaction_id || `${datasetId}-${i}`,
      dataset_id: datasetId,
      project_id: input.projectId,
      organization_id: input.organizationId,
      transaction_date: row.transaction_date,
      vendor_raw: row.vendor_name_raw,
      vendor_normalized: vendorNormalized,
      amount: Number(row.amount),
      currency: row.currency,
      category: categorize(vendorNormalized),
    };
  });

  const { error: insertError } = await admin.from('spend_transactions').insert(transactions.map((t) => ({ ...t })));
  if (insertError) throw new Error(`거래 데이터 저장 실패: ${insertError.message}`);

  const recurring = detectRecurring(transactions);
  const duplicates = detectDuplicates(transactions);
  const priceChanges = detectPriceChanges(transactions, recurring);
  const anomalies = scoreAnomalies(transactions);
  const opportunities = generateOpportunities({
    projectId: input.projectId,
    organizationId: input.organizationId,
    duplicates,
    priceChanges,
    anomalies,
    recurring,
  });

  const { error: deleteOppError } = await admin.from('opportunities').delete().eq('project_id', input.projectId);
  if (deleteOppError) throw new Error(`기존 분석 결과 삭제 실패: ${deleteOppError.message}`);

  if (opportunities.length > 0) {
    const { error: opportunityError } = await admin.from('opportunities').insert(opportunities);
    if (opportunityError) throw new Error(`분석 결과 저장 실패: ${opportunityError.message}`);
  }

  await admin.from('datasets').update({ status: 'analyzed' }).eq('id', datasetId);

  return { organizationId: input.organizationId, datasetId, opportunitiesCount: opportunities.length };
}
