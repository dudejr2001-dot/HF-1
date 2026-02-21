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

function parseKoreanDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();

  // Format: "2024.01.15 12:30:00" or "2024.01.15"
  const fullMatch = cleaned.match(/(\d{4})\.(\d{2})\.(\d{2})\s*(\d{2}):(\d{2})/);
  if (fullMatch) {
    return new Date(
      `${fullMatch[1]}-${fullMatch[2]}-${fullMatch[3]}T${fullMatch[4]}:${fullMatch[5]}:00+09:00`
    );
  }

  const dateMatch = cleaned.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (dateMatch) {
    return new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T12:00:00+09:00`);
  }

  // Format: "01.15" (current year)
  const shortMatch = cleaned.match(/^(\d{2})\.(\d{2})$/);
  if (shortMatch) {
    const year = new Date().getFullYear();
    return new Date(`${year}-${shortMatch[1]}-${shortMatch[2]}T12:00:00+09:00`);
  }

  // Format: "12:30" (today)
  const timeMatch = cleaned.match(/^(\d{2}):(\d{2})$/);
  if (timeMatch) {
    const now = new Date();
    const d = new Date();
    d.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0);
    return d;
  }

  return null;
}

async function fetchGalleryPage(
  gallery: DCGallery,
  keyword: string,
  page: number,
  settings: typeof dcGalleriesConfig.settings
): Promise<{ items: Array<{ title: string; url: string; date: string; excerpt: string }>; success: boolean }> {
  const searchUrl = gallery.search_url
    .replace('{keyword}', encodeURIComponent(keyword))
    + `&page=${page}`;

  try {
    await delay(settings.request_delay_ms);

    const response = await axios.get(searchUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': settings.user_agent,
        'Referer': 'https://gall.dcinside.com',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });

    const $ = cheerio.load(response.data as string);
    const items: Array<{ title: string; url: string; date: string; excerpt: string }> = [];

    // DCInside gallery list table rows
    $('tr.ub-content, .gall_list tbody tr').each((_, row) => {
      const $row = $(row);

      // Skip notice/banner rows
      if ($row.hasClass('notice') || $row.hasClass('gall_notice')) return;

      const titleEl = $row.find('.gall_tit a:not(.reply_numbox), td.gall_tit a').first();
      const dateEl = $row.find('.gall_date, td.gall_date').first();

      const title = titleEl.text().trim();
      const href = titleEl.attr('href') || '';
      const date = dateEl.attr('title') || dateEl.text().trim();
      const excerpt = $row.find('.ub-content, .gall_content').text().trim();

      if (!title || !href) return;

      const fullUrl = href.startsWith('http')
        ? href
        : `https://gall.dcinside.com${href}`;

      items.push({ title, url: fullUrl, date, excerpt });
    });

    return { items, success: true };
  } catch {
    return { items: [], success: false };
  }
}

async function fetchPostDetail(
  url: string,
  settings: typeof dcGalleriesConfig.settings
): Promise<{ body: string; commentCount: number } | null> {
  try {
    await delay(settings.request_delay_ms / 2);

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': settings.user_agent,
        'Referer': 'https://gall.dcinside.com',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });

    const $ = cheerio.load(response.data as string);
    const body = $('.write_div, .s_write div').text().trim().slice(0, 2000);
    const commentCountText = $('.cmt_title_num, .gall_comment_count').first().text().trim();
    const commentCount = parseInt(commentCountText.replace(/[^\d]/g, '')) || 0;

    return { body, commentCount };
  } catch {
    return null;
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
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const { settings } = dcGalleriesConfig;
  const galleries = (dcGalleriesConfig.galleries as DCGallery[]).filter(
    (g) => g.enabled && galleryIds.includes(g.id)
  );

  for (const gallery of galleries) {
    for (const keyword of keywords) {
      let totalCount = 0;
      let failed = false;
      let pagesFetched = 0;
      let reachedBoundary = false;

      for (let page = 1; page <= settings.max_pages_per_gallery; page++) {
        if (totalCount >= settings.max_posts_per_gallery) break;
        if (reachedBoundary) break;

        const { items, success } = await fetchGalleryPage(gallery, keyword, page, settings);

        if (!success) {
          failed = true;
          break;
        }

        if (items.length === 0) break;

        pagesFetched++;

        for (const item of items) {
          if (totalCount >= settings.max_posts_per_gallery) break;

          const parsedDate = parseKoreanDate(item.date);
          if (!parsedDate) continue;

          // If post is older than start, stop collecting
          if (parsedDate < start) {
            reachedBoundary = true;
            break;
          }

          if (parsedDate > end) continue;

          // Optionally fetch post detail (limit to avoid too many requests)
          let body = item.excerpt;
          let commentCount = 0;

          if (totalCount < 10 && item.url) {
            const detail = await fetchPostDetail(item.url, settings);
            if (detail) {
              body = detail.body || body;
              commentCount = detail.commentCount;
            }
          }

          const doc: RawDocument = {
            id: generateId(`dc_${gallery.id}_${keyword}_${item.url}_${parsedDate.getTime()}`),
            channel: 'dc',
            keyword,
            title: item.title,
            text: body || item.title,
            url: item.url,
            published_at: parsedDate.toISOString(),
            fetched_at: fetchedAt,
            source_meta: {
              gallery_name: gallery.name,
              gallery_id: gallery.gallery_id,
              comment_count: commentCount,
            },
          };

          documents.push(doc);
          totalCount++;
        }
      }

      statuses.push({
        channel: 'dc',
        source: `DCInside: ${gallery.name} (${keyword})`,
        keyword,
        status: failed ? 'failed' : totalCount > 0 ? 'success' : 'partial',
        count: totalCount,
        error: failed ? 'Parser failed or network error' : undefined,
      });
    }
  }

  return { documents, statuses };
}
