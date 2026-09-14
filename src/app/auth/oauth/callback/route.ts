import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getRequestOrigin } from '@/lib/getOrigin';
import { getPostLoginRedirect } from '@/lib/postLoginRedirect';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = getRequestOrigin();
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next');

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const next = nextParam ?? getPostLoginRedirect(user?.email);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('Google 로그인에 실패했습니다. 다시 시도해주세요.')}`,
  );
}
