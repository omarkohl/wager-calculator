import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import App from './App'
import Footer from './components/Footer'
import { ROUTE_CHANGE_EVENT } from './routeTable'
import { legacyRedirect, pathFor, routeFromPath, type RouteId } from './routes'

const BASE = import.meta.env.BASE_URL

function currentRoute(): RouteId {
  return routeFromPath(window.location.pathname, BASE)
}

function Link({
  to,
  children,
  current,
}: {
  to: Exclude<RouteId, 'notFound'>
  children: ReactNode
  current?: RouteId
}) {
  const href = pathFor(to, BASE)
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    // Already here: a push would drop the hash that holds the wager
    if (currentRoute() === to) return
    window.history.pushState(null, '', href)
    window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT))
  }
  return (
    <a
      href={href}
      onClick={onClick}
      aria-current={current === to ? 'page' : undefined}
      className="font-medium text-blue-700 underline"
    >
      {children}
    </a>
  )
}

function Landing() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
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
    </div>
  )
}

function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-2 text-gray-700">
        There is nothing at this address. <Link to="landing">Go to the home page</Link>.
      </p>
    </div>
  )
}

function Elicit() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Coming soon</h1>
      <p className="mt-2">
        <Link to="landing">Home</Link>
      </p>
    </div>
  )
}

const SITE_NAME = 'Wager Calculator'

/** Tab title of the routes that do not set their own (the calculator shows its claim). */
function titleFor(route: RouteId): string {
  switch (route) {
    case 'elicit':
      return `Coming soon – ${SITE_NAME}`
    case 'notFound':
      return `Page not found – ${SITE_NAME}`
    case 'landing':
      return `Home – ${SITE_NAME}`
    default:
      return SITE_NAME
  }
}

function Header({ current }: { current: RouteId }) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-4xl flex-wrap gap-x-6 gap-y-1 px-4 py-2 text-sm sm:px-6 lg:px-8"
      >
        <Link to="landing" current={current}>
          Home
        </Link>
        <Link to="wager" current={current}>
          Wager Calculator
        </Link>
      </nav>
    </header>
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

  const mainRef = useRef<HTMLElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  // The calculator titles the tab with its claim; the other routes get a fixed title
  useEffect(() => {
    if (route !== 'wager') document.title = titleFor(route)
  }, [route])

  // After a navigation, send keyboard and screen reader users to the new page
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const heading = mainRef.current?.querySelector('h1')
    if (!heading) return
    heading.tabIndex = -1
    heading.focus()
    // Written to the DOM directly: a state update here would only re-render the same text
    if (statusRef.current) statusRef.current.textContent = heading.textContent
  }, [route])

  let page: ReactNode
  switch (route) {
    case 'wager':
      page = <App />
      break
    case 'elicit':
      page = <Elicit />
      break
    case 'landing':
      page = <Landing />
      break
    default:
      page = <NotFound />
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header current={route} />
      <main ref={mainRef} className="flex-1">
        {page}
      </main>
      <Footer commitDate={__COMMIT_DATE__} commitHash={__COMMIT_HASH__} repoUrl={__REPO_URL__} />
      <div role="status" ref={statusRef} className="sr-only" />
    </div>
  )
}

export default Site
