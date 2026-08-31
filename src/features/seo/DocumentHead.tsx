import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import type { RoutePath } from '@/routes'
import { NOT_FOUND_META, PAGE_META } from '@/seo'

const SITE_URL = (import.meta.env.VITE_SITE_URL ?? '').replace(/\/$/, '')

/** Adds, updates or removes a single meta or link tag in the head. */
function setTag(selector: string, create: () => HTMLElement, apply: (el: HTMLElement) => void) {
  const existing = document.head.querySelector<HTMLElement>(selector)
  const element = existing ?? create()
  apply(element)
  if (!existing) document.head.appendChild(element)
}

function setRobots(content: string | null) {
  const existing = document.head.querySelector('meta[name="robots"]')
  if (content === null) {
    existing?.remove()
    return
  }
  setTag(
    'meta[name="robots"]',
    () => {
      const meta = document.createElement('meta')
      meta.setAttribute('name', 'robots')
      return meta
    },
    (element) => element.setAttribute('content', content),
  )
}

function setCanonical(href: string | null) {
  const existing = document.head.querySelector('link[rel="canonical"]')
  // No domain configured, or a page that should not be indexed: a relative
  // canonical is not a valid one, and a canonical on a noindex page is noise.
  if (!href || !SITE_URL) {
    existing?.remove()
    return
  }
  setTag(
    'link[rel="canonical"]',
    () => {
      const link = document.createElement('link')
      link.rel = 'canonical'
      return link
    },
    (element) => element.setAttribute('href', href),
  )
}

/**
 * Keeps the title, the robots directive and the canonical in step with the
 * route.
 *
 * A single-page app serves one HTML file for every address, so all three would
 * otherwise describe the home page everywhere — in a search result and in the
 * visitor's tab bar alike.
 *
 * The canonical is written here rather than in index.html for that reason: a
 * static one pointing at the home page is worse than none, since it tells a
 * search engine that every page is a duplicate of one.
 */
export default function DocumentHead() {
  const { pathname } = useLocation()

  useEffect(() => {
    // An unmatched address falls back rather than keeping whatever title was
    // there, which would otherwise name the page the visitor came from.
    const meta = PAGE_META[pathname as RoutePath] ?? NOT_FOUND_META
    document.title = meta.title

    // A page the sitemap leaves out can still be found some other way — a link,
    // a referrer, a crawl of the site. Saying so here is what keeps it out of
    // results, rather than merely not inviting it in.
    setRobots(meta.indexable ? null : 'noindex, follow')
    setCanonical(meta.indexable ? `${SITE_URL}${pathname}` : null)
  }, [pathname])

  return null
}
