import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import type { RoutePath } from '@/routes'
import { PAGE_META } from '@/seo'

const SITE_URL = (import.meta.env.VITE_SITE_URL ?? '').replace(/\/$/, '')

/**
 * Keeps the document title and canonical URL in step with the route.
 *
 * A single-page app serves one HTML file for every address, so both would
 * otherwise describe the home page everywhere — including in a search result
 * and in the visitor's list of tabs.
 *
 * The canonical is written here rather than in index.html for the same reason:
 * a static one pointing at the home page is worse than none at all, since it
 * tells a search engine that every page is a duplicate of one. With no domain
 * configured it is left out entirely rather than made relative, which is not a
 * thing a canonical may be.
 */
export default function DocumentHead() {
  const { pathname } = useLocation()

  useEffect(() => {
    const meta = PAGE_META[pathname as RoutePath]
    if (meta) document.title = meta.title

    if (!SITE_URL) return
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = `${SITE_URL}${pathname}`
  }, [pathname])

  return null
}
