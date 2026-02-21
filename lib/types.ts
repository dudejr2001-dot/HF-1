// lib/types.ts
export type Channel = 'news' | 'youtube' | 'dc' | 'instagram' | 'blog' | 'tistory' | 'blind';
export type Granularity = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface RawDocument {
  id: string;
  channel: Channel;
  keyword: string;
  title: string;
  text: string;
  url: string;
  published_at: string; // ISO string
  fetched_at: string;
  source_meta: {
    source?: string;
    gallery_name?: string;
    channel_title?: string;
    video_id?: string;
    view_count?: number;
    like_count?: number;
    comment_count?: number;
    [key: string]: unknown;
  };
}

export interface SentimentResult {
  sentiment: Sentiment;
  score: number; // -1 ~ +1
}

export interface AnalyzedDocument extends RawDocument {
  sentiment: Sentiment;
  sentiment_score: number;
}

export interface TimeBucket {
  bucket: string; // e.g. "2024-01-01"
  label: string;
  start: string;
  end: string;
}

export interface MentionDataPoint {
  bucket: string;
  label: string;
  total: number;
  news: number;
  youtube: number;
  dc: number;
  instagram: number;
  blog: number;
  tistory: number;
  blind: number;
}

export interface SentimentDataPoint {
  bucket: string;
  label: string;
  positive: number;
  neutral: number;
  negative: number;
  positive_ratio: number;
  neutral_ratio: number;
  negative_ratio: number;
  avg_score: number;
  delta_negative?: number; // vs previous bucket
  negative_zscore?: number;
}

export interface TrendKeyword {
  keyword: string;
  zscore: number;
  count: number;
  prev_count: number;
  delta: number;
  is_trending: boolean;
}

export interface KeywordMention {
  keyword: string;
  total: number;
  by_channel: Record<string, number>;
  by_bucket: Array<{ bucket: string; count: number }>;
}

export interface NegativeSpike {
  bucket: string;
  zscore: number;
  negative_count: number;
  negative_ratio: number;
  is_spike: boolean;
}

export interface AnalyticsResult {
  meta: {
    start_date: string;
    end_date: string;
    granularity: Granularity;
    keywords: string[];
    channels: Channel[];
    generated_at: string;
    total_documents: number;
  };
  mentions: MentionDataPoint[];
  sentiment: SentimentDataPoint[];
  trend_keywords: TrendKeyword[];
  keyword_mentions: KeywordMention[];
  negative_spikes: NegativeSpike[];
  top_documents: AnalyzedDocument[];
  channel_stats: Record<string, number>;
  collect_status: CollectStatus[];
  from_cache?: boolean;
}

export interface CollectStatus {
  channel: Channel;
  source: string;
  keyword?: string;
  status: 'success' | 'partial' | 'failed' | 'skipped';
  count: number;
  error?: string;
}

export interface AIResponse {
  summary: string;
  key_issues: string[];
  response_guide: {
    fact_check: string[];
    faq: Array<{ q: string; a: string }>;
    notice_short: string;
    notice_long: string;
    monitoring_keywords: string[];
    escalation_criteria: string[];
  };
  generated_at: string;
  is_demo: boolean;
}

export interface DashboardState {
  startDate: string;
  endDate: string;
  granularity: Granularity;
  selectedKeywords: string[];
  selectedChannels: Channel[];
  selectedGalleries: string[];
  analytics: AnalyticsResult | null;
  aiResponse: AIResponse | null;
  isLoading: boolean;
  isAiLoading: boolean;
  error: string | null;
  isDemo: boolean;
  collectStatuses: CollectStatus[];
}
