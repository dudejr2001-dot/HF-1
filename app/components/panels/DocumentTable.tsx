// app/components/panels/DocumentTable.tsx
'use client';
import { useState } from 'react';
import type { AnalyzedDocument } from '@/lib/types';

interface DocumentTableProps {
  documents: AnalyzedDocument[];
}

const CHANNEL_LABELS: Record<string, string> = {
  news: '뉴스',
  youtube: 'YouTube',
  dc: 'DC',
  instagram: 'IG',
  blog: '블로그',
  tistory: '티스토리',
};

const CHANNEL_COLORS: Record<string, string> = {
  news: 'bg-blue-900 text-blue-300',
  youtube: 'bg-red-900 text-red-300',
  dc: 'bg-green-900 text-green-300',
  instagram: 'bg-purple-900 text-purple-300',
  blog: 'bg-yellow-900 text-yellow-300',
  tistory: 'bg-orange-900 text-orange-300',
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'bg-green-900 text-green-300',
  neutral: 'bg-slate-700 text-slate-300',
  negative: 'bg-red-900 text-red-300',
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: '긍정',
  neutral: '중립',
  negative: '부정',
};

export function DocumentTable({ documents }: DocumentTableProps) {
  const [selected, setSelected] = useState<AnalyzedDocument | null>(null);
  const [page, setPage] = useState(0);
  const [filterSentiment, setFilterSentiment] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');

  const PAGE_SIZE = 10;

  const filtered = documents.filter((d) => {
    if (filterSentiment !== 'all' && d.sentiment !== filterSentiment) return false;
    if (filterChannel !== 'all' && d.channel !== filterChannel) return false;
    return true;
  });

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="flex gap-4">
      {/* Table */}
      <div className="flex-1 min-w-0">
        {/* Filters */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <select
            value={filterSentiment}
            onChange={(e) => { setFilterSentiment(e.target.value); setPage(0); }}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">전체 감성</option>
            <option value="positive">긍정</option>
            <option value="neutral">중립</option>
            <option value="negative">부정</option>
          </select>
          <select
            value={filterChannel}
            onChange={(e) => { setFilterChannel(e.target.value); setPage(0); }}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">전체 채널</option>
            <option value="news">뉴스</option>
            <option value="youtube">YouTube</option>
            <option value="dc">DC인사이드</option>
          </select>
          <span className="text-xs text-slate-500 self-center ml-auto">
            {filtered.length}건 / {documents.length}건
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/80">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">제목</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">날짜</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">채널</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">감성</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">키워드</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500 text-sm">
                    문서가 없습니다.
                  </td>
                </tr>
              ) : (
                paginated.map((doc) => (
                  <tr
                    key={doc.id}
                    className={`border-b border-slate-700/50 hover:bg-slate-700/50 cursor-pointer transition-colors ${
                      selected?.id === doc.id ? 'bg-blue-900/20 border-blue-700/50' : ''
                    }`}
                    onClick={() => setSelected(selected?.id === doc.id ? null : doc)}
                  >
                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-slate-200 text-sm truncate font-medium">
                        {doc.title}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-xs whitespace-nowrap">
                      {doc.published_at.slice(0, 10)}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${CHANNEL_COLORS[doc.channel] || 'bg-slate-700 text-slate-300'}`}>
                        {CHANNEL_LABELS[doc.channel] || doc.channel}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${SENTIMENT_COLORS[doc.sentiment]}`}>
                        {SENTIMENT_LABELS[doc.sentiment]}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-400 max-w-24 truncate">
                      {doc.keyword}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-3">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded text-xs bg-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-600 transition-colors"
            >
              이전
            </button>
            <span className="px-3 py-1.5 text-xs text-slate-400">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded text-xs bg-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-600 transition-colors"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">상세 정보</span>
            <button
              onClick={() => setSelected(null)}
              className="text-slate-500 hover:text-slate-300 text-lg leading-none"
            >
              ×
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">제목</p>
              <p className="text-slate-200 font-medium leading-snug">{selected.title}</p>
            </div>
            <div className="flex gap-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">날짜</p>
                <p className="text-slate-300 text-xs">{selected.published_at.slice(0, 10)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">채널</p>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${CHANNEL_COLORS[selected.channel]}`}>
                  {CHANNEL_LABELS[selected.channel]}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">감성</p>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${SENTIMENT_COLORS[selected.sentiment]}`}>
                  {SENTIMENT_LABELS[selected.sentiment]} ({selected.sentiment_score > 0 ? '+' : ''}{selected.sentiment_score.toFixed(2)})
                </span>
              </div>
            </div>
            {selected.text && (
              <div>
                <p className="text-xs text-slate-500 mb-1">내용 요약</p>
                <p className="text-slate-400 text-xs leading-relaxed line-clamp-6">
                  {selected.text.slice(0, 300)}
                  {selected.text.length > 300 ? '...' : ''}
                </p>
              </div>
            )}
            {selected.source_meta?.gallery_name && (
              <div>
                <p className="text-xs text-slate-500 mb-1">갤러리</p>
                <p className="text-slate-400 text-xs">{selected.source_meta.gallery_name}</p>
              </div>
            )}
            {selected.source_meta?.channel_title && (
              <div>
                <p className="text-xs text-slate-500 mb-1">유튜브 채널</p>
                <p className="text-slate-400 text-xs">{selected.source_meta.channel_title}</p>
              </div>
            )}
            {selected.source_meta?.view_count !== undefined && (
              <div>
                <p className="text-xs text-slate-500 mb-1">조회수</p>
                <p className="text-slate-400 text-xs">{(selected.source_meta.view_count as number).toLocaleString()}</p>
              </div>
            )}
            <a
              href={selected.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              원문 보기 →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
