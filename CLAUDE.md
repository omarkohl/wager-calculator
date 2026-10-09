# Wager Calculator

Brier scoring calculator for friendly wagers. PWA with React + TypeScript + Tailwind.

## Dev Workflow

- **TDD**: Write tests first, then implement
- **Version control**: Use `jj` (jujutsu), not git. Exception: cloud sessions
  (`CLAUDE_CODE_REMOTE=true`) have no jj; use git there
- **Commits**: Conventional commits (`feat:`, `fix:`, `refactor:`), semantic units
- **Package manager**: Use `bun` (not npm/yarn)
- **Pre-commit**: Run `make precommit` before committing (autonomous runs: see below)
- **Common tasks**: See `make help` (the Makefile wraps the bun scripts)

## Key Docs

- [Specification](docs/dev/SPECIFICATION.md) - Full requirements
- [howsure requirements](docs/dev/HOWSURE-REQUIREMENTS.md) - Scope extension: site shell, belief elicitation (tool 2)
- [Historical calculations](docs/dev/historical-calculations/) - How the expected outputs were derived (not used by any test)

## Architecture

- `src/domain/` - Pure wager logic, no DOM: types (`wager.ts`), Brier scoring and settlements (`brier.ts`), payouts of every outcome and expected values (`expectation.ts`), step-by-step trace of a resolution (`explanation.ts`), prediction rules (`predictions.ts`), stakes catalog and formatting (`stakes.ts`), defaults
- `src/storage/` - Browser persistence: the URL hash format (`urlHash.ts`) and the remembered stakes preference (`stakesPreference.ts`)
- `src/components/` - React UI components; FAQ content lives in `components/faq.tsx`
- `src/App.tsx` - Holds the single `Wager` state and wires components to it
- Headless UI for accessible primitives
- decimal.js for all probability and money arithmetic
- lz-string only to read legacy (v1) share URLs

## E2E Tests (Playwright)

These tests MUST try to imitate real users and not rely on hidden test IDs and similar. Use accessibility information, labels and similar information.

## Important Details

- Probabilities: slider = 1% steps, text input = 2 decimal places
- Auto-distribute: only when total < 100%, only to untouched fields
- Stakes (not "currency"): supports money and fun options (cookies, hugs)
- Payouts must sum to zero; use seeded PRNG for rounding tiebreaks

## Autonomous runs

A run follows `.claude/run/PLAN.md` (steps, settled decisions) and records itself in
`.claude/run/PROGRESS.md`. The main session orchestrates and writes no code:

1. Per step: the `implementer` subagent (one instance, reused) implements and commits;
   a fresh `reviewer` reviews the commit; the implementer acts on the findings.
2. One step = one commit, with the step ticked in PLAN.md and a short PROGRESS.md entry
   (only what the diff does not show: decisions, deviations, open problems). A step too
   big for one commit is split into lettered sub-steps in PLAN.md first.
3. Checks per step: `make format lint typecheck test`, plus
   `bun x playwright test --project=chromium <specs>` for the E2E specs the step adds or
   touches. If browsers cannot be installed, say so in PROGRESS.md; CI runs all browsers
   on every PR. A full `make precommit` where PLAN.md says so.
4. **Decisions**: one that PLAN.md, the requirements and the code do not settle → take
   the most reversible option, record it under "Decisions" in PROGRESS.md, and list it
   under "For review". Stop only if a wrong guess would cost more than a step to undo:
   then write it under `## Blocked` in PROGRESS.md, commit, push, and end the turn.
5. No new dependency unless the step needs it; justify it in PROGRESS.md.

### Stacked PRs (cloud only)

Locally nothing is pushed (a hook enforces this while a run is active). In the cloud,
every step commit becomes its own PR, stacked on the previous step's PR:

- After the review is resolved, create the step branch at the commit:
  `git branch howsure/<step>-<slug>` (e.g. `howsure/04-log-odds`), push it with
  `git push -u origin <branch>`, and open the PR with the REST API (`gh pr` is blocked):

  ```sh
  gh api repos/omarkohl/wager-calculator/pulls -f title='<commit subject>' \
    -f head=<branch> -f base=<previous step branch, or main for the first> -f body='<body>'
  ```

  The body: what and why in 1-3 lines, `Stacked on #<previous PR>`, the session link
  (`https://claude.ai/code/${CLAUDE_CODE_REMOTE_SESSION_ID/#cse_/session_}`), and the
  attribution line. Record branch and PR number in PROGRESS.md.

- If the session was given its own branch name, keep that branch pointing at the top of
  the stack and push it too.
- Before each step: `git fetch`, then check CI of the open stack PRs
  (`gh api repos/omarkohl/wager-calculator/commits/<sha>/check-runs`). A red check, or a
  later finding, in an already pushed step is fixed in that step's commit:
  `git commit --fixup=<sha>`, then
  `GIT_SEQUENCE_EDITOR=true git rebase -i --autosquash --update-refs origin/main`, then
  `git push --force-with-lease origin <every moved branch>`.
- If the user merged PRs: `git rebase --update-refs --onto origin/main <merged branch>`
  for the rest of the stack, force-push the moved branches with lease, and make sure the
  lowest open PR has base `main` (`gh api -X PATCH .../pulls/<n> -f base=main`).
- Never push to `main`, merge a PR, or delete a branch.
