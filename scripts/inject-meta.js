#!/usr/bin/env node

/**
 * Post-build script to inject VITE_SITE_URL into meta tags in dist/index.html
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const indexPath = join(__dirname, '..', 'dist', 'index.html')
const siteUrl = process.env.VITE_SITE_URL || ''
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
  console.log(`✓ Injected VITE_SITE_URL into ${indexPath}`)
  if (goatcounterSite) {
    console.log(`✓ Injected GoatCounter tracking code for ${goatcounterSite}`)
  }
} catch (error) {
  console.error('Error injecting meta tags:', error)
  process.exit(1)
}
