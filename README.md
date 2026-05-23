# ReactFlux + Mercury + Miniflux

Production-ready self-hosted RSS reader with:

* ReactFlux frontend
* Miniflux backend
* Mercury Parser full-article extraction
* PostgreSQL database
* Docker Compose deployment

---

# Features

* Full-text article extraction
* Clean React-based UI
* Miniflux backend compatibility
* Docker-based deployment
* ARM64 compatible
* LAN accessible
* Mercury fallback integration
* Production-ready architecture

---

# Architecture

```text
Browser
   ↓
ReactFlux (Caddy)
   ↓
/mercury/parse
   ↓
Mercury Proxy
   ↓
@jocmp/mercury-parser
   ↓
Extracted Full Article
```

Backend services:

```text
ReactFlux
Mercury Proxy
Miniflux
PostgreSQL
```

---

# Ports

| Service       | Port          |
| ------------- | ------------- |
| ReactFlux     | 2000          |
| Miniflux      | 8080          |
| Mercury Proxy | internal only |
| PostgreSQL    | internal only |

---

# Requirements

* Docker
* Docker Compose

Recommended:

* Docker Desktop
* Linux
* WSL2

---

# Quick Start

## 1. Clone repository

```bash
git clone <repo-url>
cd ReactFlux
```

---

## 2. Create `.env`

```env
POSTGRES_PASSWORD=changeme
MINIFLUX_ADMIN_USER=admin
MINIFLUX_ADMIN_PASSWORD=changeme
REACTFLUX_PORT=2000
MINIFLUX_PORT=8080
```

---

## 3. Build containers

```bash
docker compose build --no-cache
```

---

## 4. Start stack

```bash
docker compose up -d
```

---

## 5. Open services

## ReactFlux

```text
http://localhost:2000
```

## Miniflux

```text
http://localhost:8080
```

---

# Default Workflow

## ReactFlux UI

ReactFlux is the main frontend UI.

When opening articles:

1. ReactFlux requests full content
2. Request goes to `/mercury/parse`
3. Mercury extracts article body
4. Full content is displayed inside ReactFlux

---

# Mercury API

Internal API endpoint:

```text
GET /parse?url=<article_url>
```

Example:

```text
http://localhost:3001/parse?url=https://example.com
```

Example response:

```json
{
  "title": "Example Domain",
  "content": "<div>...</div>",
  "excerpt": "Example excerpt",
  "author": null,
  "date_published": null,
  "lead_image_url": null,
  "url": "https://example.com"
}
```

This endpoint allows:

* future integrations
* AI summarization
* article caching
* custom frontends
* external automation

---

# Docker Services

## ReactFlux

Frontend UI served through Caddy.

Accessible publicly:

```text
http://localhost:2000
```

---

## Mercury Proxy

Node.js HTTP sidecar using:

```text
@jocmp/mercury-parser
```

Provides article extraction API.

Internal Docker service only.

---

## Miniflux

RSS backend service.

Accessible publicly:

```text
http://localhost:8080
```

---

## PostgreSQL

Database for Miniflux.

Persistent Docker volume storage enabled.

---

# Useful Commands

## Start

```bash
docker compose up -d
```

## Stop

```bash
docker compose down
```

## Rebuild

```bash
docker compose build --no-cache
```

## Logs

```bash
docker compose logs -f
```

## Running containers

```bash
docker ps
```

---

# Updating

## Pull latest changes

```bash
git pull
```

## Rebuild

```bash
docker compose build --no-cache
```

## Restart

```bash
docker compose up -d
```

---

# Persistence

Database data is stored in Docker volumes.

Containers can be recreated safely.

---

# LAN Access

Replace `localhost` with server IP.

Example:

```text
http://192.168.1.9:2000
```

---

# Development Notes

## Important Mercury Route

Frontend uses:

```text
/mercury/parse
```

Caddy internally proxies this to:

```text
http://mercury-proxy:3001
```

This avoids browser CORS issues and keeps Mercury internal-only.

---

# Production Notes

Recommended:

* reverse proxy
* HTTPS
* regular backups
* external PostgreSQL backups

Optional future improvements:

* Redis cache
* AI summarization
* Readability fallback
* article archiving
* search indexing

---

# Stack Summary

```text
ReactFlux
+ Mercury Parser
+ Miniflux
+ PostgreSQL
+ Docker Compose
+ Caddy
```

Production-ready self-hosted full-text RSS platform.
