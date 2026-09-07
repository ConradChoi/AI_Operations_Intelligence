'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function signUp(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    redirect('/signup?error=이메일과 비밀번호를 입력해주세요.');
  }

  // 지금 요청이 실제로 들어온 origin을 그대로 써서, 로컬에서 가입하면 로컬로,
  // 배포된 URL에서 가입하면 그 URL로 이메일 확인 링크가 돌아오게 한다 —
  // Supabase 프로젝트의 고정된 Site URL(보통 localhost 기본값)에 의존하지 않는다.
  const headersList = headers();
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host');
  const protocol = headersList.get('x-forwarded-proto') ?? 'http';
  const origin = `${protocol}://${host}`;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect('/signup?checkEmail=1');
  }

  redirect('/onboarding/goal');
}
