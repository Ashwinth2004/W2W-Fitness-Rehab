import { useEffect } from 'react'
import { SITE_URL } from '../lib/constants'

const DEFAULT_TITLE = 'W2W Fitness & Rehab — Way To Wellness | Mylapore, Chennai'
const DEFAULT_DESC =
  'W2W Fitness & Rehab, Mylapore Chennai — physiotherapy, sports injury recovery, Hatha yoga, lifestyle fitness and W2W Academy. Book your appointment online.'

// Upsert a <meta>/<link> tag identified by `key` (name/property/rel).
function upsert(tag, key, keyVal, attr, value) {
  let el = document.head.querySelector(`${tag}[${key}="${keyVal}"]`)
  if (!el) {
    el = document.createElement(tag)
    el.setAttribute(key, keyVal)
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

/**
 * Per-page SEO for this SPA — sets a unique <title>, description, canonical
 * URL, Open Graph + Twitter tags, an optional per-page image, and a robots
 * directive (use noindex for 404s / private views) on route change. Renders
 * nothing.
 */
export default function Seo({ title, description, path = '/', image, noindex = false }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | W2W Fitness & Rehab` : DEFAULT_TITLE
    const desc = description || DEFAULT_DESC
    const url = SITE_URL + (path === '/' ? '/' : path)

    document.title = fullTitle
    upsert('meta', 'name', 'description', 'content', desc)
    upsert('meta', 'property', 'og:title', 'content', fullTitle)
    upsert('meta', 'property', 'og:description', 'content', desc)
    upsert('meta', 'property', 'og:url', 'content', url)
    upsert('meta', 'name', 'twitter:title', 'content', fullTitle)
    upsert('meta', 'name', 'twitter:description', 'content', desc)
    upsert('link', 'rel', 'canonical', 'href', url)

    if (image) {
      const abs = image.startsWith('http') ? image : SITE_URL + image
      upsert('meta', 'property', 'og:image', 'content', abs)
      upsert('meta', 'name', 'twitter:image', 'content', abs)
    }

    // Reset to index,follow on real pages so navigating away from a noindex
    // (e.g. 404) page restores indexability.
    upsert('meta', 'name', 'robots', 'content', noindex ? 'noindex, follow' : 'index, follow')
  }, [title, description, path, image, noindex])

  return null
}
