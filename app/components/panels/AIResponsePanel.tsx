// app/components/panels/AIResponsePanel.tsx
'use client';
import { useState } from 'react';
import type { AIResponse } from '@/lib/types';

interface AIResponsePanelProps {
  response: AIResponse | null;
  isLoading: boolean;
  hasOpenAIKey: boolean;
  hasSpike: boolean;
  onGenerate: (forceRefresh?: boolean) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="text-xs px-2 py-1 rounded bg-slate-600 hover:bg-slate-500 text-slate-300 transition-colors"
    >
      {copied ? '✓ 복사됨' : '복사'}
    </button>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-750 text-left transition-colors"
      >
        <span className="text-sm font-semibold text-slate-200">{title}</span>
        <span className="text-slate-500 text-sm">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 py-3 bg-slate-800/50">{children}</div>}
    </div>
  );
}

export function AIResponsePanel({ response, isLoading, hasOpenAIKey, hasSpike, onGenerate }: AIResponsePanelProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'response'>('summary');

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {hasSpike && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-900/40 border border-red-700/50 px-3 py-1.5 rounded-lg animate-pulse">
              ⚠ 부정 스파이크 감지 — 대응 필요
            </span>
          )}
          {response?.is_demo && (
            <span className="text-xs text-yellow-500 bg-yellow-900/30 border border-yellow-700/50 px-2 py-1 rounded-lg">
              룰 기반 자동 생성 (OpenAI 미연동)
            </span>
          )}
          {!response?.is_demo && response && (
            <span className="text-xs text-green-400 bg-green-900/30 border border-green-700/50 px-2 py-1 rounded-lg">
              ✓ GPT-4o-mini 생성
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {response && (
            <button
              onClick={() => onGenerate(true)}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-50 transition-colors border border-slate-600"
            >
              {isLoading ? '생성 중...' : '↻ 갱신'}
            </button>
          )}
          <button
            onClick={() => onGenerate(false)}
            disabled={isLoading || !response === false}
            className={`text-xs px-4 py-1.5 rounded-lg font-semibold transition-colors ${
              hasOpenAIKey
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-600 hover:bg-slate-500 text-slate-200'
            } disabled:opacity-50`}
          >
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                AI 분석 중...
              </span>
            ) : (
              `${hasOpenAIKey ? '🤖 AI' : '📋 자동'} 요약 생성/갱신`
            )}
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-700 rounded animate-pulse" style={{ width: `${85 - i * 10}%` }} />
          ))}
        </div>
      )}

      {/* No response yet */}
      {!isLoading && !response && (
        <div className="text-center py-12 text-slate-500">
          <div className="text-4xl mb-3">🤖</div>
          <p className="text-sm">위 버튼을 눌러 AI 요약/대응 방향을 생성하세요.</p>
          {!hasOpenAIKey && (
            <p className="text-xs mt-2 text-slate-600">
              OPENAI_API_KEY 미설정 시 룰 기반 자동 생성이 적용됩니다.
            </p>
          )}
        </div>
      )}

      {/* Response content */}
      {!isLoading && response && (
        <div className="space-y-4">
          {/* Tab switcher */}
          <div className="flex gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
            {(['summary', 'response'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 text-xs py-1.5 rounded font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'summary' ? '요약 & 이슈' : '대응 방향'}
              </button>
            ))}
          </div>

          {activeTab === 'summary' && (
            <div className="space-y-4">
              {/* Summary */}
              <Section title="📋 전체 요약">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-slate-300 text-sm leading-relaxed flex-1">{response.summary}</p>
                  <CopyButton text={response.summary} />
                </div>
              </Section>

              {/* Key Issues */}
              {response.key_issues?.length > 0 && (
                <Section title="🔍 핵심 이슈">
                  <ul className="space-y-2">
                    {response.key_issues.map((issue, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-blue-400 font-bold mt-0.5 text-xs">{String(i + 1).padStart(2, '0')}</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Generated at */}
              <p className="text-xs text-slate-600 text-right">
                생성: {new Date(response.generated_at).toLocaleString('ko-KR')}
              </p>
            </div>
          )}

          {activeTab === 'response' && response.response_guide && (
            <div className="space-y-4">
              {/* Fact Check */}
              {response.response_guide.fact_check?.length > 0 && (
                <Section title="✅ 사실확인 체크리스트">
                  <ul className="space-y-1.5">
                    {response.response_guide.fact_check.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-green-400 mt-0.5">□</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* FAQ */}
              {response.response_guide.faq?.length > 0 && (
                <Section title="❓ FAQ 초안" defaultOpen={false}>
                  <div className="space-y-3">
                    {response.response_guide.faq.map((item, i) => (
                      <div key={i} className="border-l-2 border-blue-600 pl-3">
                        <p className="text-sm text-blue-300 font-medium mb-1">Q. {item.q}</p>
                        <p className="text-sm text-slate-400 leading-relaxed">A. {item.a}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Notices */}
              {response.response_guide.notice_short && (
                <Section title="📢 공지문 (단문)" defaultOpen={false}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-slate-300 text-sm leading-relaxed flex-1 bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                      {response.response_guide.notice_short}
                    </p>
                    <CopyButton text={response.response_guide.notice_short} />
                  </div>
                </Section>
              )}

              {response.response_guide.notice_long && (
                <Section title="📄 공지문 (장문)" defaultOpen={false}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-slate-300 text-sm leading-relaxed flex-1 bg-slate-700/50 rounded-lg p-3 border border-slate-600 whitespace-pre-line">
                      {response.response_guide.notice_long}
                    </p>
                    <CopyButton text={response.response_guide.notice_long} />
                  </div>
                </Section>
              )}

              {/* Monitoring Keywords */}
              {response.response_guide.monitoring_keywords?.length > 0 && (
                <Section title="🔎 추가 모니터링 키워드" defaultOpen={false}>
                  <div className="flex flex-wrap gap-2">
                    {response.response_guide.monitoring_keywords.map((kw, i) => (
                      <span key={i} className="text-xs px-3 py-1 bg-blue-900/50 border border-blue-700 text-blue-300 rounded-full font-medium">
                        {kw}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Escalation Criteria */}
              {response.response_guide.escalation_criteria?.length > 0 && (
                <Section title="🚨 에스컬레이션 기준" defaultOpen={false}>
                  <ul className="space-y-1.5">
                    {response.response_guide.escalation_criteria.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-red-400 mt-0.5 text-xs">▶</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
