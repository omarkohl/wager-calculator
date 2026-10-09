/**
 * Normalises the BASE_PATH build variable to an absolute path with a leading
 * and a trailing slash ("/" when unset). Shared by vite.config.ts and the
 * post-build script.
 */
export function normalizeBasePath(raw: string | undefined): string {
  const value = (raw ?? '').trim()
  if (value === '') return '/'
  if (value.startsWith('//')) {
    throw new Error(`BASE_PATH must not start with "//" (looks like a host), got "${raw}"`)
  }
  const segments = value.split('/').filter(s => s !== '')
  const valid = (s: string) => /^[A-Za-z0-9._~-]+$/.test(s) && s !== '.' && s !== '..'
  if (!segments.every(valid)) {
    throw new Error(`BASE_PATH must be a plain path such as /app/, got "${raw}"`)
  }
  return segments.length === 0 ? '/' : `/${segments.join('/')}/`
}
