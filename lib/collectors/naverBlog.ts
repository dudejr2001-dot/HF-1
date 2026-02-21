// lib/collectors/naverBlog.ts
// 네이버 블로그 수집
// 1순위: Naver Search API (NAVER_CLIENT_ID + NAVER_CLIENT_SECRET 환경변수)
// 2순위: 네이버 블로그 검색 결과 페이지 크롤러 fallback

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
  return `blog_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Naver Search API 방식 */
async function collectViaNaverAPI(
  keyword: string,
  startDate: Date,
  endDate: Date,
  clientId: string,
  clientSecret: string,
  fetchedAt: string
): Promise<RawDocument[]> {
  const docs: RawDocument[] = [];
  const display = 50;

  for (let start = 1; start <= 100; start += display) {
    const params = new URLSearchParams({
      query: keyword,
      display: String(display),
      start: String(start),
      sort: 'date',
    });

    const res = await axios.get(
      `https://openapi.naver.com/v1/search/blog.json?${params}`,
      {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
        timeout: 10000,
      }
    );

    const items = res.data?.items ?? [];
    if (items.length === 0) break;

    let reachedBoundary = false;
    for (const item of items) {
      const pubDate = item.postdate
        ? new Date(
            `${item.postdate.slice(0, 4)}-${item.postdate.slice(4, 6)}-${item.postdate.slice(6, 8)}`
          )
        : null;

      if (!pubDate) continue;
      if (pubDate < startDate) { reachedBoundary = true; break; }
      if (pubDate > endDate) continue;

      const title = item.title?.replace(/<[^>]*>/g, '') ?? '';
      const description = item.description?.replace(/<[^>]*>/g, '') ?? '';

      docs.push({
        id: generateId(`blog_naver_api_${keyword}_${item.link}`),
        channel: 'blog',
        keyword,
        title,
        text: description,
        url: item.link ?? '',
        published_at: pubDate.toISOString(),
        fetched_at: fetchedAt,
        source_meta: {
          source: '네이버 블로그',
          blogger_name: item.bloggername ?? '',
          blog_link: item.bloggerlink ?? '',
        },
      });
    }
    if (reachedBoundary) break;
    await delay(300);
  }
  return docs;
}

/** 크롤러 fallback — 네이버 블로그 검색 결과 */
async function collectViaCrawler(
  keyword: string,
  startDate: Date,
  endDate: Date,
  fetchedAt: string
): Promise<RawDocument[]> {
  const docs: RawDocument[] = [];
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  for (let page = 1; page <= 5; page++) {
    const start = (page - 1) * 10 + 1;
    const url = `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(keyword)}&start=${start}&sm=tab_pge&nso=so:dd,p:all`;

    try {
      await delay(1200);
      const res = await axios.get(url, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' },
        timeout: 10000,
      });

      const $ = cheerio.load(res.data as string);
      let reachedBoundary = false;

      // 네이버 블로그 검색 결과 파싱
      $('.api_txt_lines, .total_area, .blog_area .sh_blog_top').each((_, el) => {
        const $el = $(el);
        const titleEl = $el.find('.api_txt_lines.total_tit a, .sh_blog_title a').first();
        const descEl = $el.find('.api_txt_lines.dsc_txt, .sh_blog_passage').first();
        const dateEl = $el.find('.sub_time, .sh_blog_date').first();

        const title = titleEl.text().trim();
        const href = titleEl.attr('href') ?? '';
        const desc = descEl.text().trim();
        const dateStr = dateEl.text().trim();

        if (!title || !href) return;

        // Parse date like "2024.01.15." or "1시간 전" etc.
        let pubDate: Date | null = null;
        const dateMatch = dateStr.match(/(\d{4})\.(\d{2})\.(\d{2})/);
        if (dateMatch) {
          pubDate = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T12:00:00+09:00`);
        } else if (dateStr.includes('분 전') || dateStr.includes('시간 전')) {
          pubDate = new Date();
        } else if (dateStr.includes('일 전')) {
          const days = parseInt(dateStr) || 1;
          pubDate = new Date(Date.now() - days * 86400000);
        }

        if (!pubDate) return;
        if (pubDate < startDate) { reachedBoundary = true; return; }
        if (pubDate > endDate) return;

        docs.push({
          id: generateId(`blog_naver_crawl_${keyword}_${href}`),
          channel: 'blog',
          keyword,
          title,
          text: desc,
          url: href,
          published_at: pubDate.toISOString(),
          fetched_at: fetchedAt,
          source_meta: { source: '네이버 블로그' },
        });
      });

      if (reachedBoundary) break;
    } catch {
      break;
    }
  }
  return docs;
}

export async function collectNaverBlog(
  keywords: string[],
  startDate: string,
  endDate: string
): Promise<{ documents: RawDocument[]; statuses: CollectStatus[] }> {
  const documents: RawDocument[] = [];
  const statuses: CollectStatus[] = [];
  const fetchedAt = new Date().toISOString();
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const clientId = process.env.NAVER_CLIENT_ID ?? '';
  const clientSecret = process.env.NAVER_CLIENT_SECRET ?? '';
  const useAPI = !!(clientId && clientSecret);

  for (const keyword of keywords) {
    try {
      let docs: RawDocument[] = [];

      if (useAPI) {
        docs = await collectViaNaverAPI(keyword, start, end, clientId, clientSecret, fetchedAt);
      } else {
        docs = await collectViaCrawler(keyword, start, end, fetchedAt);
      }

      documents.push(...docs);
      statuses.push({
        channel: 'blog',
        source: `네이버 블로그${useAPI ? ' (API)' : ' (크롤러)'} [${keyword}]`,
        keyword,
        status: docs.length > 0 ? 'success' : 'partial',
        count: docs.length,
      });
    } catch (err) {
      statuses.push({
        channel: 'blog',
        source: `네이버 블로그 [${keyword}]`,
        keyword,
        status: 'failed',
        count: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { documents, statuses };
}
