'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '../OnboardingContext';
import { suggestColumnMapping, STANDARD_FIELDS } from '@/lib/columnMapping';

export default function OnboardingMappingPage() {
  const router = useRouter();
  const { headers, setMapping: saveMapping } = useOnboarding();
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    if (headers.length === 0) {
      router.replace('/onboarding/upload');
      return;
    }
    const suggestions = suggestColumnMapping(headers);
    const initial: Record<string, string> = {};
    for (const s of suggestions) {
      if (s.field) initial[s.header] = s.field;
    }
    setMapping(initial);
  }, [headers, router]);

  const requiredFields = STANDARD_FIELDS.filter((f) => f.required).map((f) => f.field);
  const mappedFields = new Set(Object.values(mapping));
  const allRequiredMapped = requiredFields.every((f) => mappedFields.has(f));

  function handleNext() {
    saveMapping(headers.map((header) => ({ header, field: mapping[header] ?? null })));
    router.push('/onboarding/quality');
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-semibold">컬럼 매핑</h1>
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#e1e0d9] text-[#898781]">
            <th className="py-2 font-normal">업로드 헤더</th>
            <th className="py-2 font-normal">표준 컬럼</th>
          </tr>
        </thead>
        <tbody>
          {headers.map((header) => (
            <tr key={header} className="border-b border-[#f2f1ec]">
              <td className="py-2">{header}</td>
              <td className="py-2">
                <select
                  value={mapping[header] ?? ''}
                  onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                  className="rounded border border-[#e1e0d9] px-2 py-1"
                >
                  <option value="">(매핑 안 함)</option>
                  {STANDARD_FIELDS.map((f) => (
                    <option key={f.field} value={f.field}>
                      {f.field}
                      {f.required ? ' *' : ''}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!allRequiredMapped && (
        <p className="mt-4 text-sm text-[#d03b3b]">필수 컬럼(*)을 모두 매핑해야 다음으로 진행할 수 있습니다.</p>
      )}
      <button
        onClick={handleNext}
        disabled={!allRequiredMapped}
        className="mt-6 rounded bg-[#2a78d6] px-4 py-2 text-white disabled:opacity-50"
      >
        다음: 품질 검사
      </button>
    </main>
  );
}
