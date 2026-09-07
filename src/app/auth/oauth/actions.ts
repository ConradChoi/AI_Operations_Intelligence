'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getRequestOrigin } from '@/lib/getOrigin';

export async function signInWithGoogle() {
  const origin = getRequestOrigin();

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/oauth/callback`,
    },
  });

  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? 'Google 로그인을 시작할 수 없습니다.')}`);
  }

  redirect(data.url);
}
