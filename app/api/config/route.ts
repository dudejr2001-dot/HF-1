// app/api/config/route.ts
import { NextResponse } from 'next/server';
import keywordsConfig from '@/config/keywords.json';
import dcGalleriesConfig from '@/config/dc_galleries.json';

export async function GET() {
  const hasYouTubeKey = !!process.env.YOUTUBE_API_KEY;
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

  return NextResponse.json({
    keywords: keywordsConfig,
    dc_galleries: dcGalleriesConfig.galleries.filter((g: { enabled: boolean }) => g.enabled),
    capabilities: {
      youtube: hasYouTubeKey,
      openai: hasOpenAIKey,
    },
  });
}
