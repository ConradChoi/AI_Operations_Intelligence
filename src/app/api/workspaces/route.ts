import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// AWS Amplify Hosting은 콘솔에 등록한 일반(비 NEXT_PUBLIC_) 환경변수를 기본적으로
// SSR 런타임에 넘기지 않는다 — amplify.yml의 build 단계에서 명시적으로
// .env.production에 적어줘야 한다. (참고: docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html)
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
