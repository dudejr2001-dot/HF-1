// lib/collectors/blind.ts
// 블라인드(Blind) 수집기
// 블라인드는 공식 API가 없으므로 웹 크롤러 방식 사용
// - 실패 시 graceful fallback (데모 데이터 제공)

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { RawDocument, CollectStatus } from '../types';

function generateId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `blind_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseBlindDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const s = dateStr.trim();

  // "2024-01-15T12:34:56" ISO
  if (s.match(/^\d{4}-\d{2}-\d{2}/)) return new Date(s);

  // "24.01.15"
  const short = s.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (short) return new Date(`20${short[1]}-${short[2]}-${short[3]}T12:00:00+09:00`);

  // "1시간 전", "방금" => today
  if (s.includes('분 전') || s.includes('시간 전') || s.includes('방금')) return new Date();

  // "3일 전"
  const daysAgo = s.match(/(\d+)일 전/);
  if (daysAgo) return new Date(Date.now() - parseInt(daysAgo[1]) * 86400000);

  return null;
}

/** 블라인드 웹 크롤러 */
async function crawlBlind(
  keyword: string,
  startDate: Date,
  endDate: Date,
  fetchedAt: string
): Promise<{ docs: RawDocument[]; success: boolean }> {
  const docs: RawDocument[] = [];

  // 블라인드 검색 URL
  const searchUrl = `https://www.teamblind.com/kr/search/${encodeURIComponent(keyword)}`;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
    'Referer': 'https://www.teamblind.com/kr/',
  };

  try {
    await delay(1000);
    const res = await axios.get(searchUrl, { headers, timeout: 15000 });
    const $ = cheerio.load(res.data as string);

    // 블라인드 게시글 목록 파싱
    // 선택자는 사이트 구조에 따라 변경될 수 있음
    const selectors = [
      '.article-list li',
      '.post-list-item',
      '[class*="ArticleItem"]',
      '[class*="PostItem"]',
      'article',
    ];

    let found = false;
    for (const selector of selectors) {
      const items = $(selector);
      if (items.length === 0) continue;
      found = true;

      items.each((_, el) => {
        const $el = $(el);
        const titleEl = $el.find('a[href*="/post/"], a[href*="/article/"], h2 a, h3 a, .title a').first();
        const title = titleEl.text().trim() || $el.find('h2, h3, .title').first().text().trim();
        const href = titleEl.attr('href') ?? '';
        const dateEl = $el.find('time, [class*="date"], [class*="time"]').first();
        const dateStr = dateEl.attr('datetime') ?? dateEl.text().trim();
        const snippet = $el.find('p, .content, [class*="content"], [class*="body"]').first().text().trim();

        if (!title) return;

        const pubDate = parseBlindDate(dateStr);
        if (!pubDate || pubDate < startDate || pubDate > endDate) return;

        const fullUrl = href.startsWith('http')
          ? href
          : `https://www.teamblind.com${href}`;

        docs.push({
          id: generateId(`blind_${keyword}_${fullUrl}`),
          channel: 'blind' as const,
          keyword,
          title,
          text: snippet || title,
          url: fullUrl,
          published_at: pubDate.toISOString(),
          fetched_at: fetchedAt,
          source_meta: { source: '블라인드' },
        });
      });
      break;
    }

    return { docs, success: true };
  } catch {
    return { docs: [], success: false };
  }
}

/** Google News RSS에서 블라인드 관련 언급 수집 (보조) */
async function collectViaGoogleRSS(
  keyword: string,
  startDate: Date,
  endDate: Date,
  fetchedAt: string
): Promise<RawDocument[]> {
  const docs: RawDocument[] = [];

  try {
    const Parser = (await import('rss-parser')).default;
    const parser = new Parser({ timeout: 10000 });
    const encoded = encodeURIComponent(`${keyword} 블라인드`);
    const rssUrl = `https://news.google.com/rss/search?q=${encoded}&hl=ko&gl=KR&ceid=KR:ko`;

    const feed = await parser.parseURL(rssUrl);
    for (const item of feed.items ?? []) {
      const pubDate = item.pubDate ? new Date(item.pubDate) : null;
      if (!pubDate || pubDate < startDate || pubDate > endDate) continue;

      docs.push({
        id: generateId(`blind_rss_${keyword}_${item.link}`),
        channel: 'blind' as const,
        keyword,
        title: item.title ?? '',
        text: item.contentSnippet ?? item.title ?? '',
        url: item.link ?? '',
        published_at: pubDate.toISOString(),
        fetched_at: fetchedAt,
        source_meta: { source: '블라인드 (뉴스 언급)' },
      });
    }
  } catch { /* ignore */ }

  return docs;
}

export async function collectBlind(
  keywords: string[],
  startDate: string,
  endDate: string
): Promise<{ documents: RawDocument[]; statuses: CollectStatus[] }> {
  const documents: RawDocument[] = [];
  const statuses: CollectStatus[] = [];
  const fetchedAt = new Date().toISOString();

  // 블라인드 크롤러: 최근 게시물만 제공 → 요청 기간이 30일 이상 이전이면 최근 30일로 확장
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const rawStart = new Date(startDate);
  const rawEnd = new Date(endDate);
  rawEnd.setHours(23, 59, 59, 999);
  const start = rawStart < thirtyDaysAgo ? thirtyDaysAgo : rawStart;
  const end = rawEnd > now ? now : rawEnd;

  for (const keyword of keywords) {
    try {
      const { docs, success } = await crawlBlind(keyword, start, end, fetchedAt);

      let allDocs = [...docs];

      // 크롤러 실패 시 뉴스 RSS에서 블라인드 언급 보조 수집
      if (!success || allDocs.length === 0) {
        const rssDocs = await collectViaGoogleRSS(keyword, start, end, fetchedAt);
        allDocs = [...allDocs, ...rssDocs];
      }

      documents.push(...allDocs);
      statuses.push({
        channel: 'blind' as any,
        source: `블라인드 [${keyword}]${!success ? ' (크롤러 실패→RSS 보조)' : ''}`,
        keyword,
        status: !success ? 'partial' : allDocs.length > 0 ? 'success' : 'partial',
        count: allDocs.length,
        error: !success ? '블라인드 크롤러 파싱 실패 (사이트 구조 변경 가능성)' : undefined,
      });
    } catch (err) {
      statuses.push({
        channel: 'blind' as any,
        source: `블라인드 [${keyword}]`,
        keyword,
        status: 'failed',
        count: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { documents, statuses };
}
