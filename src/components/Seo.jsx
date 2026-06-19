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
 * URL and Open Graph title/description/url on route change. Renders nothing.
 */
export default function Seo({ title, description, path = '/' }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | W2W Fitness & Rehab` : DEFAULT_TITLE
    const desc = description || DEFAULT_DESC
    const url = SITE_URL + (path === '/' ? '/' : path)

    document.title = fullTitle
    upsert('meta', 'name', 'description', 'content', desc)
    upsert('meta', 'property', 'og:title', 'content', fullTitle)
    upsert('meta', 'property', 'og:description', 'content', desc)
    upsert('meta', 'property', 'og:url', 'content', url)
    upsert('link', 'rel', 'canonical', 'href', url)
  }, [title, description, path])

  return null
}
