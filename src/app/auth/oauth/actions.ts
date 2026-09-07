'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function signInWithGoogle() {
  const headersList = headers();
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host');
  const protocol = headersList.get('x-forwarded-proto') ?? 'http';
  const origin = `${protocol}://${host}`;

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
