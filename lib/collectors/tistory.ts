// lib/collectors/tistory.ts
// 티스토리 수집
// 1순위: Daum/Kakao 블로그 검색 (카카오 REST API)
// 2순위: 다음 블로그 검색 결과 크롤러
// 3순위: 티스토리 개별 블로그 RSS (키워드 기반)

import axios from 'axios';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import type { RawDocument, CollectStatus } from '../types';

function generateId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `tistory_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** 카카오 REST API (KAKAO_REST_API_KEY 환경변수) */
async function collectViaKakaoAPI(
  keyword: string,
  startDate: Date,
  endDate: Date,
  apiKey: string,
  fetchedAt: string
): Promise<RawDocument[]> {
  const docs: RawDocument[] = [];

  for (let page = 1; page <= 5; page++) {
    const params = new URLSearchParams({
      query: keyword,
      sort: 'recency',
      page: String(page),
      size: '50',
    });

    const res = await axios.get(
      `https://dapi.kakao.com/v2/search/blog?${params}`,
      {
        headers: { Authorization: `KakaoAK ${apiKey}` },
        timeout: 10000,
      }
    );

    const items: Array<{
      title: string; contents: string; url: string;
      blogname: string; thumbnail: string; datetime: string;
    }> = res.data?.documents ?? [];

    if (items.length === 0) break;

    let reachedBoundary = false;
    for (const item of items) {
      const pubDate = item.datetime ? new Date(item.datetime) : null;
      if (!pubDate) continue;
      if (pubDate < startDate) { reachedBoundary = true; break; }
      if (pubDate > endDate) continue;

      // 티스토리 URL만 필터 (tistory.com 또는 .tistory.com)
      const isTistory = item.url.includes('tistory.com');
      if (!isTistory) continue;

      const title = item.title.replace(/<[^>]*>/g, '');
      const text = item.contents.replace(/<[^>]*>/g, '');

      docs.push({
        id: generateId(`tistory_kakao_${keyword}_${item.url}`),
        channel: 'tistory',
        keyword,
        title,
        text,
        url: item.url,
        published_at: pubDate.toISOString(),
        fetched_at: fetchedAt,
        source_meta: {
          source: '티스토리',
          blogger_name: item.blogname ?? '',
        },
      });
    }
    if (reachedBoundary || res.data?.meta?.is_end) break;
    await delay(300);
  }
  return docs;
}

/** 다음 블로그 검색 크롤러 fallback */
async function collectViaDaumCrawler(
  keyword: string,
  startDate: Date,
  endDate: Date,
  fetchedAt: string
): Promise<RawDocument[]> {
  const docs: RawDocument[] = [];
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  for (let page = 1; page <= 4; page++) {
    const url = `https://search.daum.net/search?w=blog&q=${encodeURIComponent(keyword)}&page=${page}&DA=TBS`;

    try {
      await delay(1500);
      const res = await axios.get(url, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' },
        timeout: 10000,
      });

      const $ = cheerio.load(res.data as string);
      let reachedBoundary = false;

      // 다음 블로그 검색 결과
      $('.c-list-basic li, .item-bundle-blog .mg-item-basic').each((_, el) => {
        const $el = $(el);
        const titleEl = $el.find('.tit-doc a, .c-title a').first();
        const descEl = $el.find('.desc, .c-summary').first();
        const dateEl = $el.find('.date, .c-emphasize-medium').first();
        const sourceEl = $el.find('.sub_info .name, .c-source').first();

        const title = titleEl.text().trim();
        const href = titleEl.attr('href') ?? '';
        const desc = descEl.text().trim();
        const dateStr = dateEl.text().trim();
        const sourceName = sourceEl.text().trim();

        if (!title) return;

        // 티스토리 URL만
        const isTistory = href.includes('tistory.com') || sourceName.includes('tistory');

        let pubDate: Date | null = null;
        const m = dateStr.match(/(\d{4})[\.\-](\d{1,2})[\.\-](\d{1,2})/);
        if (m) pubDate = new Date(`${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}T12:00:00+09:00`);
        else if (dateStr.includes('전')) pubDate = new Date();

        if (!pubDate) return;
        if (pubDate < startDate) { reachedBoundary = true; return; }
        if (pubDate > endDate) return;

        docs.push({
          id: generateId(`tistory_daum_${keyword}_${href}`),
          channel: 'tistory',
          keyword,
          title,
          text: desc,
          url: href || `https://search.daum.net/search?w=blog&q=${encodeURIComponent(keyword)}`,
          published_at: pubDate.toISOString(),
          fetched_at: fetchedAt,
          source_meta: {
            source: '티스토리',
            blogger_name: sourceName,
          },
        });
      });

      if (reachedBoundary) break;
    } catch {
      break;
    }
  }
  return docs;
}

/** 네이버 블로그 검색에서 티스토리 URL만 추출 */
async function collectViaNaver(
  keyword: string,
  startDate: Date,
  endDate: Date,
  fetchedAt: string
): Promise<RawDocument[]> {
  const docs: RawDocument[] = [];
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  for (let page = 1; page <= 3; page++) {
    const start = (page - 1) * 10 + 1;
    const url = `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(keyword + ' site:tistory.com')}&start=${start}`;
    try {
      await delay(1200);
      const res = await axios.get(url, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' },
        timeout: 10000,
      });
      const $ = cheerio.load(res.data as string);

      $('.total_area').each((_, el) => {
        const $el = $(el);
        const titleEl = $el.find('.api_txt_lines.total_tit a').first();
        const descEl = $el.find('.api_txt_lines.dsc_txt').first();
        const dateEl = $el.find('.sub_time').first();

        const title = titleEl.text().trim();
        const href = titleEl.attr('href') ?? '';
        const desc = descEl.text().trim();
        const dateStr = dateEl.text().trim();

        if (!title) return;

        const m = dateStr.match(/(\d{4})\.(\d{2})\.(\d{2})/);
        const pubDate = m
          ? new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00+09:00`)
          : null;
        if (!pubDate || pubDate < startDate || pubDate > endDate) return;

        docs.push({
          id: generateId(`tistory_naver_${keyword}_${href}`),
          channel: 'tistory',
          keyword,
          title,
          text: desc,
          url: href,
          published_at: pubDate.toISOString(),
          fetched_at: fetchedAt,
          source_meta: { source: '티스토리' },
        });
      });
    } catch { break; }
  }
  return docs;
}

export async function collectTistory(
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

  const kakaoKey = process.env.KAKAO_REST_API_KEY ?? '';

  for (const keyword of keywords) {
    try {
      let docs: RawDocument[] = [];
      let method = '';

      if (kakaoKey) {
        docs = await collectViaKakaoAPI(keyword, start, end, kakaoKey, fetchedAt);
        method = 'Kakao API';
      }

      // fallback: 다음 크롤러
      if (docs.length === 0) {
        docs = await collectViaDaumCrawler(keyword, start, end, fetchedAt);
        method = '다음 크롤러';
      }

      // fallback: 네이버 크롤러 + 티스토리 필터
      if (docs.length === 0) {
        docs = await collectViaNaver(keyword, start, end, fetchedAt);
        method = '네이버 크롤러 (티스토리)';
      }

      documents.push(...docs);
      statuses.push({
        channel: 'tistory',
        source: `티스토리 [${keyword}] (${method || '건너뜀'})`,
        keyword,
        status: docs.length > 0 ? 'success' : 'partial',
        count: docs.length,
      });
    } catch (err) {
      statuses.push({
        channel: 'tistory',
        source: `티스토리 [${keyword}]`,
        keyword,
        status: 'failed',
        count: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { documents, statuses };
}
