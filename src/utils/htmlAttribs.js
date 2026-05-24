/**
 * HTML → React attribute normalization pipeline.
 *
 * Converts raw DOM node `.attribs` objects (from html-react-parser) into
 * safe, React-compatible prop objects. Never passes raw HTML attributes
 * directly to JSX — doing so causes crashes like the infamous
 * "The `style` prop expects a mapping from style properties to values,
 * not a string."
 *
 * Stages:
 *  1. Drop all event-handler attributes (onclick, onload, …)
 *  2. Convert `style` strings → React style objects (camelCase properties)
 *  3. Sanitize `href`, `src`, `action`, `poster` — reject javascript:/vbscript:
 *  4. Rename HTML attribute names to their React equivalents (class→className, …)
 *  5. For <img> specifically, enforce an allowlist and inject lazy-loading defaults
 */

// ─── CSS string → React style object ────────────────────────────────────────

/** Known-dangerous CSS value patterns (CSS expressions, JS protocol, etc.). */
const DANGEROUS_CSS_VALUE = /expression\s*\(|javascript\s*:|vbscript\s*:|behavior\s*:/i

/**
 * Convert a raw inline CSS string (e.g. `"width:100%; color:red"`) into a
 * React-safe style object (`{ width: "100%", color: "red" }`).
 *
 * - Silently drops malformed declarations.
 * - Silently drops declarations with dangerous values.
 * - Never throws.
 */
export function parseStyleString(styleStr) {
  if (!styleStr || typeof styleStr !== "string") {return {}}

  const result = {}
  try {
    for (const declaration of styleStr.split(";")) {
      const colonIdx = declaration.indexOf(":")
      if (colonIdx < 1) {continue}

      const rawProp = declaration.slice(0, colonIdx).trim()
      const rawVal = declaration.slice(colonIdx + 1).trim()

      if (!rawProp || !rawVal) {continue}
      if (DANGEROUS_CSS_VALUE.test(rawVal)) {continue}

      // kebab-case → camelCase  (e.g. background-color → backgroundColor)
      const camelProp = rawProp.replaceAll(/-([a-z])/g, (_, c) => c.toUpperCase())
      result[camelProp] = rawVal
    }
  } catch {
    // Malformed CSS — return whatever we managed to collect
  }
  return result
}

// ─── URL sanitization ────────────────────────────────────────────────────────

/** Allowed URL schemes. data: is restricted to image/* only. */
const SAFE_URL = /^(https?:|mailto:|tel:|\/|#|data:image\/)/i

/**
 * Return `url` if it uses a safe scheme, otherwise return `""`.
 * Strips leading/trailing whitespace and rejects javascript: / vbscript:.
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== "string") {return ""}
  const trimmed = url.trim()
  return SAFE_URL.test(trimmed) ? trimmed : ""
}

// ─── HTML attribute name → React prop name ───────────────────────────────────

/**
 * Mapping of lowercase HTML attribute names to their React prop equivalents.
 * Only attributes that differ between HTML and React need entries here.
 */
const ATTR_TO_PROP = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  readonly: "readOnly",
  maxlength: "maxLength",
  minlength: "minLength",
  contenteditable: "contentEditable",
  crossorigin: "crossOrigin",
  datetime: "dateTime",
  enctype: "encType",
  colspan: "colSpan",
  rowspan: "rowSpan",
  usemap: "useMap",
  frameborder: "frameBorder",
  accesskey: "accessKey",
  allowfullscreen: "allowFullScreen",
  autocomplete: "autoComplete",
  autofocus: "autoFocus",
  autoplay: "autoPlay",
  cellpadding: "cellPadding",
  cellspacing: "cellSpacing",
  spellcheck: "spellCheck",
  srcset: "srcSet",
  referrerpolicy: "referrerPolicy",
  inputmode: "inputMode",
  enterkeyhint: "enterKeyHint",
  novalidate: "noValidate",
  formnovalidate: "formNoValidate",
  hreflang: "hrefLang",
  acceptcharset: "acceptCharset",
}

/** Attributes whose values are URLs and must be sanitized. */
const URL_ATTRS = new Set(["href", "src", "action", "poster", "data", "cite", "background"])

/** Pattern matching any HTML event-handler attribute. */
const EVENT_HANDLER_RE = /^on[a-z]/

// ─── General attribute normalizer ────────────────────────────────────────────

/**
 * Convert a raw `.attribs` object from html-react-parser into React-safe props.
 *
 *  - Strips all event handlers (onclick, onload, …)
 *  - Converts `style` strings to React style objects
 *  - Sanitizes URL attributes
 *  - Renames attributes to their React prop equivalents
 *
 * @param {Record<string,string>} attribs  Raw attribs from a DOM node
 * @returns {Record<string,unknown>}       React-safe props object
 */
export function normalizeAttribs(attribs = {}) {
  const props = {}
  try {
    for (const [rawKey, value] of Object.entries(attribs)) {
      const key = rawKey.toLowerCase()

      // 1. Drop event handlers
      if (EVENT_HANDLER_RE.test(key)) {continue}

      // 2. Convert style strings to objects
      if (key === "style") {
        props.style = typeof value === "string" ? parseStyleString(value) : (value ?? {})
        continue
      }

      // 3. Sanitize URL attributes
      if (URL_ATTRS.has(key)) {
        const safe = sanitizeUrl(value)
        if (safe) {props[ATTR_TO_PROP[key] ?? key] = safe}
        continue
      }

      // 4. Rename to React prop name
      props[ATTR_TO_PROP[key] ?? key] = value
    }
  } catch {
    // Defensive: return whatever we collected
  }
  return props
}

// ─── Image-specific attribute normalizer ─────────────────────────────────────

/**
 * Attributes allowed on <img> elements.
 * Anything not in this set is silently dropped — keeping only what React
 * actually supports and what is safe to forward from untrusted feed HTML.
 */
const IMG_ATTR_ALLOWLIST = new Set([
  "src",
  "alt",
  "width",
  "height",
  "srcset",
  "sizes",
  "loading",
  "decoding",
  "crossorigin",
  "referrerpolicy",
  "style",
  "title",
])

/**
 * Convert raw image node `.attribs` into React-safe img props.
 *
 *  - Enforces an allowlist (drops tracking pixels' `data-` hacks, etc.)
 *  - Sanitizes `src`
 *  - Converts `style` string to object
 *  - Renames HTML attrs to React equivalents
 *  - Injects `loading="lazy"` and `decoding="async"` unless already set
 *
 * @param {Record<string,string>} attribs  Raw attribs from an img DOM node
 * @returns {Record<string,unknown>}       React-safe props object
 */
export function normalizeImgAttribs(attribs = {}) {
  const props = {}
  try {
    for (const [rawKey, value] of Object.entries(attribs)) {
      const key = rawKey.toLowerCase()
      if (!IMG_ATTR_ALLOWLIST.has(key)) {continue}

      switch (key) {
        case "src": {
          props.src = sanitizeUrl(value)
          break
        }
        case "srcset": {
          props.srcSet = value
          break
        }
        case "crossorigin": {
          props.crossOrigin = value
          break
        }
        case "referrerpolicy": {
          props.referrerPolicy = value
          break
        }
        case "style": {
          props.style = typeof value === "string" ? parseStyleString(value) : (value ?? {})
          break
        }
        default: {
          props[key] = value
        }
      }
    }
  } catch {
    // Defensive: return whatever we collected
  }

  // Performance defaults for feed images
  props.loading ??= "lazy"
  props.decoding ??= "async"

  return props
}
