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
