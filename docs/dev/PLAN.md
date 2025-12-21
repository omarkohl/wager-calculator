# Implementation Plan

UI-first approach: build visual components with hardcoded/mock data, then wire up business logic.

## Phase 1: Project Setup

- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure Tailwind CSS
- [ ] Set up ESLint, Prettier, Husky + lint-staged
- [ ] Configure Vitest
- [ ] Define TypeScript interfaces (`types/wager.ts`)

## Phase 2: UI Shell

- [ ] Create basic `App.tsx` layout with header ("Wager" + tagline)
- [ ] Add "Reset Form" and "Share Wager" button placeholders (non-functional)
- [ ] Mobile-first responsive container

## Phase 3: Claim & Details Section

- [ ] Inline-editable Claim field (text that becomes input on click/focus)
- [ ] Inline-editable Details textarea (optional, multi-line)

## Phase 4: Stakes Selector

- [ ] Searchable Headless UI Combobox for stakes selection
- [ ] Grouped options: common currencies (USD, EUR, GBP, CAD, AUD, JPY, CHF, CNY by frequency), fun options (Cookies, Hugs, "I was wrong"), then "Other"

## Phase 5: Participants Section

- [ ] List of participants with inline-editable names
- [ ] Max bet input per participant (numerical, shows currency symbol/unit)
- [ ] Add/remove participant buttons (min 2, max 8)
- [ ] Default placeholder names "Artem" and "Baani" (cleared on first input)

## Phase 6: Outcomes Section

- [ ] List of outcomes with inline-editable labels
- [ ] Add/remove outcome buttons (min 2, max 8)
- [ ] Default outcomes: "Yes" and "No"

## Phase 7: Predictions Section

- [ ] Grid/list of predictions per participant per outcome
- [ ] Slider (1% increments) + text input (two decimal places, e.g., 33.33%)
- [ ] Track which fields user has touched
- [ ] Auto-distribute on blur: only when total < 100%, only to untouched fields
- [ ] Warning when probabilities don't sum to 100%
- [ ] "Normalize" button to scale probabilities to 100%

## Phase 8: Resolution Section

- [ ] Headless UI Listbox to select which outcome occurred (or "Unresolved")
- [ ] Display payout summary when resolved (placeholder text for now)
- [ ] Handle edge case: identical predictions → explain zero payouts

## Phase 9: Brier Scoring Engine

- [ ] Implement Brier score calculation using decimal.js
- [ ] Implement payout calculation: (avg_others_brier - my_brier) / 2 × amount_in_play
- [ ] Implement settlement minimization (brute force for ≤8 participants)
- [ ] Handle rounding with seeded PRNG (claim text as seed)
- [ ] Unit tests against `data/test_output.json`

## Phase 10: Wire Up Calculations

- [ ] Connect predictions to calculation engine
- [ ] Display calculated payouts in Resolution section
- [ ] Display simplified settlements ("X pays Y amount")

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
