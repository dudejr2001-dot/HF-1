// lib/ai/prompts.ts

export function buildSummaryPrompt(
  docs: Array<{ title: string; text: string; channel: string; keyword: string; published_at: string }>,
  startDate: string,
  endDate: string,
  keywords: string[],
  sentimentSummary: { positive: number; neutral: number; negative: number },
  trendKeywords: Array<{ keyword: string; zscore: number }>
): string {
  const docSummaries = docs
    .slice(0, 20)
    .map((d, i) => {
      const snippet = d.text.slice(0, 200).replace(/\n/g, ' ');
      return `[${i + 1}] [${d.channel}/${d.keyword}] (${d.published_at.slice(0, 10)}) ${d.title}\n요약: ${snippet}`;
    })
    .join('\n\n');

  const trendStr = trendKeywords
    .slice(0, 10)
    .map((k) => `${k.keyword}(z=${k.zscore})`)
    .join(', ');

  return `당신은 한국주택금융공사(HF)의 미디어 모니터링 전문 분석가입니다.

[분석 기간] ${startDate} ~ ${endDate}
[모니터링 키워드] ${keywords.join(', ')}
[감성 현황] 긍정: ${sentimentSummary.positive}건, 중립: ${sentimentSummary.neutral}건, 부정: ${sentimentSummary.negative}건
[트렌드 키워드] ${trendStr || '없음'}

아래는 수집된 주요 문서 목록입니다:

${docSummaries}

위 정보를 바탕으로 다음 항목을 **한국어**로 작성해주세요. JSON 형식으로 응답하세요.

{
  "summary": "전체 모니터링 기간의 핵심 내용을 3~5문장으로 요약 (HF 관련 주요 동향, 감성 흐름, 특이사항 포함)",
  "key_issues": ["핵심 이슈 1", "핵심 이슈 2", "핵심 이슈 3", ... (3~7개)],
  "response_guide": {
    "fact_check": ["사실확인 항목 1", "사실확인 항목 2", ... (3~5개)"],
    "faq": [
      {"q": "자주 묻는 질문 1", "a": "답변 1"},
      ... (5~7개)
    ],
    "notice_short": "짧은 공지문 (100자 내외)",
    "notice_long": "긴 공지문 (300자 내외, 상황 설명 + 대응 방향 포함)",
    "monitoring_keywords": ["추가 모니터링 권장 키워드 1", ... (3~5개)"],
    "escalation_criteria": ["에스컬레이션 기준 1 (예: 부정 언급 일 50건 초과)", ... (3~5개)"]
  }
}

반드시 위 JSON 형식만 응답하세요. 마크다운 코드블록 없이 순수 JSON만 작성하세요.`;
}
