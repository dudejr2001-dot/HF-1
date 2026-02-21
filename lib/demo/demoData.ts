// lib/demo/demoData.ts
import type { AnalyticsResult, RawDocument, AnalyzedDocument, Channel, Granularity, MentionDataPoint, SentimentDataPoint } from '../types';

const KEYWORDS = ['한국주택금융공사', 'HF', '보금자리론', '주택연금', '전세자금보증', 'MBS'];
const CHANNELS: Channel[] = ['news', 'youtube', 'dc'];

const DEMO_TITLES = [
  { title: '한국주택금융공사, 보금자리론 금리 인하 결정', sentiment: 'positive' as const },
  { title: '주택연금 수령액 늘린다… HF 개정안 발표', sentiment: 'positive' as const },
  { title: '전세자금보증 사기 의혹, 주금공 조사 착수', sentiment: 'negative' as const },
  { title: '보금자리론 한도 확대 검토 중', sentiment: 'positive' as const },
  { title: 'MBS 발행 규모 역대 최대... 시장 우려 목소리', sentiment: 'negative' as const },
  { title: '한국주택금융공사 연간 보증 규모 증가세', sentiment: 'neutral' as const },
  { title: '전세지킴보증 신청자 급증, 서버 마비 사태', sentiment: 'negative' as const },
  { title: '주택연금 가입자 50만 명 돌파', sentiment: 'positive' as const },
  { title: '커버드본드 지급보증 관련 규제 강화 논의', sentiment: 'negative' as const },
  { title: 'HF, 저소득층 보금자리론 우대금리 확대', sentiment: 'positive' as const },
  { title: '건설자금보증 부실 우려... 업계 긴장', sentiment: 'negative' as const },
  { title: '주금공, 디지털 전환 가속화 발표', sentiment: 'positive' as const },
  { title: '전세자금보증 부정 수급 적발 사례 증가', sentiment: 'negative' as const },
  { title: '보금자리론 2년 연속 실적 성장', sentiment: 'positive' as const },
  { title: '한국주택금융공사 고객센터 응답률 개선', sentiment: 'neutral' as const },
];

const DC_TITLES = [
  { title: '보금자리론 신청했는데 거절됨 이유가 뭔가요', sentiment: 'negative' as const },
  { title: '주택연금 진짜 가입할만한가요 후기 궁금', sentiment: 'neutral' as const },
  { title: '전세사기 당한 것 같아요 HF 보증 의미없네요', sentiment: 'negative' as const },
  { title: '주금공 대출 심사 기준 바뀐 거 아닌가요', sentiment: 'neutral' as const },
  { title: '보금자리론 금리 다른 은행이랑 비교하면 어때요', sentiment: 'neutral' as const },
  { title: 'MBS 금리 오르면 보금자리론도 오르나요', sentiment: 'negative' as const },
  { title: '주택연금 신청 완료했습니다 도움 많이 받았어요', sentiment: 'positive' as const },
];

const YT_TITLES = [
  { title: '보금자리론 완벽 가이드 2024 - 자격요건부터 신청까지', sentiment: 'positive' as const },
  { title: '주택연금 가입 전 반드시 알아야 할 5가지', sentiment: 'neutral' as const },
  { title: '전세사기 예방법 - 전세자금보증 활용하기', sentiment: 'neutral' as const },
  { title: '한국주택금융공사 논란 총정리', sentiment: 'negative' as const },
  { title: 'MBS란 무엇인가? 주택시장과의 관계', sentiment: 'neutral' as const },
];

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDates(startDate: string, endDate: string, count: number): string[] {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const ts = start + Math.random() * (end - start);
    dates.push(new Date(ts).toISOString());
  }
  return dates.sort();
}

export function generateDemoDocuments(
  startDate: string,
  endDate: string,
  keywords: string[],
  channels: Channel[]
): RawDocument[] {
  const docs: RawDocument[] = [];
  const now = new Date().toISOString();
  const dates = generateDates(startDate, endDate, 80);

  let idx = 0;

  // News docs
  if (channels.includes('news')) {
    for (let i = 0; i < 30; i++) {
      const kw = KEYWORDS[i % KEYWORDS.length];
      if (!keywords.includes(kw)) continue;
      const titleData = DEMO_TITLES[i % DEMO_TITLES.length];
      docs.push({
        id: `demo_news_${i}`,
        channel: 'news',
        keyword: kw,
        title: titleData.title,
        text: `${titleData.title}. 한국주택금융공사에 따르면 이번 조치는 서민 주거 안정을 위한 핵심 정책의 일환으로 추진된다. 관련 업계는 ${['긍정적', '우려스러운', '신중한'][i % 3]} 반응을 보이고 있다.`,
        url: `https://example.com/news/${i}`,
        published_at: dates[idx++ % dates.length],
        fetched_at: now,
        source_meta: {
          source: ['조선일보', '한겨레', '중앙일보', '경향신문', '매일경제'][i % 5],
        },
      });
    }
  }

  // YouTube docs
  if (channels.includes('youtube')) {
    for (let i = 0; i < 15; i++) {
      const kw = KEYWORDS[i % KEYWORDS.length];
      if (!keywords.includes(kw)) continue;
      const titleData = YT_TITLES[i % YT_TITLES.length];
      docs.push({
        id: `demo_yt_${i}`,
        channel: 'youtube',
        keyword: kw,
        title: titleData.title,
        text: `${titleData.title}. 이 영상에서는 ${kw} 관련 최신 정보와 활용 방법을 자세히 알아봅니다.`,
        url: `https://youtube.com/watch?v=demo${i}`,
        published_at: dates[idx++ % dates.length],
        fetched_at: now,
        source_meta: {
          video_id: `demo${i}`,
          channel_title: ['부동산TV', '금융채널', '주거복지TV'][i % 3],
          view_count: randomBetween(1000, 100000),
          like_count: randomBetween(10, 5000),
        },
      });
    }
  }

  // DC docs
  if (channels.includes('dc')) {
    for (let i = 0; i < 25; i++) {
      const kw = KEYWORDS[i % KEYWORDS.length];
      if (!keywords.includes(kw)) continue;
      const titleData = DC_TITLES[i % DC_TITLES.length];
      docs.push({
        id: `demo_dc_${i}`,
        channel: 'dc',
        keyword: kw,
        title: titleData.title,
        text: `${titleData.title}. ${['부동산 갤러리에서 많은 분들이 관심을 가지고 있는 주제입니다.', '금융 갤러리 회원들 사이에서 논의가 활발합니다.', '대출 갤러리에서 자주 나오는 질문입니다.'][i % 3]}`,
        url: `https://gall.dcinside.com/board/view/?id=realestate&no=${10000 + i}`,
        published_at: dates[idx++ % dates.length],
        fetched_at: now,
        source_meta: {
          gallery_name: ['부동산', '금융', '대출', '정책'][i % 4],
          comment_count: randomBetween(0, 50),
        },
      });
    }
  }

  return docs;
}

export function generateDemoAnalytics(
  startDate: string,
  endDate: string,
  granularity: Granularity,
  keywords: string[],
  channels: Channel[]
): AnalyticsResult {
  const now = new Date().toISOString();

  // Generate date buckets
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  let bucketCount: number;
  let bucketUnit: number;
  let labelFn: (d: Date) => string;
  let bucketFn: (d: Date) => string;

  switch (granularity) {
    case 'daily':
      bucketCount = Math.min(diffDays + 1, 30);
      bucketUnit = 1;
      labelFn = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
      bucketFn = (d) => d.toISOString().slice(0, 10);
      break;
    case 'weekly':
      bucketCount = Math.min(Math.ceil(diffDays / 7), 12);
      bucketUnit = 7;
      labelFn = (d) => `${d.getMonth() + 1}/${d.getDate()}주`;
      bucketFn = (d) => d.toISOString().slice(0, 10);
      break;
    case 'monthly':
      bucketCount = Math.min(Math.ceil(diffDays / 30), 12);
      bucketUnit = 30;
      labelFn = (d) => `${d.getFullYear()}/${d.getMonth() + 1}`;
      bucketFn = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      break;
    case 'quarterly':
      bucketCount = Math.min(Math.ceil(diffDays / 90), 8);
      bucketUnit = 90;
      labelFn = (d) => `${d.getFullYear()}Q${Math.ceil((d.getMonth() + 1) / 3)}`;
      bucketFn = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      break;
    case 'yearly':
      bucketCount = Math.min(Math.ceil(diffDays / 365), 5);
      bucketUnit = 365;
      labelFn = (d) => `${d.getFullYear()}`;
      bucketFn = (d) => `${d.getFullYear()}-01-01`;
      break;
  }

  const mentions: MentionDataPoint[] = [];
  const sentiment: SentimentDataPoint[] = [];

  for (let i = 0; i < bucketCount; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i * bucketUnit);
    const label = labelFn(d);
    const bucket = bucketFn(d);

    // Simulate a spike in the middle
    const spikeMultiplier = i === Math.floor(bucketCount / 2) ? 2.5 : 1;
    const base = randomBetween(10, 40);
    const total = Math.round(base * spikeMultiplier);
    const newsCount = channels.includes('news') ? Math.round(total * 0.5) : 0;
    const ytCount = channels.includes('youtube') ? Math.round(total * 0.2) : 0;
    const dcCount = channels.includes('dc') ? Math.round(total * 0.3) : 0;

    mentions.push({
      bucket,
      label,
      total: newsCount + ytCount + dcCount,
      news: newsCount,
      youtube: ytCount,
      dc: dcCount,
      instagram: 0,
      blog: 0,
      tistory: 0,
    });

    const neg = spikeMultiplier > 1 ? Math.round(total * 0.45) : Math.round(total * 0.2);
    const pos = Math.round(total * 0.3);
    const neu = total - neg - pos;
    const negRatio = total > 0 ? neg / total : 0;
    const negZscore = spikeMultiplier > 1 ? 2.8 : randomBetween(-10, 10) / 10;

    sentiment.push({
      bucket,
      label,
      positive: pos,
      neutral: Math.max(neu, 0),
      negative: neg,
      positive_ratio: total > 0 ? Math.round(pos / total * 100) : 0,
      neutral_ratio: total > 0 ? Math.round(Math.max(neu, 0) / total * 100) : 0,
      negative_ratio: total > 0 ? Math.round(neg / total * 100) : 0,
      avg_score: spikeMultiplier > 1 ? -0.35 : 0.05,
      delta_negative: i > 0 ? neg - Math.round(base * 0.2) : 0,
      negative_zscore: negZscore,
    });
  }

  const trendKeywords = [
    { keyword: '보금자리론', zscore: 3.2, count: 45, prev_count: 12, delta: 33, is_trending: true },
    { keyword: '전세사기', zscore: 2.8, count: 38, prev_count: 15, delta: 23, is_trending: true },
    { keyword: '금리인상', zscore: 2.5, count: 30, prev_count: 14, delta: 16, is_trending: true },
    { keyword: '주택연금', zscore: 2.1, count: 25, prev_count: 13, delta: 12, is_trending: true },
    { keyword: '대출규제', zscore: 1.8, count: 20, prev_count: 12, delta: 8, is_trending: false },
    { keyword: '공시가격', zscore: 1.5, count: 18, prev_count: 11, delta: 7, is_trending: false },
    { keyword: '모기지', zscore: 1.2, count: 15, prev_count: 10, delta: 5, is_trending: false },
    { keyword: '부동산정책', zscore: 0.9, count: 12, prev_count: 9, delta: 3, is_trending: false },
  ];

  const negativeSpikes = sentiment
    .filter((s) => s.negative_zscore !== undefined && s.negative_zscore >= 1.5)
    .map((s) => ({
      bucket: s.bucket,
      zscore: s.negative_zscore!,
      negative_count: s.negative,
      negative_ratio: s.negative_ratio / 100,
      is_spike: s.negative_zscore! >= 2,
    }));

  const topDocs: AnalyzedDocument[] = [];
  const mockDocs = generateDemoDocuments(startDate, endDate, keywords, channels);
  for (const doc of mockDocs.slice(0, 20)) {
    const sentimentScores: { sentiment: 'positive' | 'neutral' | 'negative'; score: number }[] = [
      { sentiment: 'negative', score: -0.7 },
      { sentiment: 'neutral', score: 0.0 },
      { sentiment: 'positive', score: 0.6 },
    ];
    const s = sentimentScores[Math.floor(Math.random() * 3)];
    topDocs.push({ ...doc, sentiment: s.sentiment, sentiment_score: s.score });
  }

  return {
    meta: {
      start_date: startDate,
      end_date: endDate,
      granularity,
      keywords,
      channels,
      generated_at: now,
      total_documents: topDocs.length,
    },
    mentions,
    sentiment,
    trend_keywords: trendKeywords,
    keyword_mentions: keywords.map((kw) => ({
      keyword: kw,
      total: randomBetween(5, 50),
      by_channel: {
        news: randomBetween(2, 20),
        youtube: randomBetween(1, 10),
        dc: randomBetween(1, 15),
      },
      by_bucket: mentions.map((m) => ({
        bucket: m.bucket,
        count: randomBetween(0, 10),
      })),
    })),
    negative_spikes: negativeSpikes,
    top_documents: topDocs,
    channel_stats: {
      news: channels.includes('news') ? randomBetween(20, 40) : 0,
      youtube: channels.includes('youtube') ? randomBetween(10, 20) : 0,
      dc: channels.includes('dc') ? randomBetween(15, 30) : 0,
    },
    collect_status: [
      { channel: 'news', source: 'Google News RSS (데모)', status: 'success', count: 30 },
      { channel: 'youtube', source: 'YouTube API (데모)', status: 'success', count: 15 },
      { channel: 'dc', source: 'DCInside 부동산 갤러리 (데모)', status: 'success', count: 25 },
    ],
  };
}
