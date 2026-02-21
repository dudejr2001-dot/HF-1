// app/components/charts/ChannelChart.tsx
'use client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ChannelChartProps {
  data: Record<string, number>;
}

const CHANNEL_LABELS: Record<string, string> = {
  news: '뉴스',
  youtube: 'YouTube',
  dc: 'DC인사이드',
  instagram: '인스타그램',
  blog: '네이버 블로그',
  tistory: '티스토리',
  blind: '블라인드',
};

const CHANNEL_COLORS: Record<string, string> = {
  news: '#60a5fa',
  youtube: '#f87171',
  dc: '#34d399',
  instagram: '#a78bfa',
  blog: '#fbbf24',
  tistory: '#fb923c',
  blind: '#f472b6',
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { channel: string; count: number } }> }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="text-white text-sm font-semibold">{d.channel}</p>
        <p className="text-slate-300 text-sm">{d.count}건</p>
      </div>
    );
  }
  return null;
};

export function ChannelChart({ data }: ChannelChartProps) {
  const chartData = Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([channel, count]) => ({
      channel: CHANNEL_LABELS[channel] || channel,
      channelKey: channel,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="channel"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.channelKey}
                fill={CHANNEL_COLORS[entry.channelKey] || '#60a5fa'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
