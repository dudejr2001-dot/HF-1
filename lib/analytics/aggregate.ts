// lib/analytics/aggregate.ts
import {
  format,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  addDays,
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
  isBefore,
  parseISO,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import type {
  RawDocument,
  AnalyzedDocument,
  AnalyticsResult,
  Channel,
  Granularity,
  MentionDataPoint,
  SentimentDataPoint,
  KeywordMention,
  NegativeSpike,
  TimeBucket,
  CollectStatus,
} from '../types';
import { batchAnalyzeSentiment } from './sentiment';
import { calculateTrendKeywords } from './trends';
import { calculateZScores } from './zscore';

function getTimeBuckets(
  startDate: string,
  endDate: string,
  granularity: Granularity
): TimeBucket[] {
  const buckets: TimeBucket[] = [];
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  let current: Date;
  let getStart: (d: Date) => Date;
  let addInterval: (d: Date) => Date;
  let labelFormat: string;

  switch (granularity) {
    case 'daily':
      current = startOfDay(start);
      getStart = startOfDay;
      addInterval = (d) => addDays(d, 1);
      labelFormat = 'M/d';
      break;
    case 'weekly':
      current = startOfWeek(start, { weekStartsOn: 1 });
      getStart = (d) => startOfWeek(d, { weekStartsOn: 1 });
      addInterval = (d) => addWeeks(d, 1);
      labelFormat = 'M/d 주';
      break;
    case 'monthly':
      current = startOfMonth(start);
      getStart = startOfMonth;
      addInterval = (d) => addMonths(d, 1);
      labelFormat = 'yyyy/M';
      break;
    case 'quarterly':
      current = startOfQuarter(start);
      getStart = startOfQuarter;
      addInterval = (d) => addQuarters(d, 1);
      labelFormat = 'yyyy Q';
      break;
    case 'yearly':
      current = startOfYear(start);
      getStart = startOfYear;
      addInterval = (d) => addYears(d, 1);
      labelFormat = 'yyyy';
      break;
  }

  while (isBefore(current, end) || format(current, 'yyyy-MM-dd') <= format(end, 'yyyy-MM-dd')) {
    const bucketStart = current;
    const bucketEnd = addInterval(current);
    const bucketKey = format(bucketStart, 'yyyy-MM-dd');
    
    let label: string;
    if (granularity === 'quarterly') {
      const q = Math.ceil((bucketStart.getMonth() + 1) / 3);
      label = `${format(bucketStart, 'yyyy')}Q${q}`;
    } else {
      label = format(bucketStart, labelFormat, { locale: ko });
    }

    buckets.push({
      bucket: bucketKey,
      label,
      start: bucketStart.toISOString(),
      end: bucketEnd.toISOString(),
    });

    current = bucketEnd;
    if (buckets.length > 500) break; // safety limit
  }

  return buckets;
}

function assignToBucket(docDate: string, buckets: TimeBucket[]): string | null {
  const d = docDate.slice(0, 10);
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (d >= buckets[i].bucket) {
      return buckets[i].bucket;
    }
  }
  return buckets[0]?.bucket || null;
}

export function aggregateAnalytics(
  documents: RawDocument[],
  startDate: string,
  endDate: string,
  granularity: Granularity,
  keywords: string[],
  channels: Channel[],
  collectStatuses: CollectStatus[]
): AnalyticsResult {
  const generatedAt = new Date().toISOString();

  // Filter by channels
  const filteredDocs = documents.filter((d) => channels.includes(d.channel));

  // Sentiment analysis
  const sentimentMap = batchAnalyzeSentiment(filteredDocs);

  // Build analyzed documents
  const analyzedDocs: AnalyzedDocument[] = filteredDocs.map((doc) => {
    const s = sentimentMap.get(doc.id) || { sentiment: 'neutral' as const, score: 0 };
    return { ...doc, sentiment: s.sentiment, sentiment_score: s.score };
  });

  // Get time buckets
  const buckets = getTimeBuckets(startDate, endDate, granularity);
  const bucketKeys = buckets.map((b) => b.bucket);
  const bucketLabelMap = new Map(buckets.map((b) => [b.bucket, b.label]));

  // Channel stats
  const channelStats: Record<string, number> = {};
  for (const doc of analyzedDocs) {
    channelStats[doc.channel] = (channelStats[doc.channel] || 0) + 1;
  }

  // Mentions per bucket/channel
  const mentionMap = new Map<string, MentionDataPoint>();
  for (const bucket of buckets) {
    mentionMap.set(bucket.bucket, {
      bucket: bucket.bucket,
      label: bucket.label,
      total: 0,
      news: 0,
      youtube: 0,
      dc: 0,
      instagram: 0,
      blog: 0,
      tistory: 0,
      blind: 0,
    });
  }

  for (const doc of analyzedDocs) {
    const b = assignToBucket(doc.published_at, buckets);
    if (!b) continue;
    const point = mentionMap.get(b);
    if (!point) continue;
    point.total++;
    const ch = doc.channel as keyof MentionDataPoint;
    if (ch in point) {
      (point[ch] as number)++;
    }
  }

  const mentions = Array.from(mentionMap.values());

  // Sentiment per bucket
  const sentimentBucketMap = new Map<
    string,
    { positive: number; neutral: number; negative: number; scores: number[] }
  >();
  for (const bucket of buckets) {
    sentimentBucketMap.set(bucket.bucket, {
      positive: 0, neutral: 0, negative: 0, scores: []
    });
  }

  for (const doc of analyzedDocs) {
    const b = assignToBucket(doc.published_at, buckets);
    if (!b) continue;
    const point = sentimentBucketMap.get(b);
    if (!point) continue;
    point[doc.sentiment]++;
    point.scores.push(doc.sentiment_score);
  }

  const sentimentData: SentimentDataPoint[] = [];
  const negCounts: number[] = [];

  for (const bucket of buckets) {
    const s = sentimentBucketMap.get(bucket.bucket)!;
    const total = s.positive + s.neutral + s.negative;
    const avgScore =
      s.scores.length > 0
        ? s.scores.reduce((a, b) => a + b, 0) / s.scores.length
        : 0;

    negCounts.push(s.negative);

    sentimentData.push({
      bucket: bucket.bucket,
      label: bucket.label,
      positive: s.positive,
      neutral: s.neutral,
      negative: s.negative,
      positive_ratio: total > 0 ? Math.round((s.positive / total) * 100) : 0,
      neutral_ratio: total > 0 ? Math.round((s.neutral / total) * 100) : 0,
      negative_ratio: total > 0 ? Math.round((s.negative / total) * 100) : 0,
      avg_score: Math.round(avgScore * 100) / 100,
    });
  }

  // Add delta and z-scores for sentiment
  const negZScores = calculateZScores(negCounts);
  for (let i = 0; i < sentimentData.length; i++) {
    sentimentData[i].negative_zscore = Math.round((negZScores[i] || 0) * 100) / 100;
    if (i > 0) {
      sentimentData[i].delta_negative =
        sentimentData[i].negative - sentimentData[i - 1].negative;
    }
  }

  // Negative spikes (z-score >= 2)
  const negativeSpikes: NegativeSpike[] = [];
  for (let i = 0; i < sentimentData.length; i++) {
    const s = sentimentData[i];
    const total = s.positive + s.neutral + s.negative;
    const negRatio = total > 0 ? s.negative / total : 0;
    const zscore = s.negative_zscore || 0;

    if (zscore >= 1.5 || s.negative > 0) {
      negativeSpikes.push({
        bucket: s.bucket,
        zscore,
        negative_count: s.negative,
        negative_ratio: Math.round(negRatio * 100) / 100,
        is_spike: zscore >= 2,
      });
    }
  }

  // Trend keywords
  const trendKeywords = calculateTrendKeywords(filteredDocs, bucketKeys);

  // Keyword mentions
  const keywordMentionMap = new Map<string, { total: number; by_channel: Record<string, number>; by_bucket: Map<string, number> }>();
  for (const kw of keywords) {
    keywordMentionMap.set(kw, { total: 0, by_channel: {}, by_bucket: new Map() });
  }

  for (const doc of analyzedDocs) {
    const entry = keywordMentionMap.get(doc.keyword);
    if (!entry) continue;
    entry.total++;
    entry.by_channel[doc.channel] = (entry.by_channel[doc.channel] || 0) + 1;
    const b = assignToBucket(doc.published_at, buckets);
    if (b) {
      entry.by_bucket.set(b, (entry.by_bucket.get(b) || 0) + 1);
    }
  }

  const keywordMentions: KeywordMention[] = Array.from(keywordMentionMap.entries()).map(
    ([kw, entry]) => ({
      keyword: kw,
      total: entry.total,
      by_channel: entry.by_channel,
      by_bucket: Array.from(entry.by_bucket.entries()).map(([bucket, count]) => ({
        bucket,
        count,
      })),
    })
  );

  // Top documents (sort by negative sentiment then recency)
  const topDocs = [...analyzedDocs]
    .sort((a, b) => {
      if (a.sentiment === 'negative' && b.sentiment !== 'negative') return -1;
      if (b.sentiment === 'negative' && a.sentiment !== 'negative') return 1;
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    })
    .slice(0, 50);

  return {
    meta: {
      start_date: startDate,
      end_date: endDate,
      granularity,
      keywords,
      channels,
      generated_at: generatedAt,
      total_documents: analyzedDocs.length,
    },
    mentions,
    sentiment: sentimentData,
    trend_keywords: trendKeywords,
    keyword_mentions: keywordMentions,
    negative_spikes: negativeSpikes,
    top_documents: topDocs,
    channel_stats: channelStats,
    collect_status: collectStatuses,
  };
}
