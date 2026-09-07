'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '../OnboardingContext';
import type { CreateWorkspaceResult } from './types';

export default function OnboardingWorkspacePage() {
  const router = useRouter();
  const { setWorkspace } = useOnboarding();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, industry }),
    });
    const result = (await res.json()) as CreateWorkspaceResult;
    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    setWorkspace(result.organizationId, result.projectId);
    router.push('/onboarding/upload');
  }

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-xl font-semibold">워크스페이스 만들기</h1>
      {error && <p className="mt-4 rounded bg-[#fde2e1] p-3 text-sm text-[#d03b3b]">{error}</p>}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-[#52514e]" htmlFor="name">
            조직명
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded border border-[#e1e0d9] px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-[#52514e]" htmlFor="industry">
            산업
          </label>
          <input
            id="industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="mt-1 w-full rounded border border-[#e1e0d9] px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-[#2a78d6] px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? '생성 중...' : '다음'}
        </button>
      </form>
    </main>
  );
}
