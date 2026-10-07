@AGENTS.md

## Project Compass
This project follows the principles defined in [PROJECT.md](./docs/PROJECT.md).
AI agents MUST read docs/PROJECT.md before starting any work.
NON-NEGOTIABLE rules in PROJECT.md cannot be overridden.

## Factory

know-thy-build's dark factory turns `backlog` issues into merged PRs without a human in the implementation loop. This project's entry points:

### Label Flow

```
backlog ──(/know-thy-build:next)──▶ factory:queue ──▶ triage → plan → implement → review → merge
                                                              │
                                    factory:needs-info · factory:needs-human · factory:blocked
                                                              │
                                (/know-thy-build:clarify · /know-thy-build:unstick — human resolves → back to queue)
```

- **Backlog issues** come from `/know-thy-build:feature` (a lasting spec) or `/know-thy-build:issue` (bug/chore, no spec).
- **A human moves `backlog` → `factory:queue`** via `/know-thy-build:next` — the factory never self-selects work.
- **A merge is always a human, on the GitHub UI, after gates pass.** No skill and no script performs a merge.

### `factory status`

Run `npx know-thy-build factory status` (or `/know-thy-build:status`) anytime: Needs You first (needs-info / needs-human / blocked), then queue, in-progress, recent merges, usage. Check this instead of polling issues by hand.

### Skill Entry Points

| Situation | Skill |
|---|---|
| Define/evolve the project | `/know-thy-build:project` |
| Define/evolve the tech foundation + CHARTER | `/know-thy-build:technical` |
| Set up the test framework | `/know-thy-build:qa` |
| New feature (lasting spec) | `/know-thy-build:feature` |
| Bug or chore (no spec needed) | `/know-thy-build:issue` |
| `doctor` failing, brownfield adopt, harness promotion review | `/know-thy-build:harness` |
| Move `backlog` → `factory:queue` | `/know-thy-build:next` |
| `factory:needs-info` | `/know-thy-build:clarify` |
| `factory:needs-human` | `/know-thy-build:unstick` |
| `factory:retro-proposal` PR review | `/know-thy-build:proposal` |
| Write or edit a role file | `/know-thy-build:role` |
| Weekly digest | `/know-thy-build:digest` |
| Anytime status check | `/know-thy-build:status` |

### Protected Paths

`.factory/**`, `.claude/**`, `.github/workflows/factory-*.yml`, `docs/factory/CHARTER.md`, and the build-config files listed in `harness.toml [protected]` change only through a human-merged PR — a hook denies agent edits, and the merge stage refuses to auto-merge a PR that carries one. If one of these needs to change, open a `factory:harness` issue (harness/build config) or edit it yourself and let a human merge the PR.

### Document References
- Project definition: `docs/PROJECT.md`
- Technical foundation + CHARTER: `docs/TECHNICAL.md`, `docs/factory/CHARTER.md`
- Feature specs: `docs/features/NNN.md`
- QA framework: `docs/QA.md`
- Harness contract: `.factory/harness.toml`
- Feature registry: `docs/PROJECT.md` → Feature Registry section

## Performance Rules

모든 개발에서 지켜야 할 성능 규칙:

### 필수
- 새 페이지는 반드시 `loading.tsx` 포함 (스켈레톤 UI)
- 한 페이지당 순차 Supabase 호출 최대 2단계 (auth → 나머지 전부 Promise.all)
- 공통 데이터는 `src/lib/data.ts`의 React.cache() 함수 사용 (getUser, getProfile, getActiveSeason, getCrewMembers)
- 새 DB 쿼리 추가 시 200ms 초과하면 data.ts에 캐시 함수로 등록

### 성능 예산
| 페이지 | 서버 응답 예산 |
|---|---|
| /records | 800ms |
| /penalty | 600ms |
| /stats | 600ms |
| /settings | 500ms |
| /workout/new | 400ms |

### 모니터링
- 클라이언트 Web Vitals → `performance_log` 테이블에 자동 수집 (PerfReporter 컴포넌트)
- 느린 쿼리(200ms+) → 서버 콘솔에 `[SLOW QUERY]` 경고 (data.ts timed 함수)
- `/api/health` — DB 연결 + 쿼리 시간 측정
