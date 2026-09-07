'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getRequestOrigin } from '@/lib/getOrigin';

export async function signUp(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    redirect('/signup?error=이메일과 비밀번호를 입력해주세요.');
  }

  const origin = getRequestOrigin();

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
