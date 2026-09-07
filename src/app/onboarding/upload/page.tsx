'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { useOnboarding } from '../OnboardingContext';

export default function OnboardingUploadPage() {
  const router = useRouter();
  const { setUpload } = useOnboarding();
  const [error, setError] = useState<string | null>(null);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [ready, setReady] = useState(false);

  function handleFile(file: File) {
    setError(null);
    setReady(false);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV 파싱 오류: ${results.errors[0].message}`);
          return;
        }
        const headers = results.meta.fields ?? [];
        if (headers.length === 0) {
          setError('헤더를 찾을 수 없습니다.');
          return;
        }
        setPreviewHeaders(headers);
        setPreviewRows(results.data.slice(0, 20));
        setUpload(file, headers, results.data);
        setReady(true);
      },
      error: (err) => setError(`파일을 읽을 수 없습니다: ${err.message}`),
    });
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-xl font-semibold">CSV 업로드</h1>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="mt-6"
      />
      {error && <p className="mt-4 rounded bg-[#fde2e1] p-3 text-sm text-[#d03b3b]">{error}</p>}
      {previewHeaders.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-medium text-[#52514e]">미리보기 (상위 20행)</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#e1e0d9] text-[#898781]">
                  {previewHeaders.map((h) => (
                    <th key={h} className="whitespace-nowrap py-2 pr-4 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-[#f2f1ec]">
                    {previewHeaders.map((h) => (
                      <td key={h} className="whitespace-nowrap py-2 pr-4">
                        {row[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => router.push('/onboarding/mapping')}
            disabled={!ready}
            className="mt-6 rounded bg-[#2a78d6] px-4 py-2 text-white disabled:opacity-50"
          >
            다음: 컬럼 매핑
          </button>
        </>
      )}
    </main>
  );
}
