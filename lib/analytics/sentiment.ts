// lib/analytics/sentiment.ts
import type { RawDocument, SentimentResult } from '../types';

// Korean sentiment word dictionaries
const POSITIVE_WORDS = new Set([
  '좋은', '훌륭한', '우수한', '탁월한', '성공', '성장', '증가', '향상', '개선', '혜택',
  '지원', '보호', '안전', '안정', '신뢰', '확대', '강화', '활성화', '추진', '달성',
  '완료', '해결', '획득', '승인', '긍정', '호조', '상승', '회복', '정상', '원활',
  '효율', '효과', '최고', '최우수', '적극', '우대', '편리', '신속', '정확', '투명',
  '공정', '합리', '도움', '지지', '응원', '기대', '희망', '만족', '인정', '수혜',
  '유리', '긍정적', '호평', '인기', '수요증가', '흑자', '절감', '우호', '환영',
  '혜택확대', '금리인하', '지원확대', '조건완화', '혜택증가'
]);

const NEGATIVE_WORDS = new Set([
  '우려', '문제', '위기', '위험', '손실', '감소', '하락', '악화', '부실', '부담',
  '논란', '갈등', '비판', '반발', '거부', '거절', '실패', '취소', '지연', '중단',
  '파산', '도산', '손해', '피해', '사기', '부정', '불법', '위반', '제재', '처벌',
  '소송', '고발', '조사', '수사', '적발', '발각', '스캔들', '사고', '오류', '결함',
  '불만', '항의', '거센', '비난', '폭락', '급락', '급등', '혼란', '불안', '공포',
  '충격', '경고', '적자', '부채', '연체', '부도', '디폴트', '위축', '침체', '불황',
  '규제강화', '금리인상', '문제점', '리스크', '부담증가', '조건강화', '자격박탈',
  '사태', '횡령', '배임', '비리', '부정부패', '불투명', '논쟁', '분쟁', '갈등'
]);

const NEUTRAL_MODIFIERS = new Set([
  '변경', '조정', '검토', '논의', '발표', '시행', '개정', '수정', '예정', '계획',
  '발의', '제출', '입법', '시작', '종료', '운영', '관리', '진행', '협의', '협력'
]);

/**
 * Simple rule-based Korean sentiment analysis
 * Returns score from -1 (very negative) to +1 (very positive)
 */
export function analyzeSentiment(text: string, title: string): SentimentResult {
  const fullText = `${title} ${text}`.toLowerCase();
  
  let positiveScore = 0;
  let negativeScore = 0;

  // Check positive words
  POSITIVE_WORDS.forEach((word) => {
    if (fullText.includes(word)) {
      positiveScore += 1;
    }
  });

  // Check negative words
  NEGATIVE_WORDS.forEach((word) => {
    if (fullText.includes(word)) {
      negativeScore += 1;
    }
  });

  // Negation handling (부정 표현 앞에 오는 긍정어 반전)
  const negations = ['아니', '않', '못', '불', '비', '무', '미'];
  for (const neg of negations) {
    if (fullText.includes(neg)) {
      // Simple heuristic: add to negative if negation exists
      negativeScore += 0.5;
    }
  }

  const total = positiveScore + negativeScore;
  
  if (total === 0) {
    return { sentiment: 'neutral', score: 0 };
  }

  const rawScore = (positiveScore - negativeScore) / total;
  
  // Threshold-based classification
  if (rawScore > 0.2) {
    return { sentiment: 'positive', score: Math.min(rawScore, 1) };
  } else if (rawScore < -0.2) {
    return { sentiment: 'negative', score: Math.max(rawScore, -1) };
  } else {
    return { sentiment: 'neutral', score: rawScore };
  }
}

/**
 * Batch analyze sentiment for multiple documents
 */
export function batchAnalyzeSentiment(
  docs: RawDocument[]
): Map<string, SentimentResult> {
  const results = new Map<string, SentimentResult>();
  for (const doc of docs) {
    results.set(doc.id, analyzeSentiment(doc.text, doc.title));
  }
  return results;
}
