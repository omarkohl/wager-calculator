import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import App from './App'
import { ROUTE_CHANGE_EVENT } from './routeTable'
import { legacyRedirect, pathFor, routeFromPath, type RouteId } from './routes'

const BASE = import.meta.env.BASE_URL

function currentRoute(): RouteId {
  return routeFromPath(window.location.pathname, BASE)
}

function Link({ to, children }: { to: Exclude<RouteId, 'notFound'>; children: ReactNode }) {
  const href = pathFor(to, BASE)
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    window.history.pushState(null, '', href)
    window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT))
  }
  return (
    <a href={href} onClick={onClick} className="font-medium text-blue-700 underline">
      {children}
    </a>
  )
}

function Landing() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-['Space_Grotesk'] text-3xl font-bold text-gray-900">
        Betting is a tax on bullshit
      </h1>
      <ul className="mt-6 space-y-3">
        <li>
          <Link to="wager">Wager Calculator</Link>
          <p className="text-sm text-gray-600">
            Settle a friendly wager fairly, whatever each side believes.
          </p>
        </li>
      </ul>
    </main>
  )
}

function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-2 text-gray-700">
        There is nothing at this address. <Link to="landing">Go to the home page</Link>.
      </p>
    </main>
  )
}

function Elicit() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Coming soon</h1>
      <p className="mt-2">
        <Link to="landing">Home</Link>
      </p>
    </main>
  )
}

function Site() {
  const [route, setRoute] = useState<RouteId>(() => {
    // Old links keep the wager at the landing path: move them without a reload
    const target = legacyRedirect(window.location.pathname, window.location.hash, BASE)
    if (target) window.history.replaceState(null, '', target)
    return currentRoute()
  })

  useEffect(() => {
    const sync = () => setRoute(currentRoute())
    window.addEventListener('popstate', sync)
    window.addEventListener(ROUTE_CHANGE_EVENT, sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener(ROUTE_CHANGE_EVENT, sync)
    }
  }, [])

  switch (route) {
    case 'wager':
      return <App />
    case 'elicit':
      return <Elicit />
    case 'landing':
      return <Landing />
    default:
      return <NotFound />
  }
}

export default Site
