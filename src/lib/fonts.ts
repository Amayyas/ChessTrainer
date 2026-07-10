/**
 * Self-hosted fonts (spec section 4.2): Playfair Display for headings,
 * Inter for body text. Bundled by Vite rather than fetched from a CDN, which
 * keeps the app self-contained and avoids a render-blocking external request.
 * Only the weights actually used are imported, to keep the payload small.
 */
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/playfair-display/600.css'
import '@fontsource/playfair-display/700.css'
