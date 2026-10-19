/**
 * Self-hosted fonts: Newsreader, a news serif, for everything. Bundled by Vite
 * rather than fetched from a CDN, which the Content-Security-Policy requires
 * (font-src 'self') and which avoids a render-blocking external request.
 *
 * The roman carries the optical-size axis, so headlines get the display cut and
 * body text the text cut from one file (132 KB of latin). The italic sets what
 * a paper sets in italic — captions, a standfirst's aside, a note under a
 * table — and carries weight alone (64.5 KB); a page with no italic text never
 * downloads it.
 */
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/newsreader/wght-italic.css'
