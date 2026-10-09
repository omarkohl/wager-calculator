import { ROUTE_CHANGE_EVENT } from './routeTable'

/**
 * Go to another page of the app without a reload. `state` rides along in the history
 * entry for the page that opens (transient: the next `replaceState` drops it).
 */
export function navigate(url: string, state?: unknown): void {
  window.history.pushState(state ?? null, '', url)
  window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT))
}
