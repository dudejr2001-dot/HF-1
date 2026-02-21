// app/components/panels/TrendKeywordsPanel.tsx
'use client';
import type { TrendKeyword } from '@/lib/types';

interface TrendKeywordsPanelProps {
  keywords: TrendKeyword[];
}

export function TrendKeywordsPanel({ keywords }: TrendKeywordsPanelProps) {
  if (!keywords || keywords.length === 0) {
    return (
      <div className="text-slate-500 text-sm text-center py-8">
        트렌드 키워드 데이터가 없습니다.
      </div>
    );
  }

  const trending = keywords.filter((k) => k.is_trending);
  const rising = keywords.filter((k) => !k.is_trending && k.delta > 0);
  const others = keywords.filter((k) => !k.is_trending && k.delta <= 0).slice(0, 5);

  const getZscoreColor = (zscore: number) => {
    if (zscore >= 3) return 'bg-red-900 text-red-300 border-red-700';
    if (zscore >= 2) return 'bg-orange-900 text-orange-300 border-orange-700';
    if (zscore >= 1) return 'bg-yellow-900 text-yellow-300 border-yellow-700';
    return 'bg-slate-700 text-slate-400 border-slate-600';
  };

  const renderKeyword = (k: TrendKeyword) => (
    <div
      key={k.keyword}
      className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full border font-mono font-semibold ${getZscoreColor(k.zscore)}`}
        >
          z={k.zscore.toFixed(1)}
        </span>
        <span className="text-sm text-slate-200 font-medium">{k.keyword}</span>
        {k.is_trending && (
          <span className="text-xs bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded font-semibold">
            🔥 트렌딩
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>{k.count}건</span>
        {k.delta > 0 && (
          <span className="text-green-400 font-semibold">+{k.delta}</span>
        )}
        {k.delta < 0 && (
          <span className="text-red-400 font-semibold">{k.delta}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {trending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">
              트렌딩 (z ≥ 2)
            </span>
          </div>
          <div className="space-y-1.5">
            {trending.map(renderKeyword)}
          </div>
        </div>
      )}

      {rising.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">
              상승 중
            </span>
          </div>
          <div className="space-y-1.5">
            {rising.slice(0, 5).map(renderKeyword)}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-slate-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              기타
            </span>
          </div>
          <div className="space-y-1.5">
            {others.map(renderKeyword)}
          </div>
        </div>
      )}
    </div>
  );
}
