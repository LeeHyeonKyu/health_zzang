---
status: complete
areasExplored:
  stack: { depth: 2, decisions: 4 }
  architecture: { depth: 1, decisions: 2 }
  data: { depth: 2, decisions: 4 }
  interfaces: { depth: 2, decisions: 3 }
  testing: { depth: 1, decisions: 2 }
  constraints: { depth: 1, decisions: 3 }
assumptions:
  - "Supabase 무료 티어(500MB DB, 무제한 API)가 20명 크루에 충분하다"
  - "Cloudflare R2 10GB가 시즌 미디어 정리 정책과 함께 충분하다"
  - "Supabase Auth refresh token 자동 갱신이 재로그인 금지 원칙을 충족한다"
  - "영상 720p 재인코딩이 클라이언트 사이드에서 가능하다 — 불가 시 서버 사이드 또는 용량 제한으로 대체"
riskiestDecision: "Cloudflare R2 10GB 한도 — 첫 시즌 운영 후 사용량 측정으로 검증"
generatedBy: know-thy-build
version: 1.0.0
date: 2026-10-06
---

# Health Zzang — Technical Foundation

<!-- Next.js + Supabase + Cloudflare R2 기반 모놀리스 웹 서비스 -->

## Tech Stack

| Category | Choice | Why |
|----------|--------|-----|
| Language | TypeScript | 프론트/백 통합, 타입 안전성 |
| Framework | Next.js 16 (App Router) | Vercel 무료 배포, SSR/API Routes 통합, React 19 |
| CSS | Tailwind CSS 4 | 유틸리티 기반, 빠른 UI 개발, 모바일 반응형 용이 |
| DB | Supabase (PostgreSQL) | DB + Auth 통합, 무료 500MB, RLS 지원 |
| Auth | Supabase Auth | ID/PW 인증, refresh token 자동 갱신, 재로그인 방지 |
| 미디어 스토리지 | Cloudflare R2 | 10GB 무료, egress 무료, S3 호환 API |
| 테스트 | vitest | Vite 기반 빠른 실행, TypeScript 네이티브 |
| 린트 | ESLint 9 | Next.js 공식 지원 |
| 배포 | Vercel | GitHub 연동 자동 배포, 무료 티어 |

**Key Dependencies:**
- `@supabase/supabase-js` — Supabase 클라이언트 (DB + Auth + Storage)
- `@aws-sdk/client-s3` — R2 업로드 (S3 호환 API)

**Dev Tools:**
- vitest — 단위/통합 테스트
- ESLint + eslint-config-next — 린트

**Weakest Link:** Cloudflare R2 10GB 한도. 영상 업로드가 많아지면 가장 먼저 압박받는 곳. 시즌 종료 미디어 정리 정책으로 대응하되, 영상 비활성화가 최후 수단.

## Architecture

**패턴:** Next.js App Router 기반 모놀리스. 프론트엔드(React)와 백엔드(API Routes)를 하나의 앱에서 처리.

**Component Responsibility Map:**

| Component | Responsibility | NOT Responsible For | Depends On |
|-----------|---------------|---------------------|------------|
| Auth | 로그인/회원가입, 세션 유지 | 권한 분리 (없음 — 모든 크루원 동등) | Supabase Auth |
| Workout | 운동 인증 CRUD (날짜, 사진 연결) | 파일 업로드 자체 | Supabase DB |
| Season | 시즌 생성/종료, default 규칙 설정 | 벌금 계산 | Supabase DB |
| Penalty | 벌금 실시간 계산 (DB 뷰) | 벌금 기록 저장 (별도 테이블 없음) | Workout + Season |
| Media | 사진/영상 업로드, presigned URL 생성, 정리 | 이미지 리사이징 (원본 유지) | Cloudflare R2 |

**Data Flow — 운동 인증 등록:**
1. 크루원이 `/workout/new`에서 날짜 선택 + 사진 첨부
2. 클라이언트 → API Route: presigned URL 요청
3. API Route → R2: presigned URL 생성, 반환
4. 클라이언트 → R2: 사진 직접 업로드 (서버 경유 없음)
5. 클라이언트 → API Route: workout 기록 저장 (날짜, r2_key)
6. API Route → Supabase DB: INSERT
7. 대시보드에서 실시간 집계 반영

## Data

**Storage:** Supabase PostgreSQL (무료 500MB) — 텍스트 데이터 전용. 미디어는 R2.

**Key Entities:**

```
User ──┬── 1:N ──→ Workout
       │                └── 1:N ──→ Media
       └── N:1 ──→ Crew

Crew ──── 1:N ──→ Season
Season ──── 1:N ──→ WeeklyRule (override가 필요한 주만)
```

| 엔티티 | 주요 필드 | 비고 |
|--------|----------|------|
| User | id, email, nickname, crew_id | Supabase Auth 연동, role 없음 (동등) |
| Crew | id, name | 현재 1개 |
| Season | id, crew_id, name, start_date, end_date, is_active, default_target_count, default_penalty_per_miss | default 규칙 포함 |
| WeeklyRule | id, season_id, week_start, target_count, penalty_per_miss | override 시에만 생성 |
| Workout | id, user_id, season_id, date, created_at | 인증 1건 |
| Media | id, workout_id, r2_key, type(photo/video), size_bytes | R2 파일 참조 |

**Penalty (벌금):** 별도 테이블 없음. DB 뷰 또는 쿼리로 실시간 계산:
- 해당 주의 규칙(WeeklyRule override 또는 Season default) 가져오기
- 사용자별 해당 주 Workout 수 카운트
- `missed_count = max(0, target_count - workout_count)`
- `penalty = missed_count × penalty_per_miss`

**Data Lifecycle:**
- Workout/Media: 시즌 동안 생성, 시즌 종료 후 아카이브
- Media 파일(R2): 시즌 종료 후 일정 기간 유지 → 스토리지 80% 도달 시 오래된 시즌 미디어 정리
- Season/WeeklyRule: 영구 보존 (텍스트 데이터, 용량 미미)

## Interfaces

### 페이지 구조

| 경로 | 화면 | 접근 |
|------|------|------|
| `/login` | 로그인/회원가입 | 비인증 |
| `/` | 주간 현황 대시보드 (크루원별 인증 횟수, 벌금) | 인증 필수 |
| `/workout/new` | 운동 인증 등록 (날짜 선택 + 사진/영상 업로드) | 인증 필수 |
| `/history` | 내 인증 히스토리 (사진 포함) | 인증 필수 |
| `/members/:id` | 크루원 기록 열람 (사진/영상 포함) | 인증 필수 |
| `/season` | 시즌 현황 + 누적 벌금 + 주별 벌금 이벤트 | 인증 필수 |
| `/settings` | 규칙 수정, 시즌 생성/종료 | 인증 필수 (누구나) |

### 인증

Supabase Auth (email/password). Refresh token 자동 갱신으로 재로그인 없음.
- Access token: 1시간 (자동 갱신)
- Refresh token: 장기 유효
- 브라우저 쿠키/로컬스토리지 삭제 시에만 재로그인 (불가피)

### 미디어 업로드

Presigned URL 패턴:
1. 클라이언트 → `/api/media/upload-url` (POST) → presigned URL 반환
2. 클라이언트 → R2 presigned URL (PUT) → 직접 업로드
3. 서버를 경유하지 않아 Vercel 함수 실행 시간/크기 제한 회피

**영상 제한:** 1분 이내, 720p 최적화, 최대 10MB

### Error Format

```json
{ "error": { "code": "WORKOUT_DATE_CONFLICT", "message": "해당 날짜에 이미 인증이 존재합니다" } }
```

## Testing Strategy

| 레벨 | 범위 | 도구 | 이유 |
|------|------|------|------|
| Unit | 벌금 계산 로직, 규칙 적용 로직 | vitest | 핵심 비즈니스 로직 검증 |
| Integration | API Routes + Supabase 연동 | vitest | 데이터 흐름 검증 |
| E2E | 추후 (MVP에선 생략) | — | 규모 대비 비용 과다 |

**커버리지 원칙:** 비즈니스 로직(벌금 계산, 주간 규칙 적용, 시즌 경계 처리)은 반드시 테스트. UI 컴포넌트, 프레임워크 glue code, Supabase SDK 호출 자체는 테스트하지 않음.

**테스트하지 않는 것:** React 컴포넌트 렌더링, Next.js 라우팅, Supabase 클라이언트 초기화, Tailwind 스타일링.

## Constraints

**Performance:** 20명 이내 크루, 동시 접속 최대 5명. 성능 최적화 불필요. Vercel Edge + Supabase로 충분.

**Security:**
- Supabase RLS(Row Level Security)로 크루 외 접근 차단
- R2 presigned URL로 직접 업로드 (서버에 파일이 닿지 않음)
- 민감 데이터 없음 (운동 사진 수준)

**Deployment:** Vercel 무료 티어. GitHub `main` push → 자동 배포. 환경변수로 Supabase/R2 키 관리.

**Platforms:** 모바일 브라우저 최우선 (Chrome, Safari). 데스크탑도 지원. Tailwind responsive 기본.

## Key Decisions

### TDR: 데이터베이스 + 스토리지 분리

**Context:** 인프라 비용 0 원칙 하에서 DB, 인증, 파일 스토리지를 모두 무료로 해결해야 함.

| Option | Pros | Cons |
|--------|------|------|
| Supabase all-in-one | 서비스 1개, 관리 간편 | Storage 1GB 부족 (원본 사진 유지 불가) |
| Supabase (DB+Auth) + Cloudflare R2 | 각각 무료 티어 활용, 사진 원본 유지 | 서비스 2개 관리 |
| PlanetScale + 자체 인증 + R2 | 서비스 3개 | 인증 직접 구현 부담, 복잡도 증가 |

**Decision:** Supabase (DB+Auth) + Cloudflare R2
**Why:** Supabase Auth의 refresh token으로 "재로그인 금지" 원칙 대응 + R2의 10GB/무료 egress로 사진 원본 유지. 서비스 2개지만 역할이 명확히 분리됨.
**Consequences:** presigned URL 패턴 구현 필요. R2 SDK 의존성 추가.
**Validation:** 첫 시즌 운영 후 스토리지 사용량 측정.

### TDR: 모놀리스 아키텍처

**Context:** 프론트엔드와 백엔드를 어떻게 구성할 것인가.

| Option | Pros | Cons |
|--------|------|------|
| Next.js 모놀리스 | 배포 1개, 코드 공유, Vercel 최적화 | 스케일링 한계 (해당 없음) |
| 프론트 + 별도 API 서버 | 독립 스케일링 | 서비스 2개 배포/관리, 비용 증가 가능 |

**Decision:** Next.js App Router 모놀리스
**Why:** 크루 20명 이내, 사이드 프로젝트 — 분리할 이유 없음. Vercel 1곳에 배포하면 인프라 비용 0 유지.
**Consequences:** 백엔드 로직이 커지면 API Route가 복잡해질 수 있지만, 이 규모에서는 해당 없음.
**Validation:** 기능 구현 중 API Route 복잡도 모니터링.

### TDR: 역할 구분 없는 동등 권한

**Context:** 크루장/크루원 역할을 시스템에서 구분할 것인가.

| Option | Pros | Cons |
|--------|------|------|
| RBAC (admin/member) | 실수 방지, 권한 통제 | 구현 복잡도 증가, 누가 admin인지 관리 필요 |
| 동등 권한 | 심플, role 필드/체크 불필요 | 누구나 규칙 변경/시즌 종료 가능 |

**Decision:** 동등 권한 (역할 구분 없음)
**Why:** 크루는 자발적으로 운영. 12~20명의 신뢰 기반 그룹에서 권한 체크는 불필요한 마찰. RBAC 구현 비용을 아예 제거.
**Consequences:** 의도치 않은 규칙 변경이 가능하지만, 크루 내 신뢰로 해결.
**Validation:** 첫 시즌 운영 중 문제 발생 여부 확인.

## Risk Register

**Riskiest Decision:** Cloudflare R2 10GB 한도
- **Why risky:** 10GB 초과 시 비용 발생 → "인프라 비용 0 = 프로젝트 실패" 원칙 위반
- **Validate by:** 첫 시즌 운영 후 실제 사용량 측정
- **Fallback:** 1) 시즌 종료 미디어 정리 주기 단축 2) 영상 업로드 비활성화 3) 사진 해상도 제한

## Assumptions

- Supabase 무료 티어가 20명 크루에 충분하다 — 초과 시: 유료 전환 필요 → 대응: 이 규모에서 초과 가능성 극히 낮음
- R2 10GB가 시즌 미디어 정리와 함께 충분하다 — 초과 시: 비용 발생 → 대응: 영상 비활성화, 사진 해상도 제한
- Supabase Auth refresh token이 재로그인 방지에 충분하다 — 불충분 시: 사용자 불편 → 대응: 커스텀 세션 관리 검토
- 영상 720p 재인코딩이 클라이언트에서 가능하다 — 불가 시: 용량 제한만으로 대체

---

*Generated by know-thy-build | 2026-10-06*
