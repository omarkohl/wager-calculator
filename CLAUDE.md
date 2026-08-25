# Wager Calculator

Brier scoring calculator for friendly wagers. PWA with React + TypeScript + Tailwind.

## Dev Workflow

- **TDD**: Write tests first, then implement
- **Version control**: Use `jj` (jujutsu), not git
- **Commits**: Conventional commits (`feat:`, `fix:`, `refactor:`), semantic units
- **Package manager**: Use `bun` (not npm/yarn)
- **Pre-commit**: Run `make precommit` before committing
- **Common tasks**: See `make help` (the Makefile wraps the bun scripts)

## Key Docs

- [Specification](docs/dev/SPECIFICATION.md) - Full requirements
- [Historical calculations](docs/dev/historical-calculations/) - How the expected outputs were derived (not used by any test)

## Architecture

- `src/modules/` - Calculation logic (Brier scoring, settlements) using decimal.js
- `src/components/` - React UI components
- `src/types/` - TypeScript interfaces
- Headless UI for accessible primitives
- lz-string for URL state compression

## E2E Tests (Playwright)

These tests MUST try to imitate real users and not rely on hidden test IDs and similar. Use accessibility information, labels and similar information.

## Important Details

- Probabilities: slider = 1% steps, text input = 2 decimal places
- Auto-distribute: only when total < 100%, only to untouched fields
- Stakes (not "currency"): supports money and fun options (cookies, hugs)
- Payouts must sum to zero; use seeded PRNG for rounding tiebreaks
