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

- `src/domain/` - Pure wager logic, no DOM: types (`wager.ts`), Brier scoring and settlements (`brier.ts`), prediction rules (`predictions.ts`), stakes catalog and formatting (`stakes.ts`), defaults
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
