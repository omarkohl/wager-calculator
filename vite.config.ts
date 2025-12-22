import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
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
  plugins: [react()],
  base: './',
  define: {
    __COMMIT_HASH__: JSON.stringify(getBuildInfo().commitHash),
    __COMMIT_DATE__: JSON.stringify(getBuildInfo().commitDate),
    __REPO_URL__: JSON.stringify(process.env.VITE_GITHUB_REPO_URL || ''),
  },
})
