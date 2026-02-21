// lib/ai/openaiSummarize.ts
import OpenAI from 'openai';
import type { AnalyticsResult, AIResponse } from '../types';
import { buildSummaryPrompt } from './prompts';

function getRuleBasedResponse(analytics: AnalyticsResult): AIResponse {
  const { meta, sentiment, trend_keywords, top_documents, negative_spikes } = analytics;

  const totalSentiment = sentiment.reduce(
    (acc, s) => ({
      positive: acc.positive + s.positive,
      neutral: acc.neutral + s.neutral,
      negative: acc.negative + s.negative,
    }),
    { positive: 0, neutral: 0, negative: 0 }
  );

  const totalDocs = meta.total_documents;
  const negRatio =
    totalDocs > 0
      ? Math.round((totalSentiment.negative / totalDocs) * 100)
      : 0;
  const hasSpike = negative_spikes.some((s) => s.is_spike);
  const trendingKws = trend_keywords.filter((k) => k.is_trending).slice(0, 5);

  const summary = [
    `${meta.start_date} ~ ${meta.end_date} 기간 동안 총 ${totalDocs}건의 문서가 수집되었습니다.`,
    `감성 분포는 긍정 ${totalSentiment.positive}건(${totalDocs > 0 ? Math.round(totalSentiment.positive / totalDocs * 100) : 0}%), 중립 ${totalSentiment.neutral}건, 부정 ${totalSentiment.negative}건(${negRatio}%)입니다.`,
    hasSpike
      ? '부정 언급 급증 구간이 감지되었습니다. 즉각적인 모니터링 강화가 필요합니다.'
      : '특이한 부정 스파이크는 감지되지 않았습니다.',
    trendingKws.length > 0
      ? `트렌드 키워드: ${trendingKws.map((k) => k.keyword).join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const keyIssues: string[] = [];
  if (hasSpike) keyIssues.push('부정 언급 급증 구간 감지 - 즉각 대응 필요');
  if (negRatio > 30) keyIssues.push(`부정 언급 비율 ${negRatio}% - 대응 필요`);

  // Extract common themes from top negative docs
  const negDocs = top_documents.filter((d) => d.sentiment === 'negative').slice(0, 3);
  for (const doc of negDocs) {
    keyIssues.push(`부정 이슈: ${doc.title.slice(0, 50)}...`);
  }

  if (trendingKws.length > 0) {
    keyIssues.push(
      `트렌드 키워드 급상승: ${trendingKws.map((k) => `${k.keyword}(z=${k.zscore})`).join(', ')}`
    );
  }

  if (keyIssues.length === 0) {
    keyIssues.push('현재 기간 내 특이 이슈 없음');
    keyIssues.push('일반적인 모니터링 지속 권장');
  }

  const monitoringKeywords = [
    ...meta.keywords.slice(0, 3),
    ...trendingKws.slice(0, 2).map((k) => k.keyword),
  ];

  return {
    summary,
    key_issues: keyIssues.slice(0, 7),
    response_guide: {
      fact_check: [
        `${meta.keywords.join('/')} 관련 보도 사실 여부 확인`,
        '공식 발표 내용과 언론 보도 내용 대조',
        '수치 오류 여부 확인 (금리, 한도, 조건 등)',
        '출처 신뢰성 검토 (주요 언론사 vs 블로그/커뮤니티)',
        '시간적 맥락 확인 (과거 정책과 현재 정책 혼동 여부)',
      ],
      faq: [
        {
          q: '한국주택금융공사의 주요 역할은 무엇인가요?',
          a: '한국주택금융공사(HF)는 주택담보대출 유동화, 주택연금, 전세자금보증 등을 통해 국민 주거 안정을 지원하는 공공기관입니다.',
        },
        {
          q: '보금자리론 신청 자격은 어떻게 되나요?',
          a: '보금자리론은 부부합산 연소득 7천만원 이하 무주택 세대주가 신청 가능하며, 주택 가격 6억원 이하 물건에 대해 최대 70%까지 대출 가능합니다.',
        },
        {
          q: '주택연금이란 무엇인가요?',
          a: '주택연금은 본인 소유 주택을 담보로 사망 시까지 매월 연금을 받을 수 있는 역모기지 상품으로, 만 55세 이상이면 신청 가능합니다.',
        },
        {
          q: '전세자금보증 신청은 어떻게 하나요?',
          a: '전세자금보증은 전세 계약 후 금융기관에서 신청하며, 보증금 한도와 조건은 지역·소득·자산 등에 따라 다릅니다.',
        },
        {
          q: 'MBS란 무엇인가요?',
          a: '주택저당증권(MBS)은 주택담보대출을 기반으로 발행되는 증권으로, 한국주택금융공사가 발행·보증하여 장기 주택금융의 안정적 공급을 지원합니다.',
        },
      ],
      notice_short: `한국주택금융공사는 ${meta.start_date}~${meta.end_date} 기간 발생한 관련 이슈에 대해 면밀히 모니터링하고 있으며, 고객 불편을 최소화하기 위해 최선을 다하겠습니다.`,
      notice_long: `한국주택금융공사(HF)는 최근 온라인상에서 발생한 ${meta.keywords.slice(0, 3).join(', ')} 관련 보도 및 커뮤니티 내용에 대해 신속하게 대응하고 있습니다.\n\n당사는 고객의 알 권리를 존중하며, 정확한 정보 제공을 위해 공식 채널(홈페이지, 고객센터)을 통한 확인을 권장합니다. 잘못된 정보로 인한 혼란이 발생하지 않도록 지속적으로 모니터링하고 있으며, 필요한 경우 즉각적인 해명 자료를 배포할 예정입니다.\n\n추가 문의사항은 고객센터(1688-8114)로 연락하시기 바랍니다.`,
      monitoring_keywords: monitoringKeywords.slice(0, 5),
      escalation_criteria: [
        '일별 부정 언급 30건 초과 시 긴급 대응팀 알림',
        '부정 언급 비율 40% 초과 시 상위 보고',
        '트렌드 키워드 z-score 3.0 이상 시 즉시 검토',
        '주요 언론사(조선/중앙/동아/한겨레/경향) 부정 보도 발생 시 즉각 대응',
        '커뮤니티 부정 게시글 100건 초과 시 FAQ 즉시 업데이트',
      ],
    },
    generated_at: new Date().toISOString(),
    is_demo: true,
  };
}

export async function generateAISummary(
  analytics: AnalyticsResult,
  openaiApiKey?: string
): Promise<AIResponse> {
  // If no API key, return rule-based response
  if (!openaiApiKey) {
    return getRuleBasedResponse(analytics);
  }

  try {
    const client = new OpenAI({ apiKey: openaiApiKey });

    const totalSentiment = analytics.sentiment.reduce(
      (acc, s) => ({
        positive: acc.positive + s.positive,
        neutral: acc.neutral + s.neutral,
        negative: acc.negative + s.negative,
      }),
      { positive: 0, neutral: 0, negative: 0 }
    );

    // Compress docs for prompt (title + snippet only)
    const compressedDocs = analytics.top_documents.slice(0, 20).map((d) => ({
      title: d.title,
      text: d.text.slice(0, 150),
      channel: d.channel,
      keyword: d.keyword,
      published_at: d.published_at,
    }));

    const prompt = buildSummaryPrompt(
      compressedDocs,
      analytics.meta.start_date,
      analytics.meta.end_date,
      analytics.meta.keywords,
      totalSentiment,
      analytics.trend_keywords
    );

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const content = completion.choices[0]?.message?.content || '';

    // Parse JSON response
    const parsed = JSON.parse(content);

    return {
      summary: parsed.summary || '',
      key_issues: parsed.key_issues || [],
      response_guide: parsed.response_guide || {},
      generated_at: new Date().toISOString(),
      is_demo: false,
    };
  } catch (err) {
    console.error('OpenAI API error, falling back to rule-based:', err);
    const fallback = getRuleBasedResponse(analytics);
    fallback.is_demo = true;
    return fallback;
  }
}
