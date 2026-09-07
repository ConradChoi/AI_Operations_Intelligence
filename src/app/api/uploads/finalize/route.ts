import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
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

interface FinalizeUploadInput {
  organizationId: string;
  projectId: string;
  fileName: string;
  fileBuffer: number[];
  rows: QualityRow[];
}

// AWS Amplify에서는 Server Action이 process.env의 서버 전용 시크릿(예:
// SUPABASE_SERVICE_ROLE_KEY)을 못 읽는 경우가 확인되어, admin 클라이언트가
// 필요한 로직은 Server Action이 아니라 API 라우트로 둔다 (route.ts는 정상 동작 확인됨).
export async function POST(request: Request) {
  try {
    return await handleFinalizeUpload(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

async function handleFinalizeUpload(request: Request) {
  const input = (await request.json()) as FinalizeUploadInput;

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  const { data: membership } = await admin
    .from('memberships')
    .select('id')
    .eq('organization_id', input.organizationId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ ok: false, error: '이 조직에 대한 권한이 없습니다.' }, { status: 403 });
  }

  const datasetId = randomUUID();
  const buffer = Buffer.from(input.fileBuffer);

  const { error: uploadError } = await admin.storage
    .from('spend-uploads')
    .upload(`${input.organizationId}/${datasetId}/${input.fileName}`, buffer, {
      contentType: 'text/csv',
    });
  if (uploadError) {
    return NextResponse.json({ ok: false, error: `파일 업로드 실패: ${uploadError.message}` });
  }

  const { error: datasetError } = await admin.from('datasets').insert({
    id: datasetId,
    project_id: input.projectId,
    filename: input.fileName,
    schema_type: 'spend',
    status: 'uploaded',
  });
  if (datasetError) {
    return NextResponse.json({ ok: false, error: `데이터셋 생성 실패: ${datasetError.message}` });
  }

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
  if (insertError) {
    return NextResponse.json({ ok: false, error: `거래 데이터 저장 실패: ${insertError.message}` });
  }

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
  if (deleteOppError) {
    return NextResponse.json({ ok: false, error: `기존 분석 결과 삭제 실패: ${deleteOppError.message}` });
  }

  if (opportunities.length > 0) {
    const { error: opportunityError } = await admin.from('opportunities').insert(opportunities);
    if (opportunityError) {
      return NextResponse.json({ ok: false, error: `분석 결과 저장 실패: ${opportunityError.message}` });
    }
  }

  const { error: statusError } = await admin.from('datasets').update({ status: 'analyzed' }).eq('id', datasetId);
  if (statusError) {
    return NextResponse.json({ ok: false, error: `데이터셋 상태 업데이트 실패: ${statusError.message}` });
  }

  return NextResponse.json({
    ok: true,
    organizationId: input.organizationId,
    datasetId,
    opportunitiesCount: opportunities.length,
  });
}
