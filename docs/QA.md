---
status: active
generatedBy: know-thy-build-qa
date: 2026-10-06
---

# QA

<!-- Single source of truth for how this project tests: environment, determinism rules,
     behavioral axes, and evidence capture. Per-feature test cases are defined and run by
     the factory's reviewer-qa / factory-verifier roles during review — not written here. -->

## Determinism Rules (§5.2.5-①)

| Rule | This project |
|---|---|
| Fake timers | `vi.useFakeTimers()` — vitest 내장. 주간 벌금 계산, 시즌 경계 테스트에 필수. 글로벌 setup 없이 개별 테스트에서 설정/해제 |
| Random seed | 현재 RNG 미사용. 필요 시 `Math.random` 시드 고정 (vitest의 `--sequence.seed` 활용) |
| Network blocking | Supabase/R2 호출은 vitest의 `vi.mock()` 또는 MSW(Mock Service Worker)로 차단. 실제 네트워크 호출 금지 |
| DB isolation | Unit 테스트: Supabase 클라이언트 mock. Integration 테스트(추후): 테스트용 Supabase 프로젝트 또는 트랜잭션 롤백 |
| Order randomization | `vitest --sequence.shuffle` — **on**. 테스트 간 순서 의존성 조기 발견 |
| No `sleep` | `setTimeout`/`sleep` 사용 금지. 조건 기반 대기(`waitFor`, `vi.advanceTimersByTime`) 사용. ESLint 커스텀 규칙 또는 grep 체크로 강제 |

**`.factory/harness.toml` test sections:** `[test]`/`[test.env]`/`[test.fakes]` filled — see `.factory/harness.toml` for the live values, this table explains *why* they're set that way.

**Smoke suite (maturity M0):** `test/smoke.test.ts` — 3 tests GREEN, verified by `npx know-thy-build factory doctor`.

## Test Environment

### Service

| | Command | Verified |
|---|---------|----------|
| **Start** | `npm run dev` | ✅ 2026-10-06 |
| **Stop** | Ctrl+C / kill process | ✅ 2026-10-06 |
| **Health check** | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` → 200 | ✅ 2026-10-06 |
| **Seed data** | N/A (Supabase 미연동 상태) | — |
| **Reset** | N/A (Supabase 미연동 상태) | — |

### Access Points

| Entry | Method | Address | Tool | Verified |
|-------|--------|---------|------|----------|
| Web UI | Browser | http://localhost:3000 | Playwright MCP | ✅ 2026-10-06 |
| API Routes | HTTP | http://localhost:3000/api/* | curl / Playwright | — (미구현) |

## Behavioral Testing Axes

### Persona: 크루원 — 운동 참여자 (비개발자, 모바일 주 사용)

| Axis | Primary | Secondary |
|------|---------|-----------|
| Mindset | Sequential (단계별 진행) | Divergent (급하면 건너뛰기) |
| Strategy | Core-feature (인증 올리기 반복) | Click-through (버튼 눌러보기) |
| Habit | Short-valid (최소 입력) | Invalid (잘못된 파일 업로드) |
| Cooperation | Cooperative (대체로 순응) | Impatient (느리면 새로고침) |

### Test Profiles (risk-ordered)

| # | Axes | Risk | Description |
|---|------|------|-------------|
| P1 | Seq + Core + Short + Coop | Baseline | 정상 흐름: 로그인 → 날짜 선택 → 사진 올리기 → 확인 |
| P2 | Div + Input + Invalid + Impatient | Critical | 최대 파괴: 잘못된 파일, 빠른 반복 클릭, 새로고침 |
| P3 | Seq + Core + Short + Incomplete | High | 사진 없이 제출 시도, 날짜 미선택 후 제출 |
| P4 | Div + Click + Long-boundary + Off-track | High | 설정 변경 중 다른 페이지 이동, 대용량 영상 업로드 |
| P5 | Seq + Input + Invalid + Impossible | Medium | 미래 날짜 인증, 삭제된 시즌에 인증, 존재하지 않는 크루원 조회 |
| P6 | Div + Core + Short + Impatient | Medium | 인증 올리고 바로 새로고침, 업로드 중 뒤로가기 |
| P7 | Seq + Click + Short + Cooperative | Low | 모든 화면 순서대로 둘러보기 (기능 발견) |

### Turn-Level Scenarios (living list)

**Profile P1 (baseline):**
- "로그인 폼에 ID/PW 입력 → 로그인 버튼 클릭 → 대시보드 확인" — added: 2026-10-06
- "운동 인증 페이지로 이동 → 오늘 날짜 선택 → 사진 1장 첨부 → 제출" — added: 2026-10-06
- "대시보드에서 이번 주 인증 횟수 확인 → 본인 이름 옆 숫자 증가 확인" — added: 2026-10-06

**Profile P2 (critical):**
- "사진 대신 .txt 파일을 업로드 시도 — 에러 메시지 확인" — added: 2026-10-06
- "제출 버튼을 3초 안에 5번 연타 — 중복 인증 생성 여부 확인" — added: 2026-10-06
- "사진 업로드 중(진행 바 표시 중) 브라우저 새로고침 — 상태 복원 확인" — added: 2026-10-06
- "3초 이상 로딩되면 즉시 새로고침. 결과가 나오기 전에 다른 버튼 클릭" — added: 2026-10-06

**Profile P3 (incomplete):**
- "날짜만 선택하고 사진 없이 제출 → 필수 항목 에러 메시지 확인" — added: 2026-10-06
- "사진만 첨부하고 날짜 미선택 후 제출 → 날짜 필수 에러 확인" — added: 2026-10-06
- "로그인 시 ID만 입력하고 PW 비워둔 채 제출" — added: 2026-10-06

**Profile P4 (off-track):**
- "설정 페이지에서 규칙 수정 중 뒤로가기 → 변경사항 유실/저장 확인" — added: 2026-10-06
- "50MB 이상 영상 업로드 시도 → 용량 제한 에러 메시지 확인" — added: 2026-10-06
- "인증 등록 폼 작성 중 다른 탭으로 이동 후 복귀 → 입력값 유지 확인" — added: 2026-10-06

**Profile P5 (impossible):**
- "미래 날짜(내일)에 운동 인증 시도 → 차단 여부 확인" — added: 2026-10-06
- "종료된 시즌에 인증 등록 시도 → 에러 처리 확인" — added: 2026-10-06
- "존재하지 않는 /members/999 경로 접근 → 404 처리 확인" — added: 2026-10-06

**Profile P6 (impatient):**
- "인증 제출 후 결과 확인 전 대시보드로 이동 → 인증 반영 여부" — added: 2026-10-06
- "사진 업로드 progress 중 뒤로가기 버튼 → 업로드 취소/처리 확인" — added: 2026-10-06

**Profile P7 (discovery):**
- "로그인 후 모든 네비게이션 링크를 순서대로 클릭 → 깨진 링크 없음 확인" — added: 2026-10-06
- "각 페이지에서 모바일 뷰포트(375px)로 전환 → 레이아웃 깨짐 확인" — added: 2026-10-06

## Interaction Playbook

### Product Type: Web App (Next.js)
### Primary Testing Tool: Playwright MCP

### Available Interactions

| User Action | Tool / Method | Automatable |
|---|---|---|
| 페이지 방문 | `browser_navigate` | ✅ |
| 화면 읽기 | `browser_snapshot` (접근성 트리) | ✅ |
| 버튼/링크 클릭 | `browser_click` (ref) | ✅ |
| 텍스트 입력 | `browser_type` / `browser_fill_form` | ✅ |
| 파일 업로드 | `browser_file_upload` (ref + path) | ✅ |
| 드롭다운 선택 | `browser_select_option` | ✅ |
| 키보드 조작 | `browser_press_key` (Tab, Enter, Escape) | ✅ |
| 뷰포트 변경 | `browser_resize` | ✅ |
| 뒤로가기 | `browser_navigate_back` | ✅ |
| 탭 관리 | `browser_tabs` | ✅ |
| 호버 | `browser_hover` | ✅ |

### Unavailable Interactions (manual testing required)

| User Action | Reason | Manual Checklist Item |
|---|---|---|
| 실제 카메라 촬영 | 카메라 API 접근 불가 | [ ] 모바일 실기기에서 카메라로 직접 촬영 후 업로드 테스트 |
| Push 알림 수신 | 브라우저 알림 API 제한 | [ ] 실제 브라우저에서 알림 허용 후 수신 테스트 (추후 구현 시) |
| PWA 설치 흐름 | 설치 프롬프트 시뮬레이션 불가 | [ ] 모바일 Chrome에서 "홈 화면에 추가" 테스트 (추후 구현 시) |

### Evidence Collection Strategy

| Evidence Type | Collection Tool | When to Collect |
|---|---|---|
| Screenshot | `browser_take_screenshot` | 매 assertion 전후 (BEFORE + AFTER) |
| Console errors | `browser_console_messages` | 매 테스트 케이스 종료 시 |
| Network requests | `browser_network_requests` | API 호출 검증 시 |
| DOM state | `browser_snapshot` | 에러 메시지, UI 상태 변경 확인 시 |

### Failure State Injection Methods

| Type | Method | Tool | Applicable When |
|------|--------|------|----------------|
| Network failure | DevTools throttle / `browser_evaluate`로 fetch override | Playwright | 사진 업로드, API 호출 실패 처리 |
| Slow response | `browser_network_request`로 지연 주입 | Playwright | 로딩 상태, 타임아웃 처리 |
| Session expiry | `browser_evaluate`로 localStorage/쿠키 삭제 후 동작 | Playwright | 인증 만료 후 동작 |
| Resource deletion | Supabase에서 직접 데이터 삭제 후 UI 접근 | curl + Playwright | 삭제된 인증/시즌 접근 |
| Concurrent mutation | 두 번째 탭에서 동시 수정 | Playwright tabs | 동시 규칙 변경, 동시 인증 등록 |

### Discovered Patterns

<!-- New behavioral patterns found during QA. Grows with every run. -->

(아직 없음 — 실제 사용자 세션 로그가 생기면 여기에 기록)

## QA Quality Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Unique failures found (total) | 0 | — |
| Scenario diversity (profiles used) | 0/7 | 100% |
| Turn instructions executed | 0 | — |
| Failure injections performed | 0 | — |

## Performance QA Checklist

모든 기능 리뷰 시 확인할 성능 항목:

### 필수 체크
- [ ] 새 페이지에 `loading.tsx` 존재하는가
- [ ] 탭 전환 시 스켈레톤이 즉시 표시되는가
- [ ] 서버 응답이 해당 페이지 예산 이내인가 (DevTools Network 탭 확인)
- [ ] 불필요한 순차 DB 호출이 없는가 (Promise.all 사용)
- [ ] 공통 데이터에 data.ts 캐시 함수를 사용하는가

### 성능 예산
| 페이지 | 예산 |
|---|---|
| /records | 800ms |
| /penalty | 600ms |
| /stats | 600ms |
| /settings | 500ms |
| /workout/new | 400ms |

### 확인 방법
1. DevTools Network 탭에서 페이지 응답 시간 확인
2. DevTools Console에서 `[SLOW QUERY]` 경고 확인
3. Supabase Dashboard → `performance_log` 테이블에서 실사용자 메트릭 조회
4. `/api/health` 엔드포인트 호출하여 DB 연결 상태 확인

### 성능 회귀 감지
- CI에서 `test/perf-budget.test.ts` 자동 실행
- 새 기능 추가 후 기존 페이지 응답 시간이 예산을 초과하면 원인 분석 필요

---

*Generated by know-thy-build | 2026-10-06*
