'use server';

import { randomUUID } from 'crypto';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type CreateWorkspaceResult =
  | { ok: true; organizationId: string; projectId: string }
  | { ok: false; error: string };

// Next.js는 프로덕션 빌드에서 Server Action이 던진 에러 메시지를 항상 가리므로,
// 여기서는 throw 대신 결과를 반환해 실제 원인을 화면에 그대로 보여준다.
export async function createWorkspace(name: string, industry: string): Promise<CreateWorkspaceResult> {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: '로그인이 필요합니다.' };

    const admin = createSupabaseAdminClient();
    const organizationId = randomUUID();
    const projectId = randomUUID();

    const { error: orgError } = await admin.from('organizations').insert({ id: organizationId, name, industry });
    if (orgError) return { ok: false, error: `조직 생성 실패: ${orgError.message}` };

    const { error: projectError } = await admin
      .from('projects')
      .insert({ id: projectId, organization_id: organizationId, product_type: 'spend' });
    if (projectError) return { ok: false, error: `프로젝트 생성 실패: ${projectError.message}` };

    const { error: membershipError } = await admin
      .from('memberships')
      .insert({ organization_id: organizationId, user_id: user.id, role: 'owner' });
    if (membershipError) return { ok: false, error: `멤버십 생성 실패: ${membershipError.message}` };

    return { ok: true, organizationId, projectId };
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    const debug = `hasKey=${Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)} len=${process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0}`;
    return { ok: false, error: `${message} [${debug}]` };
  }
}
