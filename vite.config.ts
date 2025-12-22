import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'

function getBuildInfo() {
  try {
    let commitHash = execSync('git rev-parse --short=8 HEAD', {
      encoding: 'utf8',
    }).trim()

    // Check for uncommitted changes
    const isDirty =
      execSync('git status --porcelain', {
        encoding: 'utf8',
      }).trim().length > 0

    if (isDirty) {
      commitHash += '-dirty'
    }

    const commitDate = execSync('git log -1 --format=%cd --date=format:%Y-%m-%d', {
      encoding: 'utf8',
    }).trim()

    return {
      commitHash: commitHash,
      commitDate: commitDate,
    }
  } catch (error) {
    console.warn('Failed to get build info from git:', error)
    return {
      commitHash: 'unknown',
      commitDate: 'unknown',
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'og-image.png'],
      manifest: {
        name: 'Wager Calculator',
        short_name: 'Wager',
        description: 'Calculate fair betting odds for friendly wagers using Brier scoring',
        theme_color: '#18181b',
        background_color: '#18181b',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  base: './',
  define: {
    __COMMIT_HASH__: JSON.stringify(getBuildInfo().commitHash),
    __COMMIT_DATE__: JSON.stringify(getBuildInfo().commitDate),
    __REPO_URL__: JSON.stringify(process.env.VITE_GITHUB_REPO_URL || ''),
    __SITE_URL__: JSON.stringify(process.env.VITE_SITE_URL || ''),
  },
})
