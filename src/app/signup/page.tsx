import { signUp } from './actions';
import { signInWithGoogle } from '@/app/auth/oauth/actions';

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string; checkEmail?: string };
}) {
  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-xl font-semibold">회원가입</h1>
      {searchParams.checkEmail && (
        <p className="mt-4 rounded bg-[#cde2fb] p-3 text-sm text-[#0b0b0b]">
          이메일로 확인 링크를 보냈습니다. 확인 후 로그인해주세요.
        </p>
      )}
      {searchParams.error && (
        <p className="mt-4 rounded bg-[#fde2e1] p-3 text-sm text-[#d03b3b]">{searchParams.error}</p>
      )}
      <form action={signUp} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-[#52514e]" htmlFor="email">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded border border-[#e1e0d9] px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-[#52514e]" htmlFor="password">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="mt-1 w-full rounded border border-[#e1e0d9] px-3 py-2"
          />
        </div>
        <button type="submit" className="w-full rounded bg-[#2a78d6] px-4 py-2 text-white">
          가입하기
        </button>
      </form>
      <div className="my-4 flex items-center gap-3 text-xs text-[#898781]">
        <span className="h-px flex-1 bg-[#e1e0d9]" />
        또는
        <span className="h-px flex-1 bg-[#e1e0d9]" />
      </div>
      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="w-full rounded border border-[#e1e0d9] px-4 py-2 text-sm text-[#0b0b0b]"
        >
          Google로 계속하기
        </button>
      </form>
      <p className="mt-4 text-sm text-[#898781]">
        이미 계정이 있으신가요? <a href="/login" className="text-[#2a78d6] underline">로그인</a>
      </p>
    </main>
  );
}
