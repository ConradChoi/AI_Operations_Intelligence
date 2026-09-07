'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '../OnboardingContext';
import { checkQuality, type QualityRow } from '@/lib/csvQuality';
import { finalizeUpload } from './actions';

export default function OnboardingQualityPage() {
  const router = useRouter();
  const { organizationId, projectId, file, rows, mapping } = useOnboarding();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId || !projectId || !file || mapping.length === 0) {
      router.replace('/onboarding/upload');
    }
  }, [organizationId, projectId, file, mapping, router]);

  const mappedRows: QualityRow[] = useMemo(() => {
    return rows.map((row) => {
      const mapped: Record<string, string> = {};
      for (const m of mapping) {
        if (m.field) mapped[m.field] = row[m.header] ?? '';
      }
      return mapped as unknown as QualityRow;
    });
  }, [rows, mapping]);

  const report = useMemo(() => checkQuality(mappedRows), [mappedRows]);

  function downloadErrorRows() {
    const allIssues = [...report.blockers, ...report.warnings];
    const lines = ['row_index,reason'];
    for (const issue of allIssues) {
      lines.push(`${issue.rowIndex},"${issue.reason}"`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quality_issues.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleStartAnalysis() {
    if (!organizationId || !projectId || !file) return;
    setSubmitting(true);
    setError(null);
    try {
      const fileBuffer = await file.arrayBuffer();
      // Convert ArrayBuffer to Uint8Array for Server Action serialization
      const uint8Array = new Uint8Array(fileBuffer);
      const result = await finalizeUpload({
        organizationId,
        projectId,
        fileName: file.name,
        fileBuffer: Array.from(uint8Array),
        rows: mappedRows,
      });
      router.push(`/workspace/${result.organizationId}/spend/overview`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 시작에 실패했습니다.');
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-semibold">데이터 품질 검사</h1>
      <p className="mt-4 text-2xl font-semibold">{report.score}점</p>
      {report.blockers.length > 0 && (
        <div className="mt-4 rounded border border-[#e34948] bg-[#fde2e1] p-4">
          <p className="font-medium text-[#d03b3b]">Blocker {report.blockers.length}건 — 수정 후 다시 업로드해주세요.</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {report.blockers.slice(0, 10).map((b, i) => (
              <li key={i}>
                행 {b.rowIndex + 1}: {b.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      {report.warnings.length > 0 && (
        <div className="mt-4 rounded border border-[#eda100] bg-[#fdf3d9] p-4">
          <p className="font-medium text-[#8a6400]">Warning {report.warnings.length}건 — 진행은 가능합니다.</p>
        </div>
      )}
      {(report.blockers.length > 0 || report.warnings.length > 0) && (
        <button onClick={downloadErrorRows} className="mt-4 text-sm text-[#2a78d6] underline">
          오류행 CSV 다운로드
        </button>
      )}
      {error && <p className="mt-4 rounded bg-[#fde2e1] p-3 text-sm text-[#d03b3b]">{error}</p>}
      <button
        onClick={handleStartAnalysis}
        disabled={!report.canProceed || submitting}
        className="mt-6 rounded bg-[#2a78d6] px-4 py-2 text-white disabled:opacity-50"
      >
        {submitting ? '분석 중...' : '분석 시작'}
      </button>
    </main>
  );
}
