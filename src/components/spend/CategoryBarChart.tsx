'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatKrw } from '@/lib/format';
import type { CategoryTotal } from '@/lib/spendAggregations';

const SERIES_COLOR = '#2a78d6';

export function CategoryBarChart({ data }: { data: CategoryTotal[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-[#898781]">표시할 카테고리 데이터가 없습니다.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 32, left: 8 }} barCategoryGap="24%">
        <CartesianGrid vertical={false} stroke="#e1e0d9" />
        <XAxis
          dataKey="category"
          interval={0}
          angle={-20}
          textAnchor="end"
          height={50}
          tick={{ fill: '#898781', fontSize: 11 }}
          axisLine={{ stroke: '#c3c2b7' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#898781', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => `${Math.round(value / 1_000_000)}M`}
        />
        <Tooltip
          formatter={(value) => formatKrw(Number(value))}
          contentStyle={{ borderRadius: 8, borderColor: '#e1e0d9', fontSize: 13 }}
        />
        <Bar dataKey="total" fill={SERIES_COLOR} radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
