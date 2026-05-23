'use strict'

const http = require('node:http')
const Parser = require('@jocmp/mercury-parser')

const PORT = parseInt(process.env.PORT || '3001', 10)
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '15000', 10)

// Allowlist of protocols to prevent SSRF against internal services
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const reqUrl = new URL(req.url, `http://localhost:${PORT}`)

  // Health check
  if (reqUrl.pathname === '/health') {
    sendJson(res, 200, { ok: true })
    return
  }

  if (reqUrl.pathname !== '/parse' || req.method !== 'GET') {
    sendJson(res, 404, { error: 'Not found' })
    return
  }

  const articleUrl = reqUrl.searchParams.get('url')
  if (!articleUrl) {
    sendJson(res, 400, { error: 'url query parameter is required' })
    return
  }

  // Validate URL + block non-http(s) to prevent SSRF
  let parsed
  try {
    parsed = new URL(articleUrl)
  } catch {
    sendJson(res, 400, { error: 'Invalid URL' })
    return
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    sendJson(res, 400, { error: 'Only http and https URLs are allowed' })
    return
  }

  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    if (!res.headersSent) {
      sendJson(res, 504, { error: 'Parse timed out' })
    }
  }, TIMEOUT_MS)

  try {
    const result = await Parser.parse(articleUrl, { contentType: 'html' })
    clearTimeout(timer)
    if (timedOut || res.headersSent) return

    if (result.error) {
      sendJson(res, 422, { error: result.message || 'Parse failed' })
      return
    }

    sendJson(res, 200, {
      title: result.title ?? null,
      content: result.content ?? null,
      excerpt: result.excerpt ?? null,
      author: result.author ?? null,
      date_published: result.date_published ?? null,
      lead_image_url: result.lead_image_url ?? null,
      url: result.url ?? articleUrl,
    })
  } catch (err) {
    clearTimeout(timer)
    if (!timedOut && !res.headersSent) {
      sendJson(res, 502, { error: err.message || 'Parse failed' })
    }
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`mercury-proxy listening on :${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => process.exit(0))
})
