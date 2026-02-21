'use client';
import { useEffect, useState, useCallback } from 'react';
import { useDashboardStore } from '@/app/store';
import { KpiCard } from '@/app/components/ui/KpiCard';
import { MentionChart } from '@/app/components/charts/MentionChart';
import { SentimentChart } from '@/app/components/charts/SentimentChart';
import { ChannelChart } from '@/app/components/charts/ChannelChart';
import { TrendKeywordsPanel } from '@/app/components/panels/TrendKeywordsPanel';
import { DocumentTable } from '@/app/components/panels/DocumentTable';
import { AIResponsePanel } from '@/app/components/panels/AIResponsePanel';
import { ControlPanel } from '@/app/components/panels/ControlPanel';
import { CollectStatusBar } from '@/app/components/panels/CollectStatusBar';
import type { AnalyticsResult, Channel, Granularity } from '@/lib/types';

function SectionCard({
  title,
  children,
  className = '',
  badge,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl ${className}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
        <h2 className="text-sm font-bold text-slate-200">{title}</h2>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const store = useDashboardStore();

  const [hasYouTubeKey, setHasYouTubeKey] = useState(false);
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'documents' | 'ai'>('overview');

  // Load config on mount
  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        setHasYouTubeKey(data.capabilities?.youtube || false);
        setHasOpenAIKey(data.capabilities?.openai || false);
      })
      .catch(() => {});
  }, []);

  const handleCollect = useCallback(async (forceRefresh = false) => {
    if (store.selectedKeywords.length === 0) {
      store.setError('키워드를 하나 이상 선택하세요.');
      return;
    }
    store.setLoading(true);
    store.setError(null);
    store.setDemo(false);

    try {
      const res = await fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: store.startDate,
          endDate: store.endDate,
          granularity: store.granularity,
          keywords: store.selectedKeywords,
          channels: store.selectedChannels,
          galleryIds: store.selectedGalleries,
          forceRefresh,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data: AnalyticsResult = await res.json();
      store.setAnalytics(data);
      store.setCollectStatuses(data.collect_status || []);
    } catch (err) {
      store.setError(err instanceof Error ? err.message : '수집 중 오류가 발생했습니다.');
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  const handleAISummary = useCallback(async (forceRefresh = false) => {
    if (!store.analytics) {
      store.setError('먼저 데이터를 수집하세요.');
      return;
    }
    store.setAILoading(true);
    store.setError(null);

    try {
      const res = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analytics: store.analytics, forceRefresh }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      store.setAIResponse(data);
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'AI 요약 생성 중 오류가 발생했습니다.');
    } finally {
      store.setAILoading(false);
    }
  }, [store]);

  const handleDemo = useCallback(async () => {
    store.setLoading(true);
    store.setError(null);

    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: store.startDate,
          endDate: store.endDate,
          granularity: store.granularity,
          keywords: store.selectedKeywords,
          channels: store.selectedChannels,
        }),
      });

      if (!res.ok) throw new Error('Demo data error');

      const data: AnalyticsResult = await res.json();
      store.setAnalytics(data);
      store.setCollectStatuses(data.collect_status || []);
      store.setDemo(true);

      // Auto-generate rule-based AI response
      const aiRes = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analytics: data }),
      });
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        store.setAIResponse(aiData);
      }
    } catch (err) {
      store.setError(err instanceof Error ? err.message : '데모 데이터 로딩 오류');
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  // KPI calculations
  const analytics = store.analytics;
  const totalMentions = analytics?.meta.total_documents || 0;
  const totalSentiment = analytics?.sentiment.reduce(
    (acc, s) => ({
      positive: acc.positive + s.positive,
      neutral: acc.neutral + s.neutral,
      negative: acc.negative + s.negative,
    }),
    { positive: 0, neutral: 0, negative: 0 }
  ) || { positive: 0, neutral: 0, negative: 0 };

  const negRatio =
    totalMentions > 0
      ? Math.round((totalSentiment.negative / totalMentions) * 100)
      : 0;

  const hasSpike = analytics?.negative_spikes.some((s) => s.is_spike) || false;

  const prevBucketMentions =
    analytics?.mentions && analytics.mentions.length >= 2
      ? analytics.mentions[analytics.mentions.length - 2]?.total || 0
      : 0;
  const lastBucketMentions =
    analytics?.mentions && analytics.mentions.length > 0
      ? analytics.mentions[analytics.mentions.length - 1]?.total || 0
      : 0;
  const mentionDelta = lastBucketMentions - prevBucketMentions;

  const trendingCount = analytics?.trend_keywords.filter((k) => k.is_trending).length || 0;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex">
      {/* Sidebar */}
      <ControlPanel
        startDate={store.startDate}
        endDate={store.endDate}
        granularity={store.granularity}
        selectedKeywords={store.selectedKeywords}
        selectedChannels={store.selectedChannels}
        selectedGalleries={store.selectedGalleries}
        isLoading={store.isLoading}
        hasYouTubeKey={hasYouTubeKey}
        hasOpenAIKey={hasOpenAIKey}
        onCollect={handleCollect}
        onDemo={handleDemo}
        onAISummary={handleAISummary}
        onDateChange={(s, e) => store.setDateRange(s, e)}
        onGranularityChange={(g: Granularity) => store.setGranularity(g)}
        onKeywordsChange={(kws) => store.setKeywords(kws)}
        onChannelsChange={(chs: Channel[]) => store.setChannels(chs)}
        onGalleriesChange={(gs) => store.setGalleries(gs)}
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="border-b border-slate-800 bg-slate-900/95 sticky top-0 z-40 backdrop-blur px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">
              한국주택금융공사 온라인 미디어 모니터링 대시보드
            </h1>
            <p className="text-xs text-slate-500">
              {store.startDate} ~ {store.endDate} · {store.selectedKeywords.length}개 키워드 ·{' '}
              {store.selectedChannels.join(', ')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {store.isDemo && (
              <span className="text-xs bg-amber-900/60 text-amber-300 px-2.5 py-1 rounded-full border border-amber-700 font-semibold">
                🎭 데모 모드
              </span>
            )}
            {hasSpike && analytics && (
              <span className="text-xs bg-red-900/60 text-red-300 px-2.5 py-1 rounded-full border border-red-700 font-semibold animate-pulse">
                ⚠ 부정 스파이크
              </span>
            )}
            {store.isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-blue-400">
                <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                수집 중...
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Error */}
          {store.error && (
            <div className="bg-red-950/60 border border-red-700 rounded-xl p-4 text-red-300 text-sm flex items-center gap-2">
              <span className="text-base">⚠</span>
              <span className="flex-1">{store.error}</span>
              <button onClick={() => store.setError(null)} className="text-red-500 hover:text-red-300">
                ✕
              </button>
            </div>
          )}

          {/* Welcome State */}
          {!analytics && !store.isLoading && (
            <div className="flex items-center justify-center h-[calc(100vh-180px)]">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-6">📡</div>
                <h2 className="text-2xl font-bold text-slate-200 mb-3">
                  모니터링을 시작하세요
                </h2>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                  좌측 패널에서 기간, 키워드, 채널을 설정하고<br />
                  수집/갱신 버튼을 클릭하거나 데모 데이터로 먼저 확인해보세요.
                </p>
                <button
                  onClick={handleDemo}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-blue-900/30"
                >
                  🎭 데모 데이터로 시작하기
                </button>
              </div>
            </div>
          )}

          {analytics && (
            <>
              {/* Collect Status */}
              {store.collectStatuses.length > 0 && (
                <CollectStatusBar statuses={store.collectStatuses} />
              )}

              {/* KPI Cards */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <KpiCard
                  title="총 언급량"
                  value={totalMentions.toLocaleString()}
                  subtitle={`${store.selectedChannels.length}개 채널`}
                  icon="📊"
                />
                <KpiCard
                  title="부정 비율"
                  value={`${negRatio}%`}
                  subtitle={`부정 ${totalSentiment.negative}건`}
                  trend={negRatio > 40 ? 'down' : negRatio > 20 ? 'neutral' : 'up'}
                  trendValue={`긍정 ${totalSentiment.positive}건`}
                  alertLevel={negRatio > 40 ? 'critical' : negRatio > 25 ? 'warning' : 'none'}
                  icon="😟"
                />
                <KpiCard
                  title="전기 대비"
                  value={mentionDelta >= 0 ? `+${mentionDelta}` : `${mentionDelta}`}
                  subtitle={`최근 ${lastBucketMentions}건`}
                  trend={mentionDelta > 0 ? 'up' : mentionDelta < 0 ? 'down' : 'neutral'}
                  trendValue={`전기 ${prevBucketMentions}건`}
                  icon="📈"
                />
                <KpiCard
                  title="부정 스파이크"
                  value={hasSpike ? '⚠ 감지됨' : '정상'}
                  subtitle={`트렌딩 ${trendingCount}개`}
                  alertLevel={hasSpike ? 'critical' : 'none'}
                  icon={hasSpike ? '🚨' : '✅'}
                />
              </div>

              {/* Tab Navigation */}
              <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
                {[
                  { id: 'overview' as const, label: '📊 개요' },
                  { id: 'trends' as const, label: '🔥 트렌드' },
                  { id: 'documents' as const, label: '📄 문서' },
                  { id: 'ai' as const, label: '🤖 AI 대응' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    <SectionCard
                      title="언급량 추이"
                      badge={
                        <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded">
                          {analytics.meta.granularity === 'daily' ? '일별' :
                           analytics.meta.granularity === 'weekly' ? '주별' :
                           analytics.meta.granularity === 'monthly' ? '월별' :
                           analytics.meta.granularity === 'quarterly' ? '분기별' : '연별'}
                        </span>
                      }
                    >
                      <MentionChart
                        data={analytics.mentions}
                        channels={analytics.meta.channels}
                        spikes={analytics.negative_spikes}
                      />
                    </SectionCard>

                    <SectionCard title="감성 분포 추이">
                      <SentimentChart data={analytics.sentiment} />
                    </SectionCard>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    <SectionCard title="채널별 언급량">
                      <ChannelChart data={analytics.channel_stats} />
                    </SectionCard>

                    <div className="xl:col-span-2">
                      <SectionCard title="키워드별 언급량">
                        <div className="space-y-2.5">
                          {analytics.keyword_mentions
                            .sort((a, b) => b.total - a.total)
                            .map((km) => {
                              const maxTotal = Math.max(...analytics.keyword_mentions.map((k) => k.total), 1);
                              const pct = (km.total / maxTotal) * 100;
                              return (
                                <div key={km.keyword} className="flex items-center gap-3">
                                  <span className="text-sm text-slate-300 w-36 flex-shrink-0 truncate">
                                    {km.keyword}
                                  </span>
                                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                                    <div
                                      className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full transition-all duration-500"
                                      style={{ width: `${Math.max(pct, 2)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-slate-400 w-12 text-right tabular-nums">
                                    {km.total}건
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </SectionCard>
                    </div>
                  </div>

                  {/* Negative Spike Alert */}
                  {hasSpike && (
                    <div className="bg-red-950/40 border border-red-700/50 rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-red-400 text-lg">⚠</span>
                        <h3 className="text-sm font-bold text-red-300">
                          부정 언급 급증 구간 감지 (z-score ≥ 2)
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {analytics.negative_spikes
                          .filter((s) => s.is_spike)
                          .map((spike) => (
                            <div
                              key={spike.bucket}
                              className="bg-red-900/30 border border-red-700/50 rounded-lg p-3"
                            >
                              <p className="text-red-300 font-semibold text-sm">{spike.bucket}</p>
                              <p className="text-red-400 text-xs mt-1">
                                부정 {spike.negative_count}건
                              </p>
                              <p className="text-red-500 text-xs">
                                z-score: {spike.zscore.toFixed(2)}
                              </p>
                              <p className="text-red-400 text-xs">
                                비율 {Math.round(spike.negative_ratio * 100)}%
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Trends Tab */}
              {activeTab === 'trends' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  <SectionCard
                    title="트렌드 키워드"
                    badge={
                      <span className="text-xs bg-orange-900/60 text-orange-300 border border-orange-700 px-2 py-0.5 rounded-full">
                        z ≥ 2 트렌딩
                      </span>
                    }
                  >
                    <TrendKeywordsPanel keywords={analytics.trend_keywords} />
                  </SectionCard>

                  <SectionCard title="채널별 감성 현황">
                    <div className="space-y-4">
                      {Object.entries(analytics.channel_stats)
                        .filter(([, count]) => count > 0)
                        .sort(([, a], [, b]) => b - a)
                        .map(([channel, count]) => {
                          const channelDocs = analytics.top_documents.filter(
                            (d) => d.channel === channel
                          );
                          const neg = channelDocs.filter((d) => d.sentiment === 'negative').length;
                          const pos = channelDocs.filter((d) => d.sentiment === 'positive').length;
                          const neu = channelDocs.length - neg - pos;
                          const LABELS: Record<string, string> = {
                            news: '📰 뉴스',
                            youtube: '▶ YouTube',
                            dc: '💬 DC인사이드',
                          };
                          const total = Math.max(channelDocs.length, 1);
                          return (
                            <div key={channel} className="bg-slate-700/50 rounded-xl p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold text-slate-200">
                                  {LABELS[channel] || channel}
                                </span>
                                <span className="text-xs text-slate-400 bg-slate-600 px-2 py-0.5 rounded">
                                  {count}건
                                </span>
                              </div>
                              <div className="flex h-2 rounded-full overflow-hidden gap-px">
                                <div className="bg-green-500 transition-all" style={{ width: `${(pos / total) * 100}%` }} />
                                <div className="bg-slate-500 transition-all" style={{ width: `${(neu / total) * 100}%` }} />
                                <div className="bg-red-500 transition-all" style={{ width: `${(neg / total) * 100}%` }} />
                              </div>
                              <div className="flex gap-4 mt-2 text-xs">
                                <span className="text-green-400">긍정 {pos}</span>
                                <span className="text-slate-400">중립 {neu}</span>
                                <span className="text-red-400">부정 {neg}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <SectionCard title={`핵심 문서 목록 (${analytics.top_documents.length}건)`}>
                  <DocumentTable documents={analytics.top_documents} />
                </SectionCard>
              )}

              {/* AI Tab */}
              {activeTab === 'ai' && (
                <SectionCard title="🤖 AI 분석 & 대응 가이드">
                  <AIResponsePanel
                    response={store.aiResponse}
                    hasSpike={hasSpike}
                    isLoading={store.isAiLoading}
                    hasOpenAIKey={hasOpenAIKey}
                    onGenerate={handleAISummary}
                  />
                </SectionCard>
              )}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800 py-3 px-6 flex items-center justify-between">
          <p className="text-xs text-slate-600">
            HF 온라인 모니터링 대시보드 · 한국주택금융공사 미디어 인텔리전스
          </p>
          <p className="text-xs text-slate-700">
            data/analytics에 캐시 저장 · 수집 후 재요청 시 캐시 우선 사용
          </p>
        </footer>
      </div>
    </div>
  );
}
