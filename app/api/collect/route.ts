// app/api/collect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { collectNews } from '@/lib/collectors/newsRss';
import { collectYouTube } from '@/lib/collectors/youtube';
import { collectDC } from '@/lib/collectors/dc';
import { collectNaverBlog } from '@/lib/collectors/naverBlog';
import { collectTistory } from '@/lib/collectors/tistory';
import { collectBlind } from '@/lib/collectors/blind';
import { collectInstagram } from '@/lib/collectors/instagram';
import { aggregateAnalytics } from '@/lib/analytics/aggregate';
import {
  saveAnalytics,
  loadAnalytics,
  getAnalyticsCacheKey,
} from '@/lib/cache';
import type { Channel, Granularity, RawDocument, CollectStatus } from '@/lib/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      startDate,
      endDate,
      granularity = 'monthly',
      keywords = [],
      channels = ['news', 'youtube', 'dc'],
      galleryIds = ['real_estate', 'finance', 'loan', 'policy'],
      forceRefresh = false,
    } = body as {
      startDate: string;
      endDate: string;
      granularity: Granularity;
      keywords: string[];
      channels: Channel[];
      galleryIds: string[];
      forceRefresh: boolean;
    };

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const cacheKey = getAnalyticsCacheKey(startDate, endDate, granularity, keywords, channels);

    // Check cache first
    if (!forceRefresh) {
      const cached = await loadAnalytics(cacheKey);
      if (cached) {
        return NextResponse.json({ ...cached, from_cache: true });
      }
    }

    const allDocuments: RawDocument[] = [];
    const allStatuses: CollectStatus[] = [];

    const ytApiKey = process.env.YOUTUBE_API_KEY;

    // ── 뉴스 ──────────────────────────────────────────────
    if (channels.includes('news')) {
      try {
        const { documents, statuses } = await collectNews(keywords, startDate, endDate);
        allDocuments.push(...documents);
        allStatuses.push(...statuses);
      } catch (err) {
        allStatuses.push({ channel: 'news', source: 'Google News RSS', status: 'failed', count: 0, error: String(err) });
      }
    }

    // ── YouTube ───────────────────────────────────────────
    if (channels.includes('youtube')) {
      if (ytApiKey) {
        try {
          const { documents, statuses } = await collectYouTube(keywords, startDate, endDate, ytApiKey);
          allDocuments.push(...documents);
          allStatuses.push(...statuses);
        } catch (err) {
          allStatuses.push({ channel: 'youtube', source: 'YouTube Data API', status: 'failed', count: 0, error: String(err) });
        }
      } else {
        allStatuses.push({ channel: 'youtube', source: 'YouTube Data API', status: 'skipped', count: 0, error: 'YOUTUBE_API_KEY 미설정' });
      }
    }

    // ── DC인사이드 ────────────────────────────────────────
    if (channels.includes('dc')) {
      try {
        const { documents, statuses } = await collectDC(keywords, startDate, endDate, galleryIds);
        allDocuments.push(...documents);
        allStatuses.push(...statuses);
      } catch (err) {
        allStatuses.push({ channel: 'dc', source: 'DCInside 갤러리', status: 'failed', count: 0, error: String(err) });
      }
    }

    // ── 네이버 블로그 ─────────────────────────────────────
    if (channels.includes('blog')) {
      try {
        const { documents, statuses } = await collectNaverBlog(keywords, startDate, endDate);
        allDocuments.push(...documents);
        allStatuses.push(...statuses);
      } catch (err) {
        allStatuses.push({ channel: 'blog', source: '네이버 블로그', status: 'failed', count: 0, error: String(err) });
      }
    }

    // ── 티스토리 ──────────────────────────────────────────
    if (channels.includes('tistory')) {
      try {
        const { documents, statuses } = await collectTistory(keywords, startDate, endDate);
        allDocuments.push(...documents);
        allStatuses.push(...statuses);
      } catch (err) {
        allStatuses.push({ channel: 'tistory', source: '티스토리', status: 'failed', count: 0, error: String(err) });
      }
    }

    // ── 블라인드 ──────────────────────────────────────────
    if (channels.includes('blind')) {
      try {
        const { documents, statuses } = await collectBlind(keywords, startDate, endDate);
        allDocuments.push(...documents);
        allStatuses.push(...statuses);
      } catch (err) {
        allStatuses.push({ channel: 'blind', source: '블라인드', status: 'failed', count: 0, error: String(err) });
      }
    }

    // ── 인스타그램 ────────────────────────────────────────
    if (channels.includes('instagram')) {
      try {
        const { documents, statuses } = await collectInstagram(keywords, startDate, endDate);
        allDocuments.push(...documents);
        allStatuses.push(...statuses);
      } catch (err) {
        allStatuses.push({ channel: 'instagram', source: '인스타그램', status: 'failed', count: 0, error: String(err) });
      }
    }

    // ── 분석 집계 ─────────────────────────────────────────
    const analytics = aggregateAnalytics(
      allDocuments,
      startDate,
      endDate,
      granularity,
      keywords,
      channels,
      allStatuses
    );

    await saveAnalytics(cacheKey, analytics);

    return NextResponse.json({ ...analytics, from_cache: false });
  } catch (err) {
    console.error('Collect API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
