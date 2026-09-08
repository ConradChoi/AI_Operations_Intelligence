import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const GOALS = [
  { key: 'donation', label: '후원 결제 전환', enabled: false },
  { key: 'commerce', label: '이커머스 구매 전환/운영', enabled: false },
  { key: 'spend', label: '회사 지출 절감', enabled: true },
  { key: 'combined', label: '통합 진단', enabled: false },
];

export default async function OnboardingGoalPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: membership } = await supabase
      .from('memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    if (membership) {
      redirect(`/workspace/${membership.organization_id}/spend/overview`);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-semibold">무엇을 개선하고 싶으세요?</h1>
      <div className="mt-6 grid grid-cols-2 gap-4">
        {GOALS.map((goal) =>
          goal.enabled ? (
            <Link
              key={goal.key}
              href="/onboarding/workspace"
              className="rounded-lg border border-[#e1e0d9] p-6 text-center font-medium hover:border-[#2a78d6]"
            >
              {goal.label}
            </Link>
          ) : (
            <div
              key={goal.key}
              className="rounded-lg border border-[#e1e0d9] p-6 text-center text-[#898781] opacity-60"
            >
              {goal.label}
              <p className="mt-1 text-xs">Coming Soon</p>
            </div>
          ),
        )}
      </div>
    </main>
  );
}
