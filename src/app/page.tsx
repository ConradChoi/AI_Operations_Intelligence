import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl p-8 text-center">
      <h1 className="text-2xl font-semibold">AI Operations Intelligence — Spend</h1>
      <p className="mt-4 text-gray-600">결제까지 더 짧게. 운영은 더 빠르게. 지출은 더 가볍게.</p>
      <Link
        href="/demo/spend/overview"
        className="mt-8 inline-block rounded bg-blue-600 px-6 py-3 text-white"
      >
        샘플로 체험하기
      </Link>
    </main>
  );
}
