import { createSupabaseServerClient } from '@/lib/supabase/server';
import { signOut } from '@/app/auth/actions';

export default async function AuthHeader() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <header className="flex items-center justify-end gap-3 border-b border-[#e1e0d9] px-6 py-3 text-sm text-[#52514e]">
      <span>{user.email}</span>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded border border-[#e1e0d9] px-3 py-1 text-[#0b0b0b] hover:border-[#2a78d6]"
        >
          로그아웃
        </button>
      </form>
    </header>
  );
}
