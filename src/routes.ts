import { ROUTE_SEGMENTS, type KnownRouteId } from './routeTable'
import { decodeWagerFromHash, getFaqIdFromURL } from './storage/urlHash'

/**
 * The site's routes. The path names are placeholders: keep them in this one module.
 */
export type RouteId = KnownRouteId | 'notFound'

function relativeSegment(pathname: string, base: string): string | null {
  const root = base.replace(/\/$/, '')
  if (pathname !== root && !pathname.startsWith(`${root}/`)) return null
  return pathname
    .slice(root.length)
    .replace(/^\/+|\/+$/g, '')
    .replace(/^index\.html$/, '')
}

export function routeFromPath(pathname: string, base: string): RouteId {
  const segment = relativeSegment(pathname, base)
  if (segment === null) return 'notFound'
  for (const [id, name] of Object.entries(ROUTE_SEGMENTS)) {
    if (name === segment) return id as RouteId
  }
  return 'notFound'
}

export function pathFor(route: Exclude<RouteId, 'notFound'>, base: string): string {
  return `${base}${ROUTE_SEGMENTS[route]}`
}

/**
 * Links created before the site had routes put the wager at the landing path
 * (`/#v=2…`, legacy v1 hashes, `/#faq=…`). Returns the URL (path and hash) they
 * belong at, or null when the location needs no redirect.
 */
export function legacyRedirect(pathname: string, hash: string, base: string): string | null {
  if (routeFromPath(pathname, base) !== 'landing' || hash.length <= 1) return null
  const isWagerHash =
    hash.startsWith('#v=') || getFaqIdFromURL(hash) !== null || decodeWagerFromHash(hash) !== null
  return isWagerHash ? `${pathFor('wager', base)}${hash}` : null
}
