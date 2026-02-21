// app/api/collect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { collectNews } from '@/lib/collectors/newsRss';
import { collectYouTube } from '@/lib/collectors/youtube';
import { collectDC } from '@/lib/collectors/dc';
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

    // Collect from each channel
    const ytApiKey = process.env.YOUTUBE_API_KEY;

    if (channels.includes('news')) {
      try {
        const { documents, statuses } = await collectNews(keywords, startDate, endDate);
        allDocuments.push(...documents);
        allStatuses.push(...statuses);
      } catch (err) {
        allStatuses.push({
          channel: 'news',
          source: 'Google News RSS',
          status: 'failed',
          count: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (channels.includes('youtube')) {
      if (ytApiKey) {
        try {
          const { documents, statuses } = await collectYouTube(
            keywords,
            startDate,
            endDate,
            ytApiKey
          );
          allDocuments.push(...documents);
          allStatuses.push(...statuses);
        } catch (err) {
          allStatuses.push({
            channel: 'youtube',
            source: 'YouTube Data API',
            status: 'failed',
            count: 0,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      } else {
        allStatuses.push({
          channel: 'youtube',
          source: 'YouTube Data API',
          status: 'skipped',
          count: 0,
          error: 'YOUTUBE_API_KEY not configured',
        });
      }
    }

    if (channels.includes('dc')) {
      try {
        const { documents, statuses } = await collectDC(
          keywords,
          startDate,
          endDate,
          galleryIds
        );
        allDocuments.push(...documents);
        allStatuses.push(...statuses);
      } catch (err) {
        allStatuses.push({
          channel: 'dc',
          source: 'DCInside Galleries',
          status: 'failed',
          count: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Aggregate analytics
    const analytics = aggregateAnalytics(
      allDocuments,
      startDate,
      endDate,
      granularity,
      keywords,
      channels,
      allStatuses
    );

    // Save to cache
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
