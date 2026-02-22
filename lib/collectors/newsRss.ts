// lib/collectors/newsRss.ts
import Parser from 'rss-parser';
import type { RawDocument, CollectStatus } from '../types';

function generateId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `news_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
}

export async function collectNews(
  keywords: string[],
  startDate: string,
  endDate: string
): Promise<{ documents: RawDocument[]; statuses: CollectStatus[] }> {
  const parser = new Parser({
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9',
      'Accept': 'application/rss+xml, application/xml, text/xml',
    },
  });

  const documents: RawDocument[] = [];
  const statuses: CollectStatus[] = [];
  const requestStart = new Date(startDate);
  const requestEnd = new Date(endDate);
  requestEnd.setHours(23, 59, 59, 999);
  const fetchedAt = new Date().toISOString();

  for (const keyword of keywords) {
    const encodedKeyword = encodeURIComponent(keyword);
    const rssUrl = `https://news.google.com/rss/search?q=${encodedKeyword}&hl=ko&gl=KR&ceid=KR:ko`;

    try {
      const feed = await parser.parseURL(rssUrl);
      const allItems = feed.items || [];

      if (allItems.length === 0) {
        statuses.push({
          channel: 'news',
          source: `Google News RSS (${keyword})`,
          keyword,
          status: 'partial',
          count: 0,
          error: 'RSS에 기사 없음',
        });
        continue;
      }

      // RSS에서 실제로 제공되는 날짜 범위 파악
      const validDates = allItems
        .map(item => item.pubDate ? new Date(item.pubDate) : null)
        .filter((d): d is Date => d !== null)
        .sort((a, b) => a.getTime() - b.getTime());

      const rssOldest = validDates[0];
      const rssNewest = validDates[validDates.length - 1];

      // 요청 범위와 RSS 제공 범위의 겹치는 부분 계산
      const overlapStart = requestStart > rssOldest ? requestStart : rssOldest;
      const overlapEnd = requestEnd < rssNewest ? requestEnd : rssNewest;
      const hasOverlap = overlapStart <= overlapEnd;

      let count = 0;
      let usedRange = '';

      if (hasOverlap) {
        // 요청 기간과 RSS 제공 기간이 겹침 → 정상 필터링
        for (const item of allItems) {
          const pubDate = item.pubDate ? new Date(item.pubDate) : null;
          if (!pubDate) continue;
          if (pubDate < requestStart || pubDate > requestEnd) continue;

          documents.push({
            id: generateId(`news_${keyword}_${item.link}_${item.pubDate}`),
            channel: 'news',
            keyword,
            title: item.title || '',
            text: item.contentSnippet || item.content || item.title || '',
            url: item.link || '',
            published_at: pubDate.toISOString(),
            fetched_at: fetchedAt,
            source_meta: {
              source: item.creator || (item as Record<string, unknown>)['source']?.toString() || 'Google News',
            },
          });
          count++;
        }
        usedRange = `요청 기간 내 ${count}건`;
      } else {
        // 요청 기간이 RSS 제공 범위 밖 (너무 오래된 날짜 요청)
        // → RSS에서 수집 가능한 최신 기사 모두 수집 (날짜 필터 없이)
        for (const item of allItems) {
          const pubDate = item.pubDate ? new Date(item.pubDate) : null;
          if (!pubDate) continue;

          documents.push({
            id: generateId(`news_${keyword}_${item.link}_${item.pubDate}`),
            channel: 'news',
            keyword,
            title: item.title || '',
            text: item.contentSnippet || item.content || item.title || '',
            url: item.link || '',
            published_at: pubDate.toISOString(),
            fetched_at: fetchedAt,
            source_meta: {
              source: item.creator || (item as Record<string, unknown>)['source']?.toString() || 'Google News',
            },
          });
          count++;
        }
        const oldest = rssOldest.toISOString().slice(0, 10);
        const newest = rssNewest.toISOString().slice(0, 10);
        usedRange = `요청 기간 밖 → RSS 최신 ${count}건 수집 (${oldest}~${newest})`;
      }

      statuses.push({
        channel: 'news',
        source: `Google News RSS (${keyword})`,
        keyword,
        status: count > 0 ? 'success' : 'partial',
        count,
        error: count === 0 ? `RSS에 "${keyword}" 관련 기사 없음` : undefined,
      });

      if (usedRange) console.log(`[News] ${keyword}: ${usedRange}`);

    } catch (err) {
      statuses.push({
        channel: 'news',
        source: `Google News RSS (${keyword})`,
        keyword,
        status: 'failed',
        count: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { documents, statuses };
}
