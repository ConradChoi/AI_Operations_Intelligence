import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// AWS Amplify에서는 Server Action이 process.env의 서버 전용 시크릿(예:
// SUPABASE_SERVICE_ROLE_KEY)을 못 읽는 경우가 확인되어, admin 클라이언트가
// 필요한 로직은 Server Action이 아니라 API 라우트로 둔다 (route.ts는 정상 동작 확인됨).
export async function POST(request: Request) {
  try {
    const { name, industry } = (await request.json()) as { name: string; industry: string };

    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const organizationId = randomUUID();
    const projectId = randomUUID();

    const { error: orgError } = await admin.from('organizations').insert({ id: organizationId, name, industry });
    if (orgError) {
      return NextResponse.json({ ok: false, error: `조직 생성 실패: ${orgError.message}` });
    }

    const { error: projectError } = await admin
      .from('projects')
      .insert({ id: projectId, organization_id: organizationId, product_type: 'spend' });
    if (projectError) {
      return NextResponse.json({ ok: false, error: `프로젝트 생성 실패: ${projectError.message}` });
    }

    const { error: membershipError } = await admin
      .from('memberships')
      .insert({ organization_id: organizationId, user_id: user.id, role: 'owner' });
    if (membershipError) {
      return NextResponse.json({ ok: false, error: `멤버십 생성 실패: ${membershipError.message}` });
    }

    return NextResponse.json({ ok: true, organizationId, projectId });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
