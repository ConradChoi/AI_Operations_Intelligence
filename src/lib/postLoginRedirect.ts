// 데모 계정(NEXT_PUBLIC_DEMO_ACCOUNT_EMAIL)으로 로그인하면 온보딩 대신
// 바로 데모 대시보드로 보낸다. 이메일 자체는 민감정보가 아니라 NEXT_PUBLIC_로 둔다.
export function getPostLoginRedirect(email: string | null | undefined): string {
  const demoEmail = process.env.NEXT_PUBLIC_DEMO_ACCOUNT_EMAIL;
  if (demoEmail && email && email.toLowerCase() === demoEmail.toLowerCase()) {
    return '/demo/spend/overview';
  }
  return '/onboarding/goal';
}
