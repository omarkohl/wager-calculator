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

if (!siteUrl) {
  console.warn('Warning: VITE_SITE_URL not set. Meta tags will have empty URLs.')
}

try {
  let html = readFileSync(indexPath, 'utf8')

  // Replace placeholder URLs with actual site URL
  html = html.replace(/\{\{SITE_URL\}\}/g, siteUrl)

  writeFileSync(indexPath, html, 'utf8')
  console.log(`✓ Injected VITE_SITE_URL into ${indexPath}`)
} catch (error) {
  console.error('Error injecting meta tags:', error)
  process.exit(1)
}
