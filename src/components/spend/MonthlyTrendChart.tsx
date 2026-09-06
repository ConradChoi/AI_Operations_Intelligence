'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatKrw } from '@/lib/format';
import type { MonthlyTotal } from '@/lib/spendAggregations';

const SERIES_COLOR = '#2a78d6';

export function MonthlyTrendChart({ data }: { data: MonthlyTotal[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-[#898781]">표시할 월별 데이터가 없습니다.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <CartesianGrid vertical={false} stroke="#e1e0d9" />
        <XAxis
          dataKey="month"
          tick={{ fill: '#898781', fontSize: 12 }}
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
        <Line
          type="monotone"
          dataKey="total"
          stroke={SERIES_COLOR}
          strokeWidth={2}
          dot={{ r: 3, fill: SERIES_COLOR, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
