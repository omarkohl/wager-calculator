# Wager Calculator

Brier scoring calculator for friendly wagers. PWA with React + TypeScript + Tailwind.

## Dev Workflow

- **TDD**: Write tests first, then implement
- **Version control**: Use `jj` (jujutsu), not git
- **Commits**: Conventional commits (`feat:`, `fix:`, `refactor:`), semantic units
- **Pre-commit**: Run `npm run lint && npm run format && npm test` before committing

## Key Docs

- [Specification](docs/dev/SPECIFICATION.md) - Full requirements
- [Plan](docs/dev/PLAN.md) - Implementation phases
- [Test data](data/) - Expected calculation outputs for verification

## Architecture

- `src/modules/` - Calculation logic (Brier scoring, settlements) using decimal.js
- `src/components/` - React UI components
- `src/types/` - TypeScript interfaces
- Headless UI for accessible primitives
- lz-string for URL state compression

## Important Details

- Probabilities: slider = 1% steps, text input = 2 decimal places
- Auto-distribute: only when total < 100%, only to untouched fields
- Stakes (not "currency"): supports money and fun options (cookies, hugs)
- Payouts must sum to zero; use seeded PRNG for rounding tiebreaks
