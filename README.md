# HF 미디어 모니터링 대시보드

한국주택금융공사(HF) 및 주요 상품 관련 키워드를 **뉴스·YouTube·DC인사이드**에서 수집·분석하는 인터랙티브 대시보드입니다.

## 주요 기능

| 기능 | 설명 |
|------|------|
| 📡 데이터 수집 | Google News RSS / YouTube Data API v3 / DCInside 갤러리 크롤러 |
| 📊 언급량 분석 | 일/주/월/분기/연 기준 시계열 집계 |
| 💭 감성 분석 | 긍·중·부정 분류 + z-score 스파이크 감지 |
| 🔥 트렌드 키워드 | z-score ≥ 2 자동 표시 |
| 🤖 AI 대응 | GPT-4o-mini 요약 + 부정 이슈 대응문 자동 생성 (룰 기반 fallback 포함) |
| 🎭 데모 모드 | API 키 없이도 UI 전체 동작 |

## 빠른 시작

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정 (선택)
```bash
cp .env.local.example .env.local
# .env.local 파일 편집
```

| 변수명 | 설명 | 필수 여부 |
|--------|------|-----------|
| `YOUTUBE_API_KEY` | YouTube Data API v3 키 | 선택 (없으면 YouTube 수집 건너뜀) |
| `OPENAI_API_KEY` | OpenAI API 키 | 선택 (없으면 룰 기반 대체) |

### 3. 개발 서버 실행
```bash
npm run dev
```
브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

### 4. API 키 없이 바로 확인
대시보드에서 **"🎭 데모 데이터로 보기"** 버튼 클릭

---

## 프로젝트 구조

```
/config
  keywords.json        # 모니터링 키워드 목록
  dc_galleries.json    # DCInside 갤러리 설정
  stopwords.json       # 한국어 불용어 목록

/lib
  /collectors
    newsRss.ts         # Google News RSS 수집
    youtube.ts         # YouTube Data API 수집
    dc.ts              # DCInside 갤러리 크롤러
  /analytics
    aggregate.ts       # 시계열 집계
    sentiment.ts       # 감성 분석 (룰 기반)
    trends.ts          # 트렌드 키워드 추출
    zscore.ts          # Z-score 계산
  /ai
    openaiSummarize.ts # OpenAI 연동 + 룰 기반 fallback
    prompts.ts         # 프롬프트 템플릿
  /demo
    demoData.ts        # 데모 데이터 생성기
  cache.ts             # 파일 기반 JSON 캐시

/app
  page.tsx             # 메인 대시보드
  /api
    /collect           # 데이터 수집 API
    /ai-summary        # AI 요약 API
    /demo              # 데모 데이터 API
    /config            # 설정/상태 API
  /components
    /charts            # Recharts 차트 컴포넌트
    /panels            # UI 패널 컴포넌트
    /ui                # 공통 UI 컴포넌트

/data                  # 캐시 저장소 (자동 생성)
  /raw/{channel}/      # 원본 수집 데이터
  /analytics/          # 집계 결과 캐시
```

## 설정 파일 커스터마이즈

### 키워드 추가/수정
`config/keywords.json` 편집

### DC 갤러리 추가
`config/dc_galleries.json`에 갤러리 ID 추가:
```json
{
  "id": "my_gallery",
  "name": "갤러리 이름",
  "gallery_id": "dc_gallery_id",
  "url": "https://gall.dcinside.com/board/lists/?id=...",
  "enabled": true
}
```

## 기술 스택

- **Frontend**: Next.js 16 (App Router) + TypeScript + TailwindCSS v4
- **Charts**: Recharts
- **AI**: OpenAI GPT-4o-mini (fallback: 룰 기반)
- **수집**: RSS-Parser + Axios + Cheerio
- **캐시**: 파일 기반 JSON (data/ 디렉토리)
- **상태관리**: Zustand

## 주의사항

- DCInside 크롤링은 사이트 정책 변경 시 실패할 수 있으며, 이 경우 자동으로 데모 데이터로 대체됩니다.
- 과도한 크롤링 방지를 위해 요청 간 딜레이(1.5초)와 최대 수집량 제한이 적용됩니다.
- YouTube API 할당량(기본 10,000 units/일)에 주의하세요.
