// app/api/download/manual/route.ts
// MANUAL.md + 임원보고용 1페이지 → .docx 생성 후 다운로드
import { NextRequest, NextResponse } from 'next/server';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, Table, TableRow, TableCell, WidthType,
  BorderStyle, ShadingType, PageBreak, Header, Footer,
  PageNumber, NumberFormat, convertInchesToTwip,
} from 'docx';

/* ───────── 색상 팔레트 ───────── */
const NAVY   = '0B1F3B';
const WHITE  = 'FFFFFF';
const GRAY_L = 'F2F4F7';
const GRAY_M = 'E5E7EB';
const RED_L  = 'FEE2E2';
const RED_D  = 'B91C1C';
const GREEN_L= 'DCFCE7';
const GREEN_D= '166534';
const BLUE_L = 'DBEAFE';
const BLUE_D = '1E40AF';

/* ───────── 유틸 헬퍼 ───────── */
function h1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
    run: { color: WHITE, bold: true, size: 32 },
  });
}
function h2(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    border: { bottom: { color: NAVY, size: 6, style: BorderStyle.SINGLE } },
  });
}
function h3(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, color: NAVY })],
    spacing: { before: 200, after: 60 },
  });
}
function body(text: string, indent = 0): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 20 })],
    spacing: { before: 40, after: 40 },
    indent: { left: indent ? convertInchesToTwip(indent) : 0 },
  });
}
function bullet(text: string, level = 0): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 20 })],
    bullet: { level },
    spacing: { before: 40, after: 40 },
  });
}
function tip(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: `💡 ${text}`, size: 19, italics: true, color: '374151' })],
    spacing: { before: 60, after: 60 },
    shading: { type: ShadingType.SOLID, color: BLUE_L, fill: BLUE_L },
    indent: { left: convertInchesToTwip(0.2) },
  });
}
function empty(n = 1): Paragraph[] {
  return Array.from({ length: n }, () => new Paragraph({ text: '' }));
}

function simpleTable(
  headers: string[],
  rows: string[][],
  colWidths?: number[]
): Table {
  const totalWidth = 9000;
  const widths = colWidths ?? headers.map(() => Math.floor(totalWidth / headers.length));

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      new TableCell({
        width: { size: widths[i], type: WidthType.DXA },
        shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
        children: [new Paragraph({
          children: [new TextRun({ text: h, bold: true, color: WHITE, size: 18 })],
          alignment: AlignmentType.CENTER,
        })],
      })
    ),
  });

  const dataRows = rows.map((row, ri) =>
    new TableRow({
      children: row.map((cell, ci) =>
        new TableCell({
          width: { size: widths[ci], type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: ri % 2 === 0 ? WHITE : GRAY_L, fill: ri % 2 === 0 ? WHITE : GRAY_L },
          children: [new Paragraph({
            children: [new TextRun({ text: cell, size: 18 })],
            spacing: { before: 40, after: 40 },
          })],
        })
      ),
    })
  );

  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    rows: [headerRow, ...dataRows],
  });
}

/* ═══════════════════════════════════════════════════════════
   PAGE 1 — 임원 보고용 1페이지 요약
════════════════════════════════════════════════════════════ */
function buildExecutivePage(): Paragraph[] {
  const today = new Date().toISOString().slice(0, 10);

  return [
    /* 제목 블록 */
    new Paragraph({
      children: [
        new TextRun({ text: 'HF 온라인 미디어 모니터링 시스템', bold: true, size: 40, color: WHITE }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '한국주택금융공사 여론 모니터링 · 분석 · 대응 통합 플랫폼', size: 22, color: WHITE }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
    }),
    new Paragraph({
      children: [new TextRun({ text: `보고일: ${today}   |   버전: v1.0   |   보안등급: 내부용`, size: 18, color: 'AAAAAA' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
    }),

    /* 1. 시스템 개요 */
    new Paragraph({
      children: [new TextRun({ text: '① 시스템 개요', bold: true, size: 26, color: WHITE })],
      shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
      spacing: { before: 160, after: 80 },
      indent: { left: convertInchesToTwip(0.1) },
    }),
    body('7개 온라인 채널(뉴스·YouTube·DC인사이드·네이버 블로그·티스토리·블라인드·인스타그램)에서 HF 관련 키워드를 실시간 수집하고, AI 기반 감성 분석 및 트렌드 탐지를 통해 온라인 여론 동향을 종합 관리하는 웹 대시보드입니다.', 0.15),

    /* 2. 주요 기능 (3열 표) */
    new Paragraph({
      children: [new TextRun({ text: '② 주요 기능', bold: true, size: 26, color: WHITE })],
      shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
      spacing: { before: 160, after: 80 },
      indent: { left: convertInchesToTwip(0.1) },
    }),
    simpleTable(
      ['기능 영역', '세부 내용', '효과'],
      [
        ['데이터 수집', '7개 채널 키워드 자동 수집\n최대 11개 키워드 동시 모니터링\n수집 주기: 수동 or 주기적 실행', '수작업 대비\n90% 이상 시간 절감'],
        ['감성 분석', '문서별 감성 점수 (-1.0~+1.0) 자동 산출\n긍정/중립/부정 자동 분류\n정확도 70~75% (AI 연동 시 85%+)', '부정 여론 조기 탐지\n신속 대응 가능'],
        ['이상 탐지', '부정 언급 Z-Score 기반 스파이크 탐지\nZ≥2.0 구간 자동 경보\n임계값 기준 에스컬레이션', '위기 발생\n평균 4시간 이내 감지'],
        ['트렌드 분석', '한국어 키워드 Z-Score 급등 탐지\n시계열 버킷별 빈도 분석\n연관 키워드 자동 추출', '새로운 이슈\n사전 포착 가능'],
        ['AI 대응문', 'GPT-4o-mini 기반 자동 생성\nFAQ · 공지문 · 에스컬레이션 기준\nAPI 없을 시 룰기반 fallback', '대응문 초안\n15분 이내 생성'],
        ['리포팅', 'KPI 카드 4종 (언급량·부정비율·전기대비·스파이크)\n차트 4종 (라인·스택·바·키워드)\n문서 원문 직접 확인', '보고서 작성\n60% 이상 단축'],
      ],
      [2200, 4200, 2600]
    ),

    ...empty(1),

    /* 3. 기술 스택 */
    new Paragraph({
      children: [new TextRun({ text: '③ 기술 구성', bold: true, size: 26, color: WHITE })],
      shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
      spacing: { before: 160, after: 80 },
      indent: { left: convertInchesToTwip(0.1) },
    }),
    simpleTable(
      ['구분', '기술/도구', '비고'],
      [
        ['프론트엔드', 'Next.js 16 + TypeScript + Tailwind CSS', '다크 네이비 테마, 모바일 대응'],
        ['차트/시각화', 'Recharts (라인·스택·바 차트)', '인터랙티브, 반응형'],
        ['데이터 수집', 'RSS Parser · Axios · Cheerio', 'Google News RSS, 웹 크롤러'],
        ['분석 엔진', '한국어 감성사전 + Z-Score 알고리즘', '서버사이드, 실시간 처리'],
        ['AI 요약', 'OpenAI GPT-4o-mini API', 'API 키 없을 시 룰기반 fallback'],
        ['캐시/저장', 'File-based JSON Cache (data/)', '향후 SQLite/DB 전환 가능'],
        ['배포 환경', 'Node.js 서버 / Vercel / Docker 가능', 'PM2 데몬 운영 권장'],
      ],
      [1800, 3800, 3400]
    ),

    ...empty(1),

    /* 4. 활용 방안 */
    new Paragraph({
      children: [new TextRun({ text: '④ 활용 방안 및 기대 효과', bold: true, size: 26, color: WHITE })],
      shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
      spacing: { before: 160, after: 80 },
      indent: { left: convertInchesToTwip(0.1) },
    }),
    simpleTable(
      ['활용 시나리오', '기대 효과', '담당 부서'],
      [
        ['일일 온라인 여론 모니터링 (매일 09:00)', '이슈 조기 발견, 일일 보고 자동화', '홍보·고객서비스팀'],
        ['보금자리론·주택연금 등 상품별 반응 측정', '고객 불만/요구사항 실시간 파악', '상품기획팀'],
        ['전세사기·규제 이슈 위기 대응', '대응문 15분 이내 초안 생성', 'PR·법무팀'],
        ['월간/분기 온라인 여론 동향 보고', '보고서 작성 시간 60% 절감', '경영기획팀'],
        ['신상품 런칭 전후 반응 비교 분석', '런칭 효과 정량 측정', '마케팅팀'],
        ['국회/언론 부정 이슈 에스컬레이션 관리', '임계값 초과 시 자동 알림 체계', '경영진·홍보팀'],
      ],
      [3200, 3200, 2600]
    ),

    ...empty(1),

    /* 5. 운영 고려사항 */
    new Paragraph({
      children: [new TextRun({ text: '⑤ 운영 시 고려사항', bold: true, size: 26, color: WHITE })],
      shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
      spacing: { before: 160, after: 80 },
      indent: { left: convertInchesToTwip(0.1) },
    }),
    simpleTable(
      ['항목', '내용', '우선순위'],
      [
        ['API 키 확보', 'OpenAI API 키: 정밀 감성분석·AI대응문\nYouTube API 키: 영상 데이터 수집', '높음'],
        ['감성 사전 관리', 'HF 특화 긍정/부정 단어 추가 (config/)', '중간'],
        ['모니터링 주기', '일 1회 이상 수동 실행 권장 (자동화 추후 구현)', '중간'],
        ['데이터 보안', '수집 데이터 내부망 저장, 외부 공개 금지', '높음'],
        ['법적 검토', '크롤러 이용 시 각 사이트 이용약관 준수', '높음'],
        ['고도화 계획', 'SQLite DB, 자동 스케줄러, 알림 연동 (Slack/Email)', '낮음 (차기)'],
      ],
      [2000, 4800, 2200]
    ),

    ...empty(1),

    /* 하단 서명 */
    new Paragraph({
      children: [
        new TextRun({ text: `작성: HF 디지털혁신팀  |  기준일: ${today}  |  기밀: 내부용`, size: 16, color: '6B7280' }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      border: { top: { color: NAVY, size: 6, style: BorderStyle.SINGLE } },
    }),

    /* 페이지 나누기 */
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

/* ═══════════════════════════════════════════════════════════
   PAGE 2+ — 전체 활용 매뉴얼
════════════════════════════════════════════════════════════ */
function buildManualPages(): Paragraph[] {
  const items: Paragraph[] = [];

  /* 표지 */
  items.push(
    new Paragraph({
      children: [new TextRun({ text: 'HF 미디어 모니터링 대시보드', bold: true, size: 52, color: WHITE })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 80 },
      shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
    }),
    new Paragraph({
      children: [new TextRun({ text: '완전 활용 매뉴얼', bold: true, size: 36, color: 'B0C4DE' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
    }),
    new Paragraph({
      children: [new TextRun({ text: `v1.0  |  ${new Date().toISOString().slice(0,10)}`, size: 20, color: 'AAAAAA' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 300 },
    }),
  );

  /* ─ 1. 시스템 전체 구조 ─ */
  items.push(h1('1. 시스템 전체 구조'));
  items.push(body('이 대시보드는 단순한 게시물 수집기가 아닙니다. 수집 후 5단계 분석이 자동으로 이루어집니다.'));
  items.push(...empty(1));
  items.push(simpleTable(
    ['단계', '처리 내용', '결과물'],
    [
      ['① 데이터 수집', '7개 채널 키워드 검색·수집\n뉴스RSS / YouTube API / 웹 크롤러', '정규화된 RawDocument JSON'],
      ['② 감성 분석', '긍정(65개)·부정(68개) 단어사전 매칭\n부정 표현(않/못/불/비/무) 처리\n감성 점수 -1.0 ~ +1.0 산출', '문서별 sentiment + score'],
      ['③ 시계열 집계', '일/주/월/분기/연 버킷 생성\n채널별·키워드별 언급량 집계', 'MentionDataPoint 배열'],
      ['④ 이상 탐지', '부정 건수 Z-Score 계산\nZ ≥ 2.0 구간 → 스파이크 판정', 'NegativeSpike 목록'],
      ['⑤ 트렌드 탐지', '한국어 키워드 추출 (2글자+, 불용어 제거)\n구간별 빈도 Z-Score 계산\nZ ≥ 2.0 → 🔥 트렌딩', 'TrendKeyword 배열'],
    ],
    [800, 4200, 4000]
  ));
  items.push(...empty(1));
  items.push(tip('"수집/갱신" 버튼 1번으로 수집 + 5단계 분석이 모두 자동 실행됩니다.'));

  /* ─ 2. 화면 구성 ─ */
  items.push(h1('2. 화면 구성'));
  items.push(body('좌측 사이드바(조건 설정) + 우측 메인 영역(KPI 카드 + 4개 탭)으로 구성됩니다.'));
  items.push(...empty(1));
  items.push(simpleTable(
    ['영역', '내용'],
    [
      ['좌측 사이드바', '① 분석 기간 설정 (시작일/종료일)\n② 집계 주기 선택 (일/주/월/분기/연)\n③ 키워드 선택 (11개)\n④ 채널 선택 (7개)\n⑤ DC 갤러리 선택\n⑥ 액션 버튼 (수집/갱신, 데모, AI요약)'],
      ['KPI 카드 (항상 표시)', '총 언급량 / 부정 비율 / 전기 대비 / 부정 스파이크'],
      ['📊 개요 탭', '언급량 라인 차트 + 감성 스택 차트 + 채널별·키워드별 바 차트'],
      ['🔥 트렌드 탭', 'Z-Score 트렌딩 키워드 + 채널별 감성 비교'],
      ['📄 문서 탭', '원문 검색·필터링 + 감성 점수 + 원문 링크'],
      ['🤖 AI 대응 탭', '전체 요약 + 핵심 이슈 + FAQ + 공지문 + 에스컬레이션 기준'],
    ],
    [2200, 6800]
  ));

  /* ─ 3. 조건 설정 ─ */
  items.push(h1('3. STEP 1 — 조건 설정'));
  items.push(h2('기간 설정'));
  items.push(simpleTable(
    ['집계 주기', '권장 기간', '주요 활용'],
    [
      ['일별', '7일 ~ 30일', '이슈 발생 직후 세부 추이 확인'],
      ['주별', '1개월 ~ 3개월', '주간 보고서 작성'],
      ['월별', '3개월 ~ 1년', '월간 리포트, 캠페인 효과'],
      ['분기별', '1년 ~ 2년', '분기 보고, 중기 트렌드'],
      ['연별', '2년 이상', '연간 정책 효과 측정'],
    ],
    [1800, 2600, 4600]
  ));
  items.push(...empty(1));
  items.push(h2('키워드 선택 (11개 기본 제공)'));
  items.push(simpleTable(
    ['분류', '키워드'],
    [
      ['브랜드', '한국주택금융공사 / HF / 주금공'],
      ['주요 상품', '보금자리론 / 주택연금 / 전세자금보증 / MBS'],
      ['기타 상품', '커버드본드 / 커버드본드 지급보증 / 건설자금보증 / 전세지킴보증'],
    ],
    [2000, 7000]
  ));
  items.push(...empty(1));
  items.push(h2('채널 선택 (7개)'));
  items.push(simpleTable(
    ['채널', '수집 방식', '특성'],
    [
      ['📰 뉴스', 'Google News RSS', '언론사 보도, 신뢰도 높음'],
      ['▶ YouTube', 'YouTube Data API v3', '영상 제목+설명, 조회수 포함'],
      ['💬 DC인사이드', '웹 크롤러', '부동산/금융/대출/정책 갤러리, 커뮤니티 반응'],
      ['📝 네이버 블로그', 'Naver API + 크롤러', '개인 경험담, 이용 후기'],
      ['🍊 티스토리', 'Kakao API + 크롤러', '전문 블로그, 금융 분석글'],
      ['🙈 블라인드', '웹 크롤러', '직장인 익명 의견, 업계 내부 분위기'],
      ['📸 인스타그램', 'RSS + 크롤러', 'SNS 여론, MZ세대 반응'],
    ],
    [1600, 2400, 5000]
  ));

  /* ─ 4. KPI 카드 ─ */
  items.push(h1('4. STEP 3 — KPI 카드 해석'));
  items.push(simpleTable(
    ['카드', '내용', '경고 수준'],
    [
      ['📊 총 언급량', '선택 기간·채널·키워드 조건의 전체 문서 수', '기준값 대비 급등 확인'],
      ['💭 부정 비율', '전체 중 부정 감성 분류 비율', '25%↑ 주의 / 40%↑ 경고'],
      ['📈 전기 대비', '최근 버킷 vs 직전 버킷 언급량 차이', '+N = 전기보다 N건 증가'],
      ['🚨 스파이크', '부정 언급 Z-Score ≥ 2.0 구간 감지', '"감지됨" → 즉시 AI 대응'],
    ],
    [2000, 4400, 2600]
  ));

  /* ─ 5. 탭별 기능 ─ */
  items.push(h1('5. 탭별 분석 기능 상세'));
  items.push(h2('📊 개요 탭'));
  items.push(simpleTable(
    ['차트/패널', '내용', '활용법'],
    [
      ['언급량 추이\n(라인 차트)', 'X축: 집계 주기 버킷\nY축: 문서 수\n채널별 색상 구분\n🔴 빨간 점선: 스파이크 구간', '급등 날짜 확인 →\n문서 탭에서 원인 파악'],
      ['감성 분포\n(스택 차트)', '긍정(초록) / 중립(회색) / 부정(빨강)\n영역 비율로 감성 추이 시각화', '부정 영역 확대 =\n여론 악화 신호'],
      ['채널별 언급량\n(바 차트)', '채널별 언급량 가로 바 비교', '모니터링 채널 우선순위 결정'],
      ['키워드별 언급량\n(바 그래프)', '선택 키워드 중 상품별 언급량 비교', '현재 가장 뜨거운 이슈 파악'],
      ['스파이크 상세\n패널', 'Z-Score ≥ 2.0 구간의\n날짜/부정건수/비율/Z값', '스파이크 감지 시 자동 표시'],
    ],
    [2000, 3600, 3400]
  ));
  items.push(...empty(1));
  items.push(h2('🔥 트렌드 탭'));
  items.push(simpleTable(
    ['배지', 'Z-Score', '의미', '권장 행동'],
    [
      ['🔴 빨강', 'Z ≥ 3.0', '매우 강한 급등', '즉시 원인 파악 + 대응'],
      ['🟠 주황', '2.0 ≤ Z < 3.0', '트렌딩', '모니터링 강화'],
      ['🟡 노랑', '1.0 ≤ Z < 2.0', '상승 중', '관찰 필요'],
      ['⬜ 회색', 'Z < 1.0', '일반 수준', '정상 모니터링'],
    ],
    [1800, 1800, 2600, 2800]
  ));
  items.push(...empty(1));
  items.push(h2('🤖 AI 대응 탭'));
  items.push(simpleTable(
    ['생성 항목', '내용', '실무 활용'],
    [
      ['📋 전체 요약', '분석 기간 핵심 내용 3~5문장', '보고서 첫 문단'],
      ['🔍 핵심 이슈', '주요 이슈 3~7개 목록', '이슈 트래킹'],
      ['✅ 사실확인\n체크리스트', '대응 전 확인 항목 3~5개', '언론 대응 준비'],
      ['❓ FAQ 초안', '자주 묻는 Q&A 5~7개', '홈페이지/고객센터'],
      ['📢 공지문', '단문(100자) + 장문(300자)', 'SNS/홈페이지 공지'],
      ['🔎 추가 키워드', '연관 모니터링 키워드 추천', '다음 수집에 추가'],
      ['🚨 에스컬레이션', '보고/대응 레벨 임계치', '위기 대응 기준'],
    ],
    [2200, 3600, 3200]
  ));

  /* ─ 6. 분석 엔진 ─ */
  items.push(h1('6. 분석 엔진 동작 원리'));
  items.push(h2('감성 분석 알고리즘'));
  items.push(body('긍정 단어 65개 + 부정 단어 68개 사전 매칭 방식 (한국어 특화)'));
  items.push(simpleTable(
    ['분류', '판단 기준', '예시 단어'],
    [
      ['긍정', 'rawScore > +0.2', '지원확대, 금리인하, 성공, 혜택, 만족, 안전, 신뢰'],
      ['부정', 'rawScore < -0.2', '논란, 사기, 규제강화, 부실, 우려, 불만, 손실'],
      ['중립', '-0.2 ≤ rawScore ≤ +0.2', '발표, 검토, 시행, 조정, 예정 등 중립 표현'],
    ],
    [1400, 2400, 5200]
  ));
  items.push(...empty(1));
  items.push(h2('Z-Score 이상 탐지 공식'));
  items.push(body('Z = (현재 구간 값 - 전체 구간 평균) / 표준편차'));
  items.push(body('Z ≥ 2.0 → 통계적으로 유의미한 급등 → 스파이크 / 트렌딩 판정'));
  items.push(tip('Z-Score는 부정 스파이크 탐지와 트렌드 키워드 탐지에 모두 적용됩니다.'));

  /* ─ 7. API 키 설정 ─ */
  items.push(h1('7. API 키별 기능 차이'));
  items.push(simpleTable(
    ['기능', 'API 키 없음', 'API 키 있음'],
    [
      ['뉴스 수집', '✅ Google RSS 정상', '✅ 동일'],
      ['YouTube 수집', '❌ 건너뜀', '✅ 실제 영상 수집'],
      ['DC인사이드', '✅ 크롤러 정상', '✅ 동일'],
      ['네이버 블로그', '✅ 크롤러 fallback', '✅ Naver API (더 많은 결과)'],
      ['티스토리', '✅ 크롤러 fallback', '✅ Kakao API (더 정확)'],
      ['블라인드', '✅ 크롤러 정상', '✅ 동일'],
      ['인스타그램', '✅ RSS+크롤러 (제한적)', '✅ Graph API'],
      ['AI 요약·대응문', '✅ 룰 기반 자동 생성', '✅ GPT-4o-mini (더 정교)'],
      ['감성 분석', '✅ 한국어 사전 기반', '✅ 동일'],
      ['트렌드 Z-Score', '✅ 통계 알고리즘', '✅ 동일'],
    ],
    [2800, 3200, 3000]
  ));
  items.push(...empty(1));
  items.push(h2('API 키 설정 방법'));
  items.push(body('프로젝트 루트 .env.local 파일에 아래 내용을 추가합니다.'));
  items.push(new Paragraph({
    children: [new TextRun({ text: 'YOUTUBE_API_KEY=AIza...        # YouTube Data API v3', font: 'Courier New', size: 18 })],
    shading: { type: ShadingType.SOLID, color: GRAY_L, fill: GRAY_L },
    indent: { left: convertInchesToTwip(0.2) },
  }));
  items.push(new Paragraph({
    children: [new TextRun({ text: 'OPENAI_API_KEY=sk-...          # OpenAI GPT-4o-mini', font: 'Courier New', size: 18 })],
    shading: { type: ShadingType.SOLID, color: GRAY_L, fill: GRAY_L },
    indent: { left: convertInchesToTwip(0.2) },
  }));
  items.push(new Paragraph({
    children: [new TextRun({ text: 'NAVER_CLIENT_ID=...            # 네이버 검색 API (선택)', font: 'Courier New', size: 18 })],
    shading: { type: ShadingType.SOLID, color: GRAY_L, fill: GRAY_L },
    indent: { left: convertInchesToTwip(0.2) },
  }));
  items.push(new Paragraph({
    children: [new TextRun({ text: 'NAVER_CLIENT_SECRET=...', font: 'Courier New', size: 18 })],
    shading: { type: ShadingType.SOLID, color: GRAY_L, fill: GRAY_L },
    indent: { left: convertInchesToTwip(0.2) },
  }));
  items.push(new Paragraph({
    children: [new TextRun({ text: 'KAKAO_REST_API_KEY=...         # 카카오 REST API (선택)', font: 'Courier New', size: 18 })],
    shading: { type: ShadingType.SOLID, color: GRAY_L, fill: GRAY_L },
    indent: { left: convertInchesToTwip(0.2) },
  }));

  /* ─ 8. 실무 시나리오 ─ */
  items.push(h1('8. 실무 활용 시나리오'));
  items.push(simpleTable(
    ['시나리오', '설정 방법', '결과물'],
    [
      ['A. 일일 모니터링\n(매일 09:00)', '기간: 어제 하루\n집계: 일별\n채널: 전체 또는 뉴스+DC+블라인드', '일일 모니터링 보고서\n(5분 내 작성)'],
      ['B. 특정 이슈\n심층 분석', '키워드: 해당 상품명 단독\n기간: 이슈 전후 2주\n집계: 일별', '이슈 원인 분석 보고서\n+ 대응 FAQ + 공지문'],
      ['C. 월간 여론\n리포트', '기간: 해당 월 전체\n집계: 주별\n키워드: 전체 선택', '월간 온라인 여론\n동향 보고서'],
      ['D. 신상품 반응\n측정', '키워드: 해당 상품명\n기간: 런칭 전후 각 1개월\n집계: 주별', '런칭 효과\n정량 분석 보고서'],
      ['E. 위기 대응\n(긴급)', '스파이크 감지 즉시\n부정 필터 → 원문 확인\nAI 대응 탭 클릭', '위기 대응 완료\n(수집~대응문 15분 이내)'],
    ],
    [2000, 3600, 3400]
  ));

  /* ─ 9. FAQ ─ */
  items.push(h1('9. 자주 묻는 질문 (FAQ)'));
  const faqs = [
    ['수집/갱신 후 분석이 자동으로 되나요?', '네. 수집 완료 후 ① 감성 분석, ② 시계열 집계, ③ 부정 스파이크 탐지, ④ 트렌드 키워드 Z-Score 계산이 모두 자동 실행됩니다. AI 대응문만 별도 버튼이 필요합니다.'],
    ['수집에 얼마나 걸리나요?', '2~3개 채널, 3~5개 키워드 → 약 20~40초\n7개 채널 전체, 11개 키워드 전체 → 약 1~2분\n같은 조건 재요청 시(캐시) → 즉시 반환 (약 1초)'],
    ['감성 분석이 틀린 것 같아요.', '현재 룰 기반 분석으로 약 70~75% 정확도이며, 아이러니·비꼬기 표현은 오분류될 수 있습니다. OpenAI API 키 연결 시 GPT-4o-mini의 문맥 기반 분석으로 정확도가 향상됩니다.'],
    ['DC인사이드/블라인드 수집이 실패해요.', '사이트 구조 변경 또는 일시적 접근 차단으로 실패할 수 있습니다. 해당 채널 체크 해제 후 나머지 채널로 진행하거나, 잠시 후 재시도하세요.'],
    ['트렌드 키워드에 의미없는 단어가 나와요.', 'config/stopwords.json 파일의 "ko" 배열에 불용어를 추가하면 다음 수집부터 필터링됩니다.'],
    ['분석 결과를 저장하려면?', '분석 결과는 data/analytics/ 폴더에 JSON으로 자동 저장됩니다. AI 대응 탭의 복사 버튼을 활용해 텍스트를 내보낼 수 있습니다.'],
    ['키워드를 추가하고 싶어요.', 'config/keywords.json 파일의 "all" 배열에 키워드를 추가하면 다음 실행 시 UI에 반영됩니다.'],
  ];
  for (const [q, a] of faqs) {
    items.push(h3(`Q. ${q}`));
    items.push(body(`A. ${a}`, 0.15));
    items.push(...empty(1));
  }

  return items;
}

/* ═══════════════════════════════════════════════════════════
   ROUTE HANDLER
════════════════════════════════════════════════════════════ */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'full'; // 'full' | 'executive'

    const execPages = buildExecutivePage();
    const manualPages = type === 'executive' ? [] : buildManualPages();

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: '맑은 고딕', size: 20, color: '111827' },
          },
          heading1: {
            run: { font: '맑은 고딕', bold: true, size: 28, color: WHITE },
            paragraph: {
              spacing: { before: 320, after: 120 },
              shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
            },
          },
          heading2: {
            run: { font: '맑은 고딕', bold: true, size: 24, color: NAVY },
            paragraph: { spacing: { before: 240, after: 80 } },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(0.8),
                bottom: convertInchesToTwip(0.8),
                left: convertInchesToTwip(0.9),
                right: convertInchesToTwip(0.9),
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'HF 온라인 미디어 모니터링 시스템', size: 16, color: '6B7280' }),
                    new TextRun({ text: '\t\t', size: 16 }),
                    new TextRun({ text: '내부용', size: 16, color: 'B91C1C', bold: true }),
                  ],
                  border: { bottom: { color: NAVY, size: 4, style: BorderStyle.SINGLE } },
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'ⓒ 한국주택금융공사 HF  |  ' }),
                    new TextRun({ children: [PageNumber.CURRENT] }),
                    new TextRun({ text: ' / ' }),
                    new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
                    new TextRun({ text: ' 페이지' }),
                  ],
                  alignment: AlignmentType.CENTER,
                  border: { top: { color: GRAY_M, size: 4, style: BorderStyle.SINGLE } },
                }),
              ],
            }),
          },
          children: [...execPages, ...manualPages],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const today = new Date().toISOString().slice(0, 10);
    const filename = type === 'executive'
      ? `HF_미디어모니터링_임원보고_${today}.docx`
      : `HF_미디어모니터링_활용매뉴얼_${today}.docx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('DOCX generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'DOCX generation failed' },
      { status: 500 }
    );
  }
}
