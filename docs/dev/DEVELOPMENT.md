# Development

## Setup

```bash
git clone https://github.com/omarkohl/wager-calculator.git
cd wager-calculator
make help        # List all available commands
make dev         # Start dev server
make test        # Run unit and integration tests
make build       # Production build
make lint        # Lint the code
make format      # Format the code
make test-e2e    # Run end to end browser UI tests
make precommit   # Everything the CI checks, before you push
```

Every target installs dependencies first, so there is no separate setup step.
The underlying `bun run <script>` commands from `package.json` also work
directly.

## Deployment

### Environment Variables

#### `VITE_SITE_URL`

Public URL where the app is deployed. Used for Open Graph and Twitter Card meta tags.

**GitHub Actions:**

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click **Variables** tab → **New repository variable**
3. Name: `SITE_URL`, Value: `https://yourdomain.com`

The workflow uses `${{ vars.SITE_URL }}` during builds.

**Local build:**

```bash
VITE_SITE_URL=https://yourdomain.com bun run build
```

If not set, meta tags will have empty URLs (local development is unaffected).

#### `BASE_PATH` (Optional)

Path the site is served under, default `/` (a domain root, as with the custom domain). Set it for a sub-path deployment, e.g. `BASE_PATH=/wager-calculator/` (slashes are added if missing). It sets Vite's `base`, the PWA `scope` and `start_url`, the service worker's navigation fallback and the absolute URLs in the meta tags (`VITE_SITE_URL` must be the origin only: a path in it would be doubled by `BASE_PATH`). The build also writes `dist/404.html` as a copy of `index.html`, so GitHub Pages serves the app for deep links such as `/wager`. The post-build script runs TypeScript directly and needs Node 22.19 or newer.

```bash
BASE_PATH=/wager-calculator/ VITE_SITE_URL=https://user.github.io bun run build
```

#### `VITE_GITHUB_REPO_URL`

GitHub repository URL, automatically set in CI for repository info display.

```bash
VITE_GITHUB_REPO_URL=https://github.com/yourusername/wager-calculator bun run build
```

#### `VITE_GOATCOUNTER_SITE` (Optional)

GoatCounter site name for analytics tracking. If set, tracking code will be injected during build.

**Privacy:** Only page views are tracked (route paths `/`, `/wager`, `/elicit`; FAQ pages as `/faq/<id>`). Wager data in the URL hash is never sent to analytics.

**GitHub Actions:**

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click **Variables** tab → **New repository variable**
3. Name: `GOATCOUNTER_SITE`, Value: `yoursite` (the part before `.goatcounter.com`)

**Local build:**

```bash
VITE_GOATCOUNTER_SITE=yoursite bun run build
```

If not set, no tracking code is added (recommended for forks and local development).

## Tech Stack

- React + TypeScript + Vite, Tailwind CSS
- Vitest + React Testing Library for unit and component tests, Playwright for E2E
- PWA with service worker

## Claude Code cloud sessions

Autonomous runs (see `CLAUDE.md`) execute in Claude Code cloud sessions. The repo's
`.claude/` holds the agents and hooks; the SessionStart hook installs dependencies.
The cloud environment itself is configured at claude.ai/code:

- **Network access**: Custom, with the default list plus `cdn.playwright.dev` and
  `playwright.download.prss.microsoft.com` (Playwright browsers).
- **Setup script** (Node 24, as in CI; the image ships Node 22, maybe below 22.19).
  The SessionStart hook puts `/opt/node24/bin` first in `PATH`:

  ```bash
  #!/bin/bash
  curl -fsSL https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt |
    grep -o 'node-v24[^ ]*-linux-x64.tar.xz' | head -1 |
    xargs -I{} curl -fsSL https://nodejs.org/dist/latest-v24.x/{} -o /tmp/node.tar.xz &&
    mkdir -p /opt/node24 && tar -xJf /tmp/node.tar.xz -C /opt/node24 --strip-components=1 || true
  npx -y playwright@1 install-deps chromium || true
  ```
