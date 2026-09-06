import { formatKrw } from '@/lib/format';
import { opportunityTypeMeta } from '@/lib/opportunityTypeMeta';

export interface OpportunityRow {
  id: string;
  type: string;
  title: string;
  estimated_value: number;
  confidence: number;
  effort: string;
  priority: number;
}

export function OpportunityTable({ opportunities }: { opportunities: OpportunityRow[] }) {
  if (opportunities.length === 0) {
    return <p className="text-[#898781]">아직 탐지된 절감 후보가 없습니다.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-[#e1e0d9] text-[#898781]">
          <th className="py-2 font-normal">Type</th>
          <th className="py-2 font-normal">Title</th>
          <th className="py-2 font-normal">Est. Savings</th>
          <th className="py-2 font-normal">Confidence</th>
          <th className="py-2 font-normal">Effort</th>
          <th className="py-2 font-normal">Priority</th>
        </tr>
      </thead>
      <tbody>
        {opportunities.map((o) => {
          const meta = opportunityTypeMeta(o.type);
          return (
            <tr key={o.id} className="border-b border-[#f2f1ec]">
              <td className="py-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs"
                  style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden="true" />
                  {meta.label}
                </span>
              </td>
              <td className="py-2 text-[#0b0b0b]">{o.title}</td>
              <td className="py-2 tabular-nums text-[#0b0b0b]">{formatKrw(o.estimated_value)}</td>
              <td className="py-2 tabular-nums text-[#52514e]">{o.confidence}%</td>
              <td className="py-2 text-[#52514e]">{o.effort}</td>
              <td className="py-2 tabular-nums text-[#52514e]">{o.priority}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
