// app/components/panels/CollectStatusBar.tsx
'use client';
import type { CollectStatus } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-green-900 text-green-300 border-green-700',
  partial: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  failed: 'bg-red-900 text-red-300 border-red-700',
  skipped: 'bg-slate-700 text-slate-400 border-slate-600',
};

const STATUS_LABELS: Record<string, string> = {
  success: '✓ 성공',
  partial: '△ 부분',
  failed: '✗ 실패',
  skipped: '— 스킵',
};

interface CollectStatusBarProps {
  statuses: CollectStatus[];
}

export function CollectStatusBar({ statuses }: CollectStatusBarProps) {
  if (!statuses || statuses.length === 0) return null;

  // Group by channel
  const grouped = statuses.reduce<Record<string, CollectStatus[]>>((acc, s) => {
    if (!acc[s.channel]) acc[s.channel] = [];
    acc[s.channel].push(s);
    return acc;
  }, {});

  const hasFailure = statuses.some((s) => s.status === 'failed');
  const totalCount = statuses.reduce((a, b) => a + b.count, 0);

  return (
    <div className={`rounded-xl border p-4 ${hasFailure ? 'border-red-700/50 bg-red-950/20' : 'border-slate-700 bg-slate-800/50'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          수집 현황
        </span>
        <span className="text-xs text-slate-400">
          총 <span className="text-white font-bold">{totalCount}</span>건 수집됨
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {statuses.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border ${STATUS_COLORS[s.status]}`}
            title={s.error || ''}
          >
            <span>{STATUS_LABELS[s.status]}</span>
            <span className="opacity-70">{s.source.slice(0, 30)}</span>
            <span className="font-bold">{s.count}건</span>
          </div>
        ))}
      </div>
    </div>
  );
}
