// lib/collectors/youtube.ts
import type { RawDocument, CollectStatus } from '../types';

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    publishedAt: string;
    title: string;
    description: string;
    channelTitle: string;
  };
}

interface YouTubeVideoStats {
  id: string;
  statistics: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
}

function generateId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `yt_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
}

export async function collectYouTube(
  keywords: string[],
  startDate: string,
  endDate: string,
  apiKey: string
): Promise<{ documents: RawDocument[]; statuses: CollectStatus[] }> {
  const documents: RawDocument[] = [];
  const statuses: CollectStatus[] = [];
  const fetchedAt = new Date().toISOString();

  // RFC 3339 format for YouTube API
  const publishedAfter = new Date(startDate).toISOString();
  const publishedBefore = new Date(endDate);
  publishedBefore.setHours(23, 59, 59, 999);
  const publishedBeforeStr = publishedBefore.toISOString();

  for (const keyword of keywords) {
    try {
      const searchParams = new URLSearchParams({
        part: 'snippet',
        q: keyword,
        type: 'video',
        relevanceLanguage: 'ko',
        regionCode: 'KR',
        publishedAfter,
        publishedBefore: publishedBeforeStr,
        maxResults: '25',
        key: apiKey,
      });

      const searchUrl = `https://www.googleapis.com/youtube/v3/search?${searchParams}`;
      const searchRes = await fetch(searchUrl);

      if (!searchRes.ok) {
        const errBody = await searchRes.text();
        throw new Error(`YouTube API error ${searchRes.status}: ${errBody}`);
      }

      const searchData = await searchRes.json();
      const items: YouTubeSearchItem[] = searchData.items || [];

      if (items.length === 0) {
        statuses.push({
          channel: 'youtube',
          source: `YouTube API (${keyword})`,
          keyword,
          status: 'partial',
          count: 0,
        });
        continue;
      }

      // Fetch statistics for all video IDs
      const videoIds = items.map((i) => i.id.videoId).join(',');
      let statsMap: Record<string, YouTubeVideoStats['statistics']> = {};

      try {
        const statsParams = new URLSearchParams({
          part: 'statistics',
          id: videoIds,
          key: apiKey,
        });
        const statsRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?${statsParams}`
        );
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          for (const item of statsData.items || []) {
            statsMap[item.id] = item.statistics;
          }
        }
      } catch {
        // stats are optional
      }

      for (const item of items) {
        const videoId = item.id.videoId;
        const stats = statsMap[videoId] || {};
        const doc: RawDocument = {
          id: generateId(`yt_${keyword}_${videoId}`),
          channel: 'youtube',
          keyword,
          title: item.snippet.title || '',
          text: item.snippet.description || '',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          published_at: item.snippet.publishedAt,
          fetched_at: fetchedAt,
          source_meta: {
            video_id: videoId,
            channel_title: item.snippet.channelTitle,
            view_count: stats.viewCount ? parseInt(stats.viewCount) : undefined,
            like_count: stats.likeCount ? parseInt(stats.likeCount) : undefined,
            comment_count: stats.commentCount
              ? parseInt(stats.commentCount)
              : undefined,
          },
        };
        documents.push(doc);
      }

      statuses.push({
        channel: 'youtube',
        source: `YouTube API (${keyword})`,
        keyword,
        status: 'success',
        count: items.length,
      });
    } catch (err) {
      statuses.push({
        channel: 'youtube',
        source: `YouTube API (${keyword})`,
        keyword,
        status: 'failed',
        count: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { documents, statuses };
}
