// app/api/demo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateDemoAnalytics } from '@/lib/demo/demoData';
import type { Channel, Granularity } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      startDate = '2024-01-01',
      endDate = '2024-12-31',
      granularity = 'monthly',
      keywords = ['한국주택금융공사', 'HF', '보금자리론', '주택연금', '전세자금보증'],
      channels = ['news', 'youtube', 'dc'],
    } = body as {
      startDate: string;
      endDate: string;
      granularity: Granularity;
      keywords: string[];
      channels: Channel[];
    };

    const analytics = generateDemoAnalytics(startDate, endDate, granularity, keywords, channels);
    return NextResponse.json(analytics);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Demo data generation failed' },
      { status: 500 }
    );
  }
}
