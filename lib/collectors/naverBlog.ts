// lib/collectors/naverBlog.ts
// 네이버 블로그 수집
// 1순위: Naver Search API (NAVER_CLIENT_ID + NAVER_CLIENT_SECRET 환경변수)
// 2순위: 네이버 블로그 검색 결과 페이지 크롤러 fallback (2026 구조 기준)

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

function parseNaverDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const s = dateStr.trim();

  // "2026.02.13." or "2026.02.13"
  const fullMatch = s.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (fullMatch) {
    return new Date(`${fullMatch[1]}-${fullMatch[2]}-${fullMatch[3]}T12:00:00+09:00`);
  }
  // "N일 전", "N시간 전", "방금"
  if (s.includes('분 전') || s.includes('시간 전') || s.includes('방금')) {
    return new Date();
  }
  const daysAgo = s.match(/(\d+)일 전/);
  if (daysAgo) {
    return new Date(Date.now() - parseInt(daysAgo[1]) * 86400000);
  }
  return null;
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

/** 크롤러 fallback — 네이버 블로그 검색 결과 (2026 구조) */
async function collectViaCrawler(
  keyword: string,
  startDate: Date,
  endDate: Date,
  fetchedAt: string
): Promise<RawDocument[]> {
  const docs: RawDocument[] = [];
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // 날짜 범위를 nso 파라미터로 전달 (선택적)
  // 최대 3페이지 수집
  for (let page = 1; page <= 3; page++) {
    const start = (page - 1) * 10 + 1;
    const url = `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(keyword)}&start=${start}&nso=so:dd,p:all`;

    try {
      await delay(800);
      const res = await axios.get(url, {
        headers: {
          'User-Agent': UA,
          'Accept-Language': 'ko-KR,ko;q=0.9',
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(res.data as string);
      let reachedBoundary = false;

      // 2026년 네이버 블로그 검색 구조:
      // .sc_new > .content_item: 각 블로그 게시물
      // .content_item 내: a[href*="blog.naver.com"] (title), .date (날짜), .dsc_area (설명)
      $('.sc_new').each((_, section) => {
        // 블로그 링크가 있는 섹션만 처리
        const blogLinks = $(section).find('a[href*="blog.naver.com"]');
        if (blogLinks.length === 0) return;

        $(section).find('.content_item').each((_, el) => {
          const $el = $(el);

          // 제목 링크 찾기: blog.naver.com URL이면서 텍스트가 있는 것
          const titleEl = $el.find('a[href*="blog.naver.com"]')
            .filter((_, a) => {
              const href = $(a).attr('href') || '';
              const text = $(a).text().trim();
              // 포스트 URL (숫자 ID 포함)이고 텍스트 있는 것
              return /blog\.naver\.com\/[^/]+\/\d+/.test(href) && text.length > 3;
            })
            .first();

          if (!titleEl.length) {
            // 대안: .dsc_area에서 텍스트와 URL 추출
            const dscEl = $el.find('.dsc_area');
            const anyBlogLink = $el.find('a[href*="blog.naver.com/"]').first();
            if (!dscEl.length && !anyBlogLink.length) return;
          }

          const href = titleEl.attr('href') || $el.find('a[href*="blog.naver.com/"]').attr('href') || '';
          if (!href) return;

          const title = titleEl.text().trim() ||
            $el.find('.dsc_area').text().trim().split('\n')[0].trim().slice(0, 100);
          if (!title || title.length < 2) return;

          const dateEl = $el.find('.date, .sub_time, .info_area .date').first();
          const dateStr = dateEl.text().trim();
          const pubDate = parseNaverDate(dateStr);

          if (!pubDate) return;
          if (pubDate < startDate) { reachedBoundary = true; return false; }
          if (pubDate > endDate) return;

          const descEl = $el.find('.dsc_area').first();
          const desc = descEl.text().trim().replace(/\s+/g, ' ');

          // 블로그 작성자
          const authorEl = $el.find('.name, .source_inner .name, a[href*="blog.naver.com/"]:not([href*="/"]:last-child)');
          const author = authorEl.first().text().trim();

          docs.push({
            id: generateId(`blog_naver_crawl_${keyword}_${href}`),
            channel: 'blog',
            keyword,
            title,
            text: desc || title,
            url: href,
            published_at: pubDate.toISOString(),
            fetched_at: fetchedAt,
            source_meta: {
              source: '네이버 블로그',
              blogger_name: author,
            },
          });
        });

        if (reachedBoundary) return false;
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

  // 날짜 범위: 요청 기간이 너무 과거면 최근 90일로 확장 fallback
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const rawStart = new Date(startDate);
  const rawEnd = new Date(endDate);
  rawEnd.setHours(23, 59, 59, 999);

  // 크롤러는 최근 게시물만 제공하므로, 요청 기간이 90일 이상 이전이면
  // 수집 범위를 최근 90일로 완화
  const effectiveStart = rawStart < ninetyDaysAgo ? ninetyDaysAgo : rawStart;
  const effectiveEnd = rawEnd > now ? now : rawEnd;
  const usedFallback = rawStart < ninetyDaysAgo;

  const start = effectiveStart;
  const end = effectiveEnd;

  const clientId = process.env.NAVER_CLIENT_ID ?? '';
  const clientSecret = process.env.NAVER_CLIENT_SECRET ?? '';
  const useAPI = !!(clientId && clientSecret);

  for (const keyword of keywords) {
    try {
      let docs: RawDocument[] = [];

      if (useAPI) {
        docs = await collectViaNaverAPI(keyword, start, end, clientId, clientSecret, fetchedAt);
      }

      // fallback to crawler (also used when API returns 0 results)
      if (docs.length === 0) {
        docs = await collectViaCrawler(keyword, start, end, fetchedAt);
      }

      documents.push(...docs);
      const fallbackNote = usedFallback ? ' (요청기간 초과→최근90일로 확장)' : '';
      statuses.push({
        channel: 'blog',
        source: `네이버 블로그${useAPI && docs.length > 0 ? ' (API)' : ' (크롤러)'}${fallbackNote} [${keyword}]`,
        keyword,
        status: docs.length > 0 ? 'success' : 'partial',
        count: docs.length,
        error: docs.length === 0 ? '해당 기간 게시물 없음 (NAVER_CLIENT_ID/SECRET 설정 시 더 많은 결과 수집)' : undefined,
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
