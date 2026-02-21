// app/components/charts/SentimentChart.tsx
'use client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { SentimentDataPoint } from '@/lib/types';

interface SentimentChartProps {
  data: SentimentDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((a, b) => a + (b.value || 0), 0);
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="text-slate-300 text-sm font-semibold mb-2">{label}</p>
        {payload.map((entry) => {
          const labels: Record<string, string> = {
            positive: '긍정',
            neutral: '중립',
            negative: '부정',
          };
          return (
            <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
              {labels[entry.name] || entry.name}: {entry.value}건
              {total > 0 ? ` (${Math.round((entry.value / total) * 100)}%)` : ''}
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

export function SentimentChart({ data }: SentimentChartProps) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => {
              const labels: Record<string, string> = {
                positive: '긍정',
                neutral: '중립',
                negative: '부정',
              };
              return (
                <span className="text-slate-400 text-xs">{labels[value] || value}</span>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="positive"
            stackId="1"
            stroke="#34d399"
            fill="#064e3b"
            fillOpacity={0.8}
          />
          <Area
            type="monotone"
            dataKey="neutral"
            stackId="1"
            stroke="#94a3b8"
            fill="#1e293b"
            fillOpacity={0.8}
          />
          <Area
            type="monotone"
            dataKey="negative"
            stackId="1"
            stroke="#f87171"
            fill="#450a0a"
            fillOpacity={0.8}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
