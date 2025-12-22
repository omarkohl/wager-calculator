# Implementation Plan

UI-first approach: build visual components with hardcoded/mock data, then wire up business logic.

## Phase 1: Project Setup

- [x] Initialize Vite + React + TypeScript project
- [x] Configure Tailwind CSS
- [x] Set up ESLint, Prettier, Husky + lint-staged
- [x] Configure Vitest
- [x] Define TypeScript interfaces (`types/wager.ts`)

## Phase 2: UI Shell

- [x] Create basic `App.tsx` layout with header ("Wager" + tagline)
- [x] Add "Reset Form" and "Share Wager" button placeholders (non-functional)
- [x] Mobile-first responsive container

## Phase 3: Claim & Details Section

- [x] Inline-editable Claim field (text that becomes input on click/focus)
- [x] Inline-editable Details textarea (optional, multi-line)

## Phase 4: Stakes Selector

- [x] Searchable Headless UI Combobox for stakes selection
- [x] Grouped options: common currencies (USD, EUR, GBP, CAD, AUD, JPY, CHF, CNY by frequency), fun options (Cookies, Hugs, "I was wrong"), then "Other"

## Phase 5: Participants Section

- [x] List of participants with inline-editable names
- [x] Max bet input per participant (numerical, shows currency symbol/unit)
- [x] Add/remove participant buttons (min 2, max 8)
- [x] Default placeholder names "Artem" and "Baani" (cleared on first input)

## Phase 6: Outcomes Section

- [x] List of outcomes with inline-editable labels
- [x] Add/remove outcome buttons (min 2, max 8)
- [x] Default outcomes: "Yes" and "No"

## Phase 7: Predictions Section

- [x] Grid/list of predictions per participant per outcome
- [x] Slider (1% increments) + text input (two decimal places, e.g., 33.33%)
- [x] Track which fields user has touched
- [x] Auto-distribute on blur: only when total < 100%, only to untouched fields
- [x] Warning when probabilities don't sum to 100%
- [x] "Normalize" button to scale probabilities to 100%

## Phase 8: Resolution Section

- [x] Headless UI Listbox to select which outcome occurred (or "Unresolved")
- [x] Display payout summary when resolved (placeholder text for now)
- [x] Handle edge case: identical predictions → explain zero payouts

## Phase 9: Brier Scoring Engine

- [x] Implement Brier score calculation using decimal.js
- [x] Implement payout calculation: (avg_others_brier - my_brier) / 2 × amount_in_play
- [x] Implement settlement minimization (brute force for ≤8 participants)
- [x] Handle rounding with seeded PRNG (claim text as seed)
- [x] Unit tests against `data/test_output.json`

## Phase 10: Wire Up Calculations

- [x] Connect predictions to calculation engine
- [x] Display calculated payouts in Resolution section
- [x] Display simplified settlements ("X pays Y amount")

## Phase 11: Sharing Features

- [ ] Implement URL state encoding (JSON → lz-string → base64 → URL hash)
- [ ] Implement URL state decoding on page load
- [ ] "Share Wager" button copies URL to clipboard
- [ ] "Reset Form" clears all fields to defaults

## Phase 12: Help/Info Section

- [ ] Headless UI Disclosure (collapsible) explaining Brier scoring
- [ ] Include worked example

## Phase 13: PWA Setup

- [ ] Configure vite-plugin-pwa
- [ ] Create app icons and manifest
- [ ] Test offline functionality
- [ ] Test installability

## Phase 14: Polish & Testing

- [ ] Component tests with React Testing Library
- [ ] E2E tests with Playwright
- [ ] Cross-browser testing
- [ ] Accessibility audit (keyboard nav, screen reader)
- [ ] Performance check (bundle size, load time)
