// lib/collectors/newsRss.ts
import Parser from 'rss-parser';
import type { RawDocument, CollectStatus } from '../types';

function generateId(seed: string): string {
  // simple deterministic id from seed
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
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; HF-Monitor/1.0)',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
  });

  const documents: RawDocument[] = [];
  const statuses: CollectStatus[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  const fetchedAt = new Date().toISOString();

  for (const keyword of keywords) {
    const encodedKeyword = encodeURIComponent(keyword);
    // Google News RSS (Korean)
    const rssUrl = `https://news.google.com/rss/search?q=${encodedKeyword}&hl=ko&gl=KR&ceid=KR:ko`;

    try {
      const feed = await parser.parseURL(rssUrl);
      let count = 0;

      for (const item of feed.items || []) {
        const pubDate = item.pubDate ? new Date(item.pubDate) : null;
        if (!pubDate) continue;
        if (pubDate < start || pubDate > end) continue;

        const doc: RawDocument = {
          id: generateId(`news_${keyword}_${item.link}_${item.pubDate}`),
          channel: 'news',
          keyword,
          title: item.title || '',
          text: item.contentSnippet || item.content || item.title || '',
          url: item.link || '',
          published_at: pubDate.toISOString(),
          fetched_at: fetchedAt,
          source_meta: {
            source: item.creator || feed.title || 'Google News',
          },
        };
        documents.push(doc);
        count++;
      }

      statuses.push({
        channel: 'news',
        source: `Google News RSS (${keyword})`,
        keyword,
        status: count > 0 ? 'success' : 'partial',
        count,
      });
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
