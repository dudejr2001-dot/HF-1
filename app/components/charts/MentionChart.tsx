// app/components/charts/MentionChart.tsx
'use client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { MentionDataPoint, NegativeSpike } from '@/lib/types';

interface MentionChartProps {
  data: MentionDataPoint[];
  channels: string[];
  spikes?: NegativeSpike[];
}

const CHANNEL_COLORS: Record<string, string> = {
  news: '#60a5fa',
  youtube: '#f87171',
  dc: '#34d399',
  instagram: '#a78bfa',
  blog: '#fbbf24',
  tistory: '#fb923c',
};

const CHANNEL_LABELS: Record<string, string> = {
  news: '뉴스',
  youtube: 'YouTube',
  dc: 'DC인사이드',
  instagram: '인스타그램',
  blog: '네이버 블로그',
  tistory: '티스토리',
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="text-slate-300 text-sm font-semibold mb-2">{label}</p>
        {payload.map((entry) => (
          <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
            {CHANNEL_LABELS[entry.name] || entry.name}: {entry.value}건
          </p>
        ))}
        <p className="text-white text-sm font-bold mt-1">
          합계: {payload.reduce((a, b) => a + (b.value || 0), 0)}건
        </p>
      </div>
    );
  }
  return null;
};

export function MentionChart({ data, channels, spikes = [] }: MentionChartProps) {
  const spikeSet = new Set(spikes.filter((s) => s.is_spike).map((s) => s.bucket));

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
            formatter={(value) => (
              <span className="text-slate-400 text-xs">
                {CHANNEL_LABELS[value] || value}
              </span>
            )}
          />
          {channels.map((ch) => (
            <Line
              key={ch}
              type="monotone"
              dataKey={ch}
              stroke={CHANNEL_COLORS[ch] || '#94a3b8'}
              strokeWidth={2}
              dot={{ r: 3, fill: CHANNEL_COLORS[ch] }}
              activeDot={{ r: 5 }}
            />
          ))}
          {/* Spike markers */}
          {data
            .filter((d) => spikeSet.has(d.bucket))
            .map((d) => (
              <ReferenceLine
                key={d.bucket}
                x={d.label}
                stroke="#ef4444"
                strokeDasharray="4 2"
                strokeWidth={1.5}
                label={{ value: '⚠', fill: '#ef4444', fontSize: 12 }}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
