// lib/analytics/trends.ts
import stopwordsConfig from '../../config/stopwords.json';
import keywordsConfig from '../../config/keywords.json';
import type { RawDocument, TrendKeyword } from '../types';
import { calculateZScores } from './zscore';

const STOPWORDS = new Set(stopwordsConfig.ko);
const HF_KEYWORDS = new Set(keywordsConfig.all.map((k: string) => k.toLowerCase()));

/**
 * Extract Korean nouns/keywords from text using simple pattern matching
 * This is a lightweight alternative to full morphological analysis
 */
export function extractKeywords(text: string): string[] {
  if (!text) return [];

  // Remove URLs, special chars, numbers-only tokens
  const cleaned = text
    .replace(/https?:\/\/[^\s]+/g, ' ')
    .replace(/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g, ' ')
    .replace(/[0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Split by whitespace
  const tokens = cleaned.split(/\s+/);

  const keywords: string[] = [];
  for (const token of tokens) {
    const t = token.trim();
    if (!t) continue;
    if (t.length < stopwordsConfig.short_length_min) continue;
    if (STOPWORDS.has(t)) continue;
    // Skip pure English single letters or very short tokens
    if (/^[a-zA-Z]{1,1}$/.test(t)) continue;
    // Keep HF keywords regardless
    if (HF_KEYWORDS.has(t.toLowerCase())) {
      keywords.push(t);
      continue;
    }
    // Skip tokens that are mostly special chars
    if (/^[ㄱ-ㅎㅏ-ㅣ]+$/.test(t)) continue;
    // Accept Korean words (2+ chars) or meaningful English words (3+ chars)
    if (/[가-힣]{2,}/.test(t) || /[a-zA-Z]{3,}/.test(t)) {
      keywords.push(t);
    }
  }

  return keywords;
}

interface BucketKeywordFreq {
  bucket: string;
  frequencies: Map<string, number>;
}

/**
 * Calculate trend keywords using z-score across time buckets
 */
export function calculateTrendKeywords(
  docs: RawDocument[],
  buckets: string[]
): TrendKeyword[] {
  if (docs.length === 0 || buckets.length === 0) return [];

  // Build per-bucket keyword frequencies
  const bucketMap = new Map<string, Map<string, number>>();
  for (const bucket of buckets) {
    bucketMap.set(bucket, new Map());
  }

  for (const doc of docs) {
    const docDate = doc.published_at.slice(0, 10);
    // Find which bucket this doc belongs to
    let assignedBucket: string | null = null;
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (docDate >= buckets[i]) {
        assignedBucket = buckets[i];
        break;
      }
    }
    if (!assignedBucket) assignedBucket = buckets[0];

    const freqMap = bucketMap.get(assignedBucket)!;
    const keywords = extractKeywords(`${doc.title} ${doc.text}`);

    for (const kw of keywords) {
      freqMap.set(kw, (freqMap.get(kw) || 0) + 1);
    }
  }

  // Gather all unique keywords
  const allKeywords: string[] = [];
  const allKeywordsSet = new Set<string>();
  bucketMap.forEach((freqMap) => {
    freqMap.forEach((_, kw) => {
      if (!allKeywordsSet.has(kw)) {
        allKeywordsSet.add(kw);
        allKeywords.push(kw);
      }
    });
  });

  // For each keyword, compute z-score across buckets
  const results: TrendKeyword[] = [];
  const prevBucket = buckets.length >= 2 ? buckets[buckets.length - 2] : null;

  for (const kw of allKeywords) {
    const timeSeries = buckets.map(
      (b) => bucketMap.get(b)?.get(kw) || 0
    );

    const zscores = calculateZScores(timeSeries);
    const lastZScore = zscores[zscores.length - 1] || 0;
    const lastCount = timeSeries[timeSeries.length - 1] || 0;
    const prevCount = prevBucket
      ? (bucketMap.get(prevBucket)?.get(kw) || 0)
      : 0;

    if (lastCount === 0 && lastZScore < 2) continue;

    results.push({
      keyword: kw,
      zscore: Math.round(lastZScore * 100) / 100,
      count: lastCount,
      prev_count: prevCount,
      delta: lastCount - prevCount,
      is_trending: lastZScore >= 2,
    });
  }

  // Sort by z-score descending
  results.sort((a, b) => b.zscore - a.zscore);

  return results.slice(0, 50); // Top 50
}
