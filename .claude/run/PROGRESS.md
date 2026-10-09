# Progress

## Next step

3.

## Stack

<!-- step: branch, PR number -->

- 1: `howsure/01-base-path`, PR #89 (base `main`)

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
- **Step 2 (routes)**: `src/routes.ts` (route table, `routeFromPath`, `legacyRedirect`) and
  `src/Site.tsx` (History-API router, landing, not-found, a "Coming soon" stub at
  `/elicit`) wrap `App`, which stays the wager page. Any non-empty hash at the landing
  path that is `#v=`, decodes as v1, or carries `faq=` is redirected to `/wager` with
  the hash kept. Analytics: the injected script counts `/`, `/wager`, `/elicit`,
  `/not-found`, or `/faq/<id>`; it now also listens to `popstate` and a `routechange`
  event the router fires. The old FAQ regex missed `#faq=` (needed `?` or `&` before);
  fixed in passing. Existing E2E specs now start at `/wager`. Chromium E2E ran via the
  local `executablePath` workaround config from step 0 (not committed). The route table
  and event name live in `src/routeTable.ts`, shared with `inject-meta.js`; analytics
  skips a path equal to the last one counted.

## Decisions

## For review

<!-- [NEEDS PROTOTYPE] variants and decisions the user should look at -->

- Step 1/2: `start_url` is the base, so installed PWAs now open on the landing page, not
  the calculator.

- Step 1: no automated test that `dist/404.html` equals `dist/index.html` or that the
  manifest scope/start_url equal the base (needs a build; too heavy for a step); checked
  by hand. Pre-existing and left alone: the precache revision of `index.html` does not
  cover the injected edits, and the GoatCounter path handling (step 2 reworks it).

## Questions

## Blocked
