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

export const maxDuration = 120;

/** 날짜를 YYYY-MM-DD 형식으로 반환 */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 날짜 범위 유효성 검사 및 보정
 *  - 미래 날짜 → 오늘로 보정
 *  - end < start → 스왑
 */
function normalizeDateRange(rawStart: string, rawEnd: string): { startDate: string; endDate: string; adjusted: boolean } {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  let s = new Date(rawStart);
  let e = new Date(rawEnd);
  let adjusted = false;

  // 미래 날짜는 오늘로 보정
  if (e > today) { e = today; adjusted = true; }
  if (s > today) { s = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000); adjusted = true; }

  // end가 start보다 이른 경우 스왑
  if (e < s) { const tmp = s; s = e; e = tmp; adjusted = true; }

  return {
    startDate: toDateStr(s),
    endDate: toDateStr(e),
    adjusted,
  };
}

/** 타임아웃 래퍼: ms 후 reject */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} 수집 타임아웃 (${ms / 1000}초 초과)`)), ms)
    ),
  ]);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      startDate: rawStart,
      endDate: rawEnd,
      granularity = 'weekly',
      keywords = [],
      channels = ['news', 'dc'],
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

    if (!rawStart || !rawEnd) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // 날짜 보정
    const { startDate, endDate } = normalizeDateRange(rawStart, rawEnd);

    const cacheKey = getAnalyticsCacheKey(startDate, endDate, granularity, keywords, channels);

    // Check cache first
    if (!forceRefresh) {
      const cached = await loadAnalytics(cacheKey);
      if (cached) {
        return NextResponse.json({ ...cached, from_cache: true });
      }
    }

    const ytApiKey = process.env.YOUTUBE_API_KEY;

    // ── 채널별 수집 태스크 정의 (병렬 실행) ──────────────────
    type CollectResult = { documents: RawDocument[]; statuses: CollectStatus[] };

    const tasks: Array<{ channel: Channel; fn: () => Promise<CollectResult> }> = [];

    if (channels.includes('news')) {
      tasks.push({
        channel: 'news',
        fn: () => withTimeout(collectNews(keywords, startDate, endDate), 25000, '뉴스'),
      });
    }

    if (channels.includes('youtube')) {
      if (ytApiKey) {
        tasks.push({
          channel: 'youtube',
          fn: () => withTimeout(collectYouTube(keywords, startDate, endDate, ytApiKey), 25000, 'YouTube'),
        });
      }
    }

    if (channels.includes('dc')) {
      tasks.push({
        channel: 'dc',
        fn: () => withTimeout(collectDC(keywords, startDate, endDate, galleryIds), 80000, 'DC인사이드'),
      });
    }

    if (channels.includes('blog')) {
      tasks.push({
        channel: 'blog',
        fn: () => withTimeout(collectNaverBlog(keywords, startDate, endDate), 40000, '네이버 블로그'),
      });
    }

    if (channels.includes('tistory')) {
      tasks.push({
        channel: 'tistory',
        fn: () => withTimeout(collectTistory(keywords, startDate, endDate), 50000, '티스토리'),
      });
    }

    if (channels.includes('blind')) {
      tasks.push({
        channel: 'blind',
        fn: () => withTimeout(collectBlind(keywords, startDate, endDate), 20000, '블라인드'),
      });
    }

    if (channels.includes('instagram')) {
      tasks.push({
        channel: 'instagram',
        fn: () => withTimeout(collectInstagram(keywords, startDate, endDate), 20000, '인스타그램'),
      });
    }

    // ── 병렬 수집 실행 ────────────────────────────────────────
    // YouTube는 별도 처리 (API 키 없으면 스킵)
    const ytSkipped = channels.includes('youtube') && !ytApiKey;

    const results = await Promise.allSettled(tasks.map(t => t.fn()));

    const allDocuments: RawDocument[] = [];
    const allStatuses: CollectStatus[] = [];

    // YouTube API 키 없을 때 skipped 상태 추가
    if (ytSkipped) {
      allStatuses.push({
        channel: 'youtube',
        source: 'YouTube Data API',
        status: 'skipped',
        count: 0,
        error: 'YOUTUBE_API_KEY 미설정 — 환경변수 설정 후 사용 가능',
      });
    }

    results.forEach((result, i) => {
      const task = tasks[i];
      if (result.status === 'fulfilled') {
        allDocuments.push(...result.value.documents);
        allStatuses.push(...result.value.statuses);
      } else {
        // 타임아웃 또는 에러 처리
        const errMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        allStatuses.push({
          channel: task.channel,
          source: task.channel,
          status: 'failed',
          count: 0,
          error: errMsg,
        });
      }
    });

    // ── 수집 결과 요약 로그 ────────────────────────────────
    const totalCollected = allDocuments.length;
    const channelSummary = allStatuses
      .map(s => `${s.channel}:${s.count}(${s.status})`)
      .join(', ');
    console.log(`[Collect] ${startDate}~${endDate} | 총 ${totalCollected}건 | ${channelSummary}`);

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
