# Progress

## Next step

2.

## Stack

<!-- step: branch, PR number -->

## Log

- **Step 0 (environment)**: node 22.22, dependencies installed, `make format-check lint
typecheck test` green (272 tests). `bun x playwright install` is blocked in the cloud
  (cdn.playwright.dev denied) and Playwright 1.62 expects chromium-1234 while
  /opt/pw-browsers has 1194 in another layout. Workaround that works: a throwaway config
  (not committed) spreading `playwright.config.ts` with
  `launchOptions.executablePath=/opt/pw-browsers/chromium-1194/chrome-linux/chrome` for the
  chromium project; all 11 existing E2E tests pass with it. Firefox and webkit are not
  available; CI covers them.
- **Step 1 (base path)**: `scripts/basePath.ts` normalises `BASE_PATH` (tested), used by
  `vite.config.ts` and `scripts/inject-meta.js` (imports the `.ts` directly, so the build
  needs node >= 22.19). `base` was `./` before and is now absolute; manifest `start_url`
  and `scope` equal the base (at the root: `/`, same URL as the former `./`; no `id` added,
  so identity is unchanged). `VITE_SITE_URL` stays the origin; the meta tags get origin +
  base path. `dist/404.html` is a copy of the injected `index.html`.

## Decisions

## For review

<!-- [NEEDS PROTOTYPE] variants and decisions the user should look at -->

- Step 1: no automated test that `dist/404.html` equals `dist/index.html` or that the
  manifest scope/start_url equal the base (needs a build; too heavy for a step); checked
  by hand. Pre-existing and left alone: the precache revision of `index.html` does not
  cover the injected edits, and the GoatCounter path handling (step 2 reworks it).

## Questions

## Blocked
