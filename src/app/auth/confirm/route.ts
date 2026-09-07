import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getRequestOrigin } from '@/lib/getOrigin';

// 이메일 확인 링크가 도착하는 곳. Supabase Auth 이메일 템플릿의 "Confirm signup" 링크가
// `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` 형태로
// 이 라우트를 가리키도록 설정되어 있어야 한다 (기본 {{ .ConfirmationURL }}은
// SSR 세션 쿠키를 만들지 않는 구식 플로우라 사용하지 않는다).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = getRequestOrigin();
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/onboarding/goal';

  if (tokenHash && type) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('이메일 확인에 실패했습니다. 다시 시도해주세요.')}`,
  );
}
