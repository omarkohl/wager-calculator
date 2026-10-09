#!/usr/bin/env node

/**
 * Post-build script: injects VITE_SITE_URL (plus BASE_PATH) into the meta tags
 * and the analytics code into dist/index.html, then copies it to dist/404.html so
 * GitHub Pages serves the SPA for deep links.
 */

import { copyFileSync, readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { normalizeBasePath } from './basePath.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const indexPath = join(__dirname, '..', 'dist', 'index.html')
const basePath = normalizeBasePath(process.env.BASE_PATH)
// The site URL is the origin; the meta tags need origin + base path (no trailing slash).
const siteUrl = process.env.VITE_SITE_URL
  ? process.env.VITE_SITE_URL.replace(/\/+$/, '') + basePath.replace(/\/$/, '')
  : ''
const goatcounterSite = process.env.VITE_GOATCOUNTER_SITE || ''

if (!siteUrl) {
  console.warn('Warning: VITE_SITE_URL not set. Meta tags will have empty URLs.')
}

if (!goatcounterSite) {
  console.log('VITE_GOATCOUNTER_SITE not set. Skipping analytics injection.')
}

try {
  let html = readFileSync(indexPath, 'utf8')

  // Replace placeholder URLs with actual site URL
  html = html.replace(/\{\{SITE_URL\}\}/g, siteUrl)

  // Inject GoatCounter tracking code if configured
  let trackingCode = ''
  if (goatcounterSite) {
    const goatcounterUrl = `https://${goatcounterSite}.goatcounter.com/count`
    trackingCode = `
    <script>
      window.goatcounter = {no_onload: true}

      function trackPage() {
        const hash = window.location.hash
        const faqMatch = hash.match(/[?&]faq=([^&]+)/)
        const path = faqMatch ? '/faq/' + faqMatch[1] : '/'
        if (window.goatcounter && window.goatcounter.count) {
          window.goatcounter.count({path: path})
        }
      }

      window.addEventListener('hashchange', trackPage)
      window.addEventListener('load', trackPage)
    </script>
    <script data-goatcounter="${goatcounterUrl}" async src="//gc.zgo.at/count.js"></script>`
  }
  html = html.replace(/\s*<!-- TRACKING_CODE -->/g, trackingCode)

  writeFileSync(indexPath, html, 'utf8')
  copyFileSync(indexPath, join(dirname(indexPath), '404.html'))
  console.log(`✓ Injected VITE_SITE_URL into ${indexPath}`)
  if (goatcounterSite) {
    console.log(`✓ Injected GoatCounter tracking code for ${goatcounterSite}`)
  }
} catch (error) {
  console.error('Error injecting meta tags:', error)
  process.exit(1)
}
