'use server';

import { randomUUID } from 'crypto';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export interface CreateWorkspaceResult {
  organizationId: string;
  projectId: string;
}

export async function createWorkspace(name: string, industry: string): Promise<CreateWorkspaceResult> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  const admin = createSupabaseAdminClient();
  const organizationId = randomUUID();
  const projectId = randomUUID();

  const { error: orgError } = await admin.from('organizations').insert({ id: organizationId, name, industry });
  if (orgError) throw new Error(`조직 생성 실패: ${orgError.message}`);

  const { error: projectError } = await admin
    .from('projects')
    .insert({ id: projectId, organization_id: organizationId, product_type: 'spend' });
  if (projectError) throw new Error(`프로젝트 생성 실패: ${projectError.message}`);

  const { error: membershipError } = await admin
    .from('memberships')
    .insert({ organization_id: organizationId, user_id: user.id, role: 'owner' });
  if (membershipError) throw new Error(`멤버십 생성 실패: ${membershipError.message}`);

  return { organizationId, projectId };
}
