/**
 * The route names and the navigation event, kept free of imports so the
 * post-build script (analytics) can read them too. The path names are
 * placeholders: change them here only.
 */
export const ROUTE_SEGMENTS = {
  landing: '',
  wager: 'wager',
  elicit: 'elicit',
} as const

export type KnownRouteId = keyof typeof ROUTE_SEGMENTS

/** Fired after every in-app navigation so analytics can count the new path. */
export const ROUTE_CHANGE_EVENT = 'routechange'
