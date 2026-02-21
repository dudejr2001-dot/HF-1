// app/components/panels/CollectStatusPanel.tsx
'use client';
import type { CollectStatus } from '@/lib/types';

interface CollectStatusPanelProps {
  statuses: CollectStatus[];
}

const STATUS_STYLES: Record<string, string> = {
  success: 'text-green-400 bg-green-900/40 border-green-700/50',
  partial: 'text-yellow-400 bg-yellow-900/40 border-yellow-700/50',
  failed: 'text-red-400 bg-red-900/40 border-red-700/50',
  skipped: 'text-slate-400 bg-slate-700/40 border-slate-600/50',
};
const STATUS_LABELS: Record<string, string> = {
  success: '✓ 성공',
  partial: '△ 부분',
  failed: '✗ 실패',
  skipped: '— 건너뜀',
};

export function CollectStatusPanel({ statuses }: CollectStatusPanelProps) {
  if (!statuses || statuses.length === 0) return null;
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">수집 현황</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {statuses.map((s, i) => (
          <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${STATUS_STYLES[s.status]}`}>
            <span className="truncate max-w-[180px]">{s.source}</span>
            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
              <span>{s.count}건</span>
              <span className="font-semibold">{STATUS_LABELS[s.status]}</span>
            </div>
          </div>
        ))}
      </div>
      {statuses.some(s => s.status === 'failed') && (
        <p className="text-xs text-red-400 mt-2 opacity-80">
          일부 채널 수집 실패 — 데모 데이터로 대체하거나 나중에 다시 시도하세요.
        </p>
      )}
    </div>
  );
}
