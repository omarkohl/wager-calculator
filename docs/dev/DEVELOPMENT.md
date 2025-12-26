# Development

## Setup

```bash
git clone https://github.com/omarkohl/wager-calculator.git
cd wager-calculator
npm install
npm run dev      # Start dev server
npm test         # Run unit and integration tests
npm run build    # Production build
npm run lint     # Lint the code
npm run format   # Format the code
npm run test:e2e # Run end to end browser UI tests
```

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
VITE_SITE_URL=https://yourdomain.com npm run build
```

If not set, meta tags will have empty URLs (local development is unaffected).

#### `VITE_GITHUB_REPO_URL`

GitHub repository URL, automatically set in CI for repository info display.

```bash
VITE_GITHUB_REPO_URL=https://github.com/yourusername/wager-calculator npm run build
```

## Tech Stack

- TypeScript + Vite
- Jest + Playwright for testing
- PWA with service worker
