import type { ReactNode } from 'react';

export interface StatTileProps {
  label: string;
  value: string;
  icon: ReactNode;
  delta?: {
    pct: number;
    label: string;
  };
  sublabel?: string;
}

export function StatTile({ label, value, icon, delta, sublabel }: StatTileProps) {
  const isUp = (delta?.pct ?? 0) >= 0;
  return (
    <div className="rounded-lg border border-[#e1e0d9] bg-[#fcfcfb] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#52514e]">{label}</p>
        <span className="text-[#898781]" aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className="mt-1 text-2xl font-semibold text-[#0b0b0b]">{value}</p>
      {delta && (
        <p className={`mt-1 text-xs ${isUp ? 'text-[#d03b3b]' : 'text-[#006300]'}`}>
          {delta.label} {isUp ? '▲' : '▼'} {Math.abs(delta.pct).toFixed(1)}%
        </p>
      )}
      {sublabel && <p className="mt-1 text-xs text-[#898781]">{sublabel}</p>}
    </div>
  );
}
