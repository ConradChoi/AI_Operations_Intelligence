import { signIn } from './actions';

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-xl font-semibold">로그인</h1>
      {searchParams.error && (
        <p className="mt-4 rounded bg-[#fde2e1] p-3 text-sm text-[#d03b3b]">{searchParams.error}</p>
      )}
      <form action={signIn} className="mt-6 space-y-4">
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
            className="mt-1 w-full rounded border border-[#e1e0d9] px-3 py-2"
          />
        </div>
        <button type="submit" className="w-full rounded bg-[#2a78d6] px-4 py-2 text-white">
          로그인
        </button>
      </form>
      <p className="mt-4 text-sm text-[#898781]">
        계정이 없으신가요? <a href="/signup" className="text-[#2a78d6] underline">회원가입</a>
      </p>
    </main>
  );
}
