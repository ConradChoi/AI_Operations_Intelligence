import { formatKrw } from '@/lib/format';

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
    return <p className="text-gray-500">아직 탐지된 절감 후보가 없습니다.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-gray-500">
          <th className="py-2">Type</th>
          <th className="py-2">Title</th>
          <th className="py-2">Est. Savings</th>
          <th className="py-2">Confidence</th>
          <th className="py-2">Effort</th>
          <th className="py-2">Priority</th>
        </tr>
      </thead>
      <tbody>
        {opportunities.map((o) => (
          <tr key={o.id} className="border-b border-gray-100">
            <td className="py-2">{o.type}</td>
            <td className="py-2">{o.title}</td>
            <td className="py-2">{formatKrw(o.estimated_value)}</td>
            <td className="py-2">{o.confidence}%</td>
            <td className="py-2">{o.effort}</td>
            <td className="py-2">{o.priority}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
