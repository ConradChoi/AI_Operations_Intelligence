import { formatKrw } from '@/lib/format';
import type { VendorTotal } from '@/lib/spendAggregations';

export function TopVendorsTable({ vendors, totalSpend }: { vendors: VendorTotal[]; totalSpend: number }) {
  if (vendors.length === 0) {
    return <p className="text-sm text-[#898781]">표시할 공급사 데이터가 없습니다.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-[#e1e0d9] text-[#898781]">
          <th className="py-2 font-normal">#</th>
          <th className="py-2 font-normal">공급사</th>
          <th className="py-2 font-normal">지출액</th>
          <th className="py-2 font-normal">비중</th>
        </tr>
      </thead>
      <tbody>
        {vendors.map((v, i) => (
          <tr key={v.vendor} className="border-b border-[#f2f1ec]">
            <td className="py-2 text-[#898781]">{i + 1}</td>
            <td className="py-2 text-[#0b0b0b]">{v.vendor}</td>
            <td className="py-2 tabular-nums text-[#0b0b0b]">{formatKrw(v.total)}</td>
            <td className="py-2 tabular-nums text-[#52514e]">
              {totalSpend > 0 ? ((v.total / totalSpend) * 100).toFixed(1) : '0.0'}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
