/**
 * HTML sanitization layer using DOMPurify.
 *
 * Run this on every piece of feed/article HTML *before* passing it to
 * html-react-parser. Removes XSS vectors, tracking scripts, and broken
 * markup that would otherwise crash React or leak data.
 *
 * Configuration goals:
 *  - Keep all structural/formatting HTML (headings, lists, tables, media)
 *  - Keep <iframe> only for known-safe video embeds (handled downstream)
 *  - Strip all JavaScript, event handlers, and dangerous protocols
 *  - Strip CSS expressions and javascript: in style attributes
 *  - Allow data-* attributes (many feeds use them legitimately)
 *  - FORCE_BODY to avoid <html>/<head> injection
 */

import DOMPurify from "dompurify"

// ─── DOMPurify configuration ─────────────────────────────────────────────────

const ALLOWED_TAGS = [
  // Text structure
  "a", "abbr", "address", "article", "aside",
  "b", "bdi", "bdo", "blockquote", "br",
  "caption", "cite", "code", "col", "colgroup",
  "data", "dd", "del", "details", "dfn", "div", "dl", "dt",
  "em",
  "figcaption", "figure", "footer",
  "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr",
  "i", "ins",
  "kbd",
  "li",
  "main", "mark",
  "nav",
  "ol",
  "p", "picture", "pre",
  "q",
  "rp", "rt", "ruby",
  "s", "samp", "section", "small", "source", "span", "strong", "sub", "summary", "sup",
  "table", "tbody", "td", "tfoot", "th", "thead", "time", "tr", "track",
  "u", "ul",
  "var",
  "wbr",
  // Media
  "audio", "img", "video",
  // Embeds (downstream renderer decides whether to render)
  "iframe",
]

const ALLOWED_ATTR = [
  // Universal
  "id", "class", "style", "title", "lang", "dir", "tabindex",
  // Links & media
  "href", "src", "srcset", "sizes", "alt", "width", "height",
  "loading", "decoding", "crossorigin", "referrerpolicy",
  "target", "rel", "type",
  // Media
  "controls", "autoplay", "muted", "loop", "preload", "poster",
  // Tables
  "colspan", "rowspan", "headers", "scope", "abbr",
  // Iframes (downstream sanitizes further)
  "allowfullscreen", "frameborder", "scrolling", "sandbox", "allow",
  // Semantic
  "datetime", "cite", "open",
  // Data attributes (feeds use these for lazy-load, etc.)
  "data-src", "data-srcset", "data-original", "data-url",
]

const PURIFY_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  // Prevent <html>/<head> injection wrapping
  FORCE_BODY: true,
  // Reject unknown URL protocols (blocks javascript:, vbscript:, data:text, …)
  ALLOW_UNKNOWN_PROTOCOLS: false,
  // Keep content inside removed tags (e.g. <script>text</script> → "text" stripped)
  KEEP_CONTENT: true,
  // Return a string, not a DOM node
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
}

// ─── Hook: strip javascript: from remaining href/src after tag processing ────

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  // Enforce safe URL schemes on all link/resource attributes
  const urlAttrs = ["href", "src", "action", "poster", "data", "cite"]
  for (const attr of urlAttrs) {
    if (node.hasAttribute(attr)) {
      const val = node.getAttribute(attr) ?? ""
      if (/^\s*(javascript|vbscript|data(?!:image))/i.test(val)) {
        node.removeAttribute(attr)
      }
    }
  }

  // Strip CSS expressions from inline styles
  if (node.hasAttribute("style")) {
    const style = node.getAttribute("style") ?? ""
    if (/expression\s*\(|javascript\s*:|vbscript\s*:/i.test(style)) {
      node.removeAttribute("style")
    }
  }
})

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Sanitize an HTML string from an untrusted RSS/article feed.
 *
 * Returns a sanitized HTML string safe to pass to html-react-parser.
 * Never throws — returns an empty string on any error.
 *
 * @param {string} html  Raw HTML from a feed entry
 * @returns {string}     Sanitized HTML
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== "string") return ""
  try {
    return DOMPurify.sanitize(html, PURIFY_CONFIG)
  } catch {
    return ""
  }
}
