// app/api/ai-summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateAISummary } from '@/lib/ai/openaiSummarize';
import { loadAnalytics, saveAIResponse, loadAIResponse, getAnalyticsCacheKey } from '@/lib/cache';
import type { AnalyticsResult } from '@/lib/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { analytics, forceRefresh = false } = body as {
      analytics: AnalyticsResult;
      forceRefresh: boolean;
    };

    if (!analytics) {
      return NextResponse.json({ error: 'analytics data is required' }, { status: 400 });
    }

    const cacheKey = getAnalyticsCacheKey(
      analytics.meta.start_date,
      analytics.meta.end_date,
      analytics.meta.granularity,
      analytics.meta.keywords,
      analytics.meta.channels
    );

    // Check cache
    if (!forceRefresh) {
      const cached = await loadAIResponse(cacheKey);
      if (cached) {
        return NextResponse.json({ ...cached, from_cache: true });
      }
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const result = await generateAISummary(analytics, openaiApiKey);

    // Save to cache
    await saveAIResponse(cacheKey, result);

    return NextResponse.json({ ...result, from_cache: false });
  } catch (err) {
    console.error('AI Summary API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
