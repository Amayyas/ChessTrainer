/**
 * Self-hosted fonts: Newsreader, a news serif, for everything. Bundled by Vite
 * rather than fetched from a CDN, which the Content-Security-Policy requires
 * (font-src 'self') and which avoids a render-blocking external request.
 *
 * The roman carries the optical-size axis, so headlines get the display cut and
 * body text the text cut from one file (132 KB of latin). There is no italic:
 * nothing is set in it yet. It comes with the first text that is, and with
 * fallback faces measured for it.
 */
import '@fontsource-variable/newsreader/opsz.css'
