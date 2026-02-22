// app/components/panels/ControlPanel.tsx
'use client';
import { useEffect, useState } from 'react';
import type { Channel, Granularity } from '@/lib/types';

interface ControlPanelProps {
  startDate: string;
  endDate: string;
  granularity: Granularity;
  selectedKeywords: string[];
  selectedChannels: Channel[];
  selectedGalleries: string[];
  isLoading: boolean;
  hasYouTubeKey: boolean;
  hasOpenAIKey: boolean;
  onCollect: (forceRefresh?: boolean) => void;
  onDemo: () => void;
  onAISummary: () => void;
  onDateChange: (start: string, end: string) => void;
  onGranularityChange: (g: Granularity) => void;
  onKeywordsChange: (kws: string[]) => void;
  onChannelsChange: (chs: Channel[]) => void;
  onGalleriesChange: (gs: string[]) => void;
}

const ALL_KEYWORDS = [
  '한국주택금융공사', 'HF', '주금공',
  '보금자리론', '주택연금', '전세자금보증',
  'MBS', '커버드본드', '커버드본드 지급보증',
  '건설자금보증', '전세지킴보증',
];

const ALL_CHANNELS: { id: Channel; label: string; color: string; note?: string }[] = [
  { id: 'news',      label: '📰 뉴스',         color: 'blue' },
  { id: 'youtube',   label: '▶ YouTube',      color: 'red'  },
  { id: 'blog',      label: '📝 네이버 블로그', color: 'green' },
  { id: 'tistory',   label: '🍊 티스토리',      color: 'blue' },
  { id: 'dc',        label: '💬 DC인사이드',    color: 'green' },
  { id: 'blind',     label: '🙈 블라인드',      color: 'blue', note: '크롤러' },
  { id: 'instagram', label: '📸 인스타그램',    color: 'blue', note: 'RSS+크롤러' },
];

const ALL_GALLERIES = [
  { id: 'loan', label: '대출' },
  { id: 'house', label: '주택' },
  { id: 'finance', label: '금융' },
  { id: 'real_estate', label: '부동산 (비활성)' },
  { id: 'policy', label: '정책 (비활성)' },
];

const GRANULARITIES: { id: Granularity; label: string }[] = [
  { id: 'daily', label: '일별' },
  { id: 'weekly', label: '주별' },
  { id: 'monthly', label: '월별' },
  { id: 'quarterly', label: '분기별' },
  { id: 'yearly', label: '연별' },
];

function ToggleChip({
  label, active, onClick, color = 'blue',
}: { label: string; active: boolean; onClick: () => void; color?: string }) {
  const activeClass =
    color === 'red'
      ? 'bg-red-900/60 border-red-600 text-red-300'
      : color === 'green'
      ? 'bg-green-900/60 border-green-600 text-green-300'
      : 'bg-blue-900/60 border-blue-600 text-blue-300';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
        active ? activeClass : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
      }`}
    >
      {label}
    </button>
  );
}

export function ControlPanel({
  startDate, endDate, granularity,
  selectedKeywords, selectedChannels, selectedGalleries,
  isLoading, hasYouTubeKey, hasOpenAIKey,
  onCollect, onDemo, onAISummary,
  onDateChange, onGranularityChange,
  onKeywordsChange, onChannelsChange, onGalleriesChange,
}: ControlPanelProps) {
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);
  const showDcGalleries = selectedChannels.includes('dc');

  useEffect(() => { setLocalStart(startDate); }, [startDate]);
  useEffect(() => { setLocalEnd(endDate); }, [endDate]);

  const toggleKeyword = (kw: string) => {
    if (selectedKeywords.includes(kw)) {
      if (selectedKeywords.length > 1) onKeywordsChange(selectedKeywords.filter((k) => k !== kw));
    } else {
      onKeywordsChange([...selectedKeywords, kw]);
    }
  };

  const toggleChannel = (ch: Channel) => {
    if (selectedChannels.includes(ch)) {
      if (selectedChannels.length > 1) onChannelsChange(selectedChannels.filter((c) => c !== ch));
    } else {
      onChannelsChange([...selectedChannels, ch]);
    }
  };

  const toggleGallery = (id: string) => {
    if (selectedGalleries.includes(id)) {
      if (selectedGalleries.length > 1) onGalleriesChange(selectedGalleries.filter((g) => g !== id));
    } else {
      onGalleriesChange([...selectedGalleries, id]);
    }
  };

  const handleApplyDates = () => onDateChange(localStart, localEnd);

  return (
    <aside className="w-72 flex-shrink-0 bg-slate-900 border-r border-slate-700/50 flex flex-col h-screen overflow-y-auto">
      {/* Logo */}
      <div className="p-5 border-b border-slate-700/50">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-blue-700 flex items-center justify-center text-sm font-bold text-white">HF</div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">HF 미디어 모니터링</p>
            <p className="text-xs text-slate-500">한국주택금융공사</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-5 overflow-y-auto">
        {/* Date Range */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            📅 분석 기간
          </label>
          <div className="space-y-2">
            <input
              type="date"
              value={localStart}
              onChange={(e) => setLocalStart(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
            <input
              type="date"
              value={localEnd}
              onChange={(e) => setLocalEnd(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleApplyDates}
              className="w-full text-xs py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors border border-slate-600"
            >
              기간 적용
            </button>
          </div>
        </div>

        {/* Granularity */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            📊 집계 주기
          </label>
          <div className="flex flex-wrap gap-1.5">
            {GRANULARITIES.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => onGranularityChange(id)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  granularity === id
                    ? 'bg-blue-700 border-blue-500 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              🔑 키워드
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => onKeywordsChange(ALL_KEYWORDS)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                전체
              </button>
              <span className="text-slate-600 text-xs">|</span>
              <button
                onClick={() => onKeywordsChange([ALL_KEYWORDS[0]])}
                className="text-xs text-slate-500 hover:text-slate-400"
              >
                초기화
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ALL_KEYWORDS.map((kw) => (
              <ToggleChip
                key={kw}
                label={kw}
                active={selectedKeywords.includes(kw)}
                onClick={() => toggleKeyword(kw)}
              />
            ))}
          </div>
        </div>

        {/* Channels */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            📡 채널
          </label>
          <div className="space-y-1.5">
            {ALL_CHANNELS.map(({ id, label, color, note }) => (
              <ToggleChip
                key={id}
                label={`${label}${id === 'youtube' && !hasYouTubeKey ? ' (API키 필요)' : note ? ` (${note})` : ''}`}
                active={selectedChannels.includes(id)}
                onClick={() => toggleChannel(id)}
                color={color}
              />
            ))}
          </div>
        </div>

        {/* DC Galleries */}
        {showDcGalleries && (
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              💬 DC 갤러리
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_GALLERIES.map(({ id, label }) => (
                <ToggleChip
                  key={id}
                  label={label}
                  active={selectedGalleries.includes(id)}
                  onClick={() => toggleGallery(id)}
                  color="green"
                />
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-slate-700/50">
          <button
            onClick={() => onCollect(false)}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-600 disabled:bg-blue-900 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                수집 중...
              </>
            ) : (
              <>🔄 수집 / 갱신</>
            )}
          </button>

          <button
            onClick={() => onCollect(true)}
            disabled={isLoading}
            className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 font-medium text-xs rounded-xl transition-colors border border-slate-600"
          >
            ↻ 강제 새로고침
          </button>

          <button
            onClick={onDemo}
            disabled={isLoading}
            className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-400 font-medium text-xs rounded-xl transition-colors border border-slate-700"
          >
            🎭 데모 데이터로 보기
          </button>
        </div>

        {/* Manual Download Buttons */}
        <div className="space-y-2 pt-2 border-t border-slate-700/50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">📄 문서 다운로드</p>
          <a
            href="/api/download/manual?type=executive"
            download
            className="w-full py-2 px-4 bg-amber-700/80 hover:bg-amber-600/80 text-white font-medium text-xs rounded-xl transition-colors border border-amber-600/50 flex items-center justify-center gap-1.5"
          >
            🏢 임원 보고용 1페이지 (.docx)
          </a>
          <a
            href="/api/download/manual?type=full"
            download
            className="w-full py-2 px-4 bg-teal-800/70 hover:bg-teal-700/70 text-teal-200 font-medium text-xs rounded-xl transition-colors border border-teal-700/50 flex items-center justify-center gap-1.5"
          >
            📘 전체 활용 매뉴얼 (.docx)
          </a>
        </div>

        {/* API Status */}
        <div className="pt-2 border-t border-slate-700/50 space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">API 상태</p>
          <div className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${hasYouTubeKey ? 'bg-green-400' : 'bg-red-500'}`} />
            <span className={hasYouTubeKey ? 'text-green-400' : 'text-red-400'}>
              YouTube API {hasYouTubeKey ? '연결됨' : '미설정'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${hasOpenAIKey ? 'bg-green-400' : 'bg-yellow-500'}`} />
            <span className={hasOpenAIKey ? 'text-green-400' : 'text-yellow-400'}>
              OpenAI {hasOpenAIKey ? '연결됨' : '룰 기반 모드'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
