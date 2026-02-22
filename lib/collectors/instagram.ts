// lib/collectors/instagram.ts
// 인스타그램 수집기
// 인스타그램은 공식 API 접근이 제한적이므로 다중 전략 사용:
// 1순위: Google News RSS (인스타그램 관련 언론 보도)
// 2순위: 네이버/다음 인스타그램 게시물 검색
// 3순위: 공개 해시태그 페이지 크롤러 (rate limit 엄수)
// ※ 인스타그램 직접 API는 Business Account 필요 → .env에 IG_ACCESS_TOKEN 설정 시 활성화

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
  return `ig_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Google News RSS (인스타그램 관련 보도 수집) */
async function collectViaNewsRSS(
  keyword: string,
  startDate: Date,
  endDate: Date,
  fetchedAt: string
): Promise<RawDocument[]> {
  const docs: RawDocument[] = [];
  const parser = new Parser({ timeout: 10000 });

  // 인스타그램에서 화제된 내용도 포함
  const queries = [`${keyword} 인스타그램`, `${keyword} SNS`];

  for (const query of queries) {
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
      const feed = await parser.parseURL(rssUrl);

      for (const item of feed.items ?? []) {
        const pubDate = item.pubDate ? new Date(item.pubDate) : null;
        if (!pubDate || pubDate < startDate || pubDate > endDate) continue;

        docs.push({
          id: generateId(`ig_rss_${keyword}_${item.link}`),
          channel: 'instagram',
          keyword,
          title: item.title ?? '',
          text: item.contentSnippet ?? item.title ?? '',
          url: item.link ?? '',
          published_at: pubDate.toISOString(),
          fetched_at: fetchedAt,
          source_meta: {
            source: '인스타그램 (뉴스 언급)',
            news_source: item.creator ?? '',
          },
        });
      }
      await delay(500);
    } catch { continue; }
  }
  return docs;
}

/** 네이버 인플루언서/콘텐츠 검색 (인스타그램 노출 포함) */
async function collectViaNaverContent(
  keyword: string,
  startDate: Date,
  endDate: Date,
  fetchedAt: string
): Promise<RawDocument[]> {
  const docs: RawDocument[] = [];
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  // 네이버 VIEW 탭 (인스타그램 게시물 포함)
  for (let page = 1; page <= 3; page++) {
    const start = (page - 1) * 10 + 1;
    const url = `https://search.naver.com/search.naver?where=view&query=${encodeURIComponent(keyword)}&start=${start}`;

    try {
      await delay(800);
      const res = await axios.get(url, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' },
        timeout: 10000,
      });

      const $ = cheerio.load(res.data as string);
      let reachedBoundary = false;

      $('.api_txt_lines.total_tit, .total_area').each((_, el) => {
        const $el = $(el);
        const titleEl = $el.is('a')
          ? $el
          : $el.find('a[href*="instagram.com"], a[href*="instagr.am"]').first()
            || $el.find('.api_txt_lines.total_tit a').first();

        const title = titleEl.text().trim() || $el.find('h3, .tit').first().text().trim();
        const href = titleEl.attr('href') ?? '';
        const desc = $el.find('.api_txt_lines.dsc_txt, .desc').first().text().trim();
        const dateStr = $el.find('.sub_time').first().text().trim();
        const sourceName = $el.find('.source, .media_end_head_top_name').first().text().trim();

        // 인스타그램 URL인지 확인
        const isInstagram = href.includes('instagram.com') || sourceName.toLowerCase().includes('instagram');
        if (!isInstagram && !href.includes('instagram')) return; // 인스타그램만

        const m = dateStr.match(/(\d{4})\.(\d{2})\.(\d{2})/);
        const pubDate = m
          ? new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00+09:00`)
          : dateStr.includes('전') ? new Date() : null;

        if (!pubDate) return;
        if (pubDate < startDate) { reachedBoundary = true; return; }
        if (pubDate > endDate) return;

        if (!title) return;

        docs.push({
          id: generateId(`ig_naver_${keyword}_${href}`),
          channel: 'instagram',
          keyword,
          title,
          text: desc || title,
          url: href || `https://www.instagram.com/explore/tags/${encodeURIComponent(keyword)}/`,
          published_at: pubDate.toISOString(),
          fetched_at: fetchedAt,
          source_meta: { source: '인스타그램' },
        });
      });

      if (reachedBoundary) break;
    } catch { break; }
  }
  return docs;
}

/** Instagram Graph API (IG_ACCESS_TOKEN 설정 시) */
async function collectViaGraphAPI(
  keyword: string,
  startDate: Date,
  endDate: Date,
  accessToken: string,
  fetchedAt: string
): Promise<RawDocument[]> {
  const docs: RawDocument[] = [];

  try {
    // IG Hashtag Search API
    const hashtagName = keyword.replace(/\s+/g, '').toLowerCase();

    // Step 1: Get hashtag ID
    const hashtagRes = await axios.get(
      `https://graph.facebook.com/v18.0/ig_hashtag_search?user_id=me&q=${hashtagName}&access_token=${accessToken}`,
      { timeout: 10000 }
    );
    const hashtagId = hashtagRes.data?.data?.[0]?.id;
    if (!hashtagId) return docs;

    // Step 2: Get recent media
    const mediaRes = await axios.get(
      `https://graph.facebook.com/v18.0/${hashtagId}/recent_media?fields=id,caption,timestamp,permalink&access_token=${accessToken}&limit=50`,
      { timeout: 10000 }
    );

    for (const post of mediaRes.data?.data ?? []) {
      const pubDate = post.timestamp ? new Date(post.timestamp) : null;
      if (!pubDate || pubDate < startDate || pubDate > endDate) continue;

      docs.push({
        id: generateId(`ig_api_${keyword}_${post.id}`),
        channel: 'instagram',
        keyword,
        title: (post.caption ?? '').slice(0, 100),
        text: post.caption ?? '',
        url: post.permalink ?? `https://www.instagram.com/p/${post.id}/`,
        published_at: pubDate.toISOString(),
        fetched_at: fetchedAt,
        source_meta: {
          source: '인스타그램',
          post_id: post.id,
        },
      });
    }
  } catch { /* ignore */ }

  return docs;
}

export async function collectInstagram(
  keywords: string[],
  startDate: string,
  endDate: string
): Promise<{ documents: RawDocument[]; statuses: CollectStatus[] }> {
  const documents: RawDocument[] = [];
  const statuses: CollectStatus[] = [];
  const fetchedAt = new Date().toISOString();

  // 인스타그램 크롤러: 최근 게시물만 제공 → 요청 기간이 90일 이상 이전이면 최근 90일로 확장
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const rawStart = new Date(startDate);
  const rawEnd = new Date(endDate);
  rawEnd.setHours(23, 59, 59, 999);
  const start = rawStart < ninetyDaysAgo ? ninetyDaysAgo : rawStart;
  const end = rawEnd > now ? now : rawEnd;

  const igToken = process.env.IG_ACCESS_TOKEN ?? '';

  for (const keyword of keywords) {
    try {
      let allDocs: RawDocument[] = [];
      let method = '';

      // 1. Instagram Graph API (토큰 있을 때)
      if (igToken) {
        const apiDocs = await collectViaGraphAPI(keyword, start, end, igToken, fetchedAt);
        if (apiDocs.length > 0) {
          allDocs = [...allDocs, ...apiDocs];
          method = 'Graph API';
        }
      }

      // 2. 뉴스 RSS (항상 수집)
      const rssDocs = await collectViaNewsRSS(keyword, start, end, fetchedAt);
      allDocs = [...allDocs, ...rssDocs];
      if (rssDocs.length > 0) method = method ? `${method} + 뉴스RSS` : '뉴스RSS';

      // 3. 네이버 VIEW 크롤러
      if (allDocs.length < 5) {
        const naverDocs = await collectViaNaverContent(keyword, start, end, fetchedAt);
        allDocs = [...allDocs, ...naverDocs];
        if (naverDocs.length > 0) method = method ? `${method} + 네이버크롤러` : '네이버크롤러';
      }

      // 중복 제거
      const seen = new Set<string>();
      const uniqueDocs = allDocs.filter((d) => {
        if (seen.has(d.url)) return false;
        seen.add(d.url);
        return true;
      });

      documents.push(...uniqueDocs);
      statuses.push({
        channel: 'instagram',
        source: `인스타그램 [${keyword}] (${method || '없음'})`,
        keyword,
        status: uniqueDocs.length > 0 ? 'success' : 'partial',
        count: uniqueDocs.length,
      });
    } catch (err) {
      statuses.push({
        channel: 'instagram',
        source: `인스타그램 [${keyword}]`,
        keyword,
        status: 'failed',
        count: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { documents, statuses };
}
