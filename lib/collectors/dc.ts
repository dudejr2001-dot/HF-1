// lib/collectors/dc.ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { RawDocument, CollectStatus } from '../types';
import dcGalleriesConfig from '../../config/dc_galleries.json';

interface DCGallery {
  id: string;
  name: string;
  gallery_id: string;
  url: string;
  search_url: string;
  enabled: boolean;
}

function generateId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `dc_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDCDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();

  // "2026.02.16" or "26/02/16" or "21.02.02"
  const fullMatch = cleaned.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (fullMatch) {
    return new Date(`${fullMatch[1]}-${fullMatch[2]}-${fullMatch[3]}T12:00:00+09:00`);
  }

  // "26/02/16" → 2026-02-16
  const shortSlash = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (shortSlash) {
    return new Date(`20${shortSlash[1]}-${shortSlash[2]}-${shortSlash[3]}T12:00:00+09:00`);
  }

  // "21.02.02" → 2021-02-02 or 2026-02-02?
  const dotShort = cleaned.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (dotShort) {
    const year = parseInt(dotShort[1]) > 50 ? `19${dotShort[1]}` : `20${dotShort[1]}`;
    return new Date(`${year}-${dotShort[2]}-${dotShort[3]}T12:00:00+09:00`);
  }

  // "2024.01.15 12:30"
  const withTime = cleaned.match(/(\d{4})\.(\d{2})\.(\d{2})\s*(\d{2}):(\d{2})/);
  if (withTime) {
    return new Date(`${withTime[1]}-${withTime[2]}-${withTime[3]}T${withTime[4]}:${withTime[5]}:00+09:00`);
  }

  // "12:30" (today)
  const timeOnly = cleaned.match(/^(\d{2}):(\d{2})$/);
  if (timeOnly) {
    const now = new Date();
    now.setHours(parseInt(timeOnly[1]), parseInt(timeOnly[2]), 0, 0);
    return now;
  }

  return null;
}

async function fetchGallerySearchPage(
  gallery: DCGallery,
  keyword: string,
  page: number,
  settings: typeof dcGalleriesConfig.settings,
  startDate: Date,
  endDate: Date,
  fetchedAt: string
): Promise<{ docs: RawDocument[]; reachedBoundary: boolean; success: boolean }> {
  const searchUrl = `https://gall.dcinside.com/board/lists/?id=${gallery.gallery_id}&s_type=search_subject_memo&s_keyword=${encodeURIComponent(keyword)}&page=${page}`;

  try {
    await delay(settings.request_delay_ms);

    const response = await axios.get(searchUrl, {
      timeout: 12000,
      headers: {
        'User-Agent': settings.user_agent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
        'Referer': `https://gall.dcinside.com/board/lists/?id=${gallery.gallery_id}`,
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
    });

    const $ = cheerio.load(response.data as string);
    const docs: RawDocument[] = [];
    let reachedBoundary = false;

    // DC인사이드 갤러리 게시물 목록: tbody tr > td.gall_tit, td.gall_date
    $('tbody tr').each((_, row) => {
      const $row = $(row);

      // 광고/공지 제외 (클래스 확인)
      const rowClass = $row.attr('class') || '';
      if (rowClass.includes('notice') || rowClass.includes('ad')) return;

      // 제목 추출 (.gall_tit a)
      const titleEl = $row.find('.gall_tit a').first();
      const title = titleEl.text().trim();
      if (!title || title.length < 2) return;

      // 광고 URL 제외
      let href = titleEl.attr('href') || '';
      if (href.includes('addc.dcinside.com') || href.startsWith('javascript')) return;

      if (href && !href.startsWith('http')) {
        href = `https://gall.dcinside.com${href}`;
      }

      // 날짜 추출
      const dateEl = $row.find('.gall_date, td.gall_date').first();
      const dateStr = dateEl.attr('title') || dateEl.text().trim();
      const pubDate = parseDCDate(dateStr);

      if (!pubDate) return;

      // 날짜 범위 체크
      if (pubDate < startDate) {
        reachedBoundary = true;
        return false; // break each
      }
      if (pubDate > endDate) return;

      docs.push({
        id: generateId(`dc_${gallery.gallery_id}_${keyword}_${href}_${dateStr}`),
        channel: 'dc',
        keyword,
        title,
        text: title, // DC는 목록에서 본문 미제공, 제목으로 대체
        url: href,
        published_at: pubDate.toISOString(),
        fetched_at: fetchedAt,
        source_meta: {
          source: `DC인사이드 ${gallery.name}갤러리`,
          gallery_name: gallery.name,
          gallery_id: gallery.gallery_id,
        },
      });
    });

    return { docs, reachedBoundary, success: true };
  } catch (err) {
    return { docs: [], reachedBoundary: false, success: false };
  }
}

export async function collectDC(
  keywords: string[],
  startDate: string,
  endDate: string,
  galleryIds: string[]
): Promise<{ documents: RawDocument[]; statuses: CollectStatus[] }> {
  const documents: RawDocument[] = [];
  const statuses: CollectStatus[] = [];
  const fetchedAt = new Date().toISOString();

  // DC 크롤러는 최근 게시물만 제공 → 요청 기간이 30일 이상 이전이면 최근 30일로 확장
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const rawStart = new Date(startDate);
  const rawEnd = new Date(endDate);
  rawEnd.setHours(23, 59, 59, 999);

  const start = rawStart < thirtyDaysAgo ? thirtyDaysAgo : rawStart;
  const end = rawEnd > now ? now : rawEnd;

  const settings = dcGalleriesConfig.settings;

  // 활성화된 갤러리 중 선택된 것만
  const enabledGalleries = (dcGalleriesConfig.galleries as DCGallery[]).filter(
    (g) => g.enabled && (galleryIds.length === 0 || galleryIds.includes(g.id))
  );

  // 활성 갤러리가 없으면 기본으로 loan + house 사용
  const targetGalleries = enabledGalleries.length > 0
    ? enabledGalleries
    : (dcGalleriesConfig.galleries as DCGallery[]).filter(g => ['loan', 'house'].includes(g.id));

  for (const keyword of keywords) {
    let keywordTotal = 0;
    let keywordFailed = 0;

    for (const gallery of targetGalleries) {
      let galleryDocs: RawDocument[] = [];

      for (let page = 1; page <= settings.max_pages_per_gallery; page++) {
        const { docs, reachedBoundary, success } = await fetchGallerySearchPage(
          gallery,
          keyword,
          page,
          settings,
          start,
          end,
          fetchedAt
        );

        if (!success) {
          keywordFailed++;
          break;
        }

        galleryDocs.push(...docs);
        if (reachedBoundary || docs.length === 0) break;
        if (galleryDocs.length >= settings.max_posts_per_gallery) break;
      }

      documents.push(...galleryDocs);
      keywordTotal += galleryDocs.length;
    }

    statuses.push({
      channel: 'dc',
      source: `DC인사이드 [${keyword}] (${targetGalleries.map(g => g.name).join(', ')} 갤러리)`,
      keyword,
      status: keywordTotal > 0 ? 'success' : (keywordFailed > 0 ? 'failed' : 'partial'),
      count: keywordTotal,
      error: keywordTotal === 0 ? `해당 기간(${startDate}~${endDate}) 내 게시물 없음 또는 갤러리 접근 실패` : undefined,
    });
  }

  return { documents, statuses };
}
