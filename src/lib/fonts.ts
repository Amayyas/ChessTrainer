/**
 * Self-hosted fonts: Newsreader, a news serif, for everything. Bundled by Vite
 * rather than fetched from a CDN, which the Content-Security-Policy requires
 * (font-src 'self') and which avoids a render-blocking external request.
 *
 * The roman carries the optical-size axis, so headlines get the display cut and
 * body text the text cut from one file (132 KB of latin). The italic is
 * declared in src/index.css: the static regular of the same family, since
 * nothing is set in bold italic, and a page with no italic text never
 * downloads it.
 */
import '@fontsource-variable/newsreader/opsz.css'
