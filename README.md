# ReactFlux + Mercury + Miniflux

Self-hosted, full-text RSS reader stack.

| Component         | Role                               |
| ----------------- | ---------------------------------- |
| **ReactFlux**     | React SPA — the reading UI         |
| **Miniflux**      | RSS backend / feed aggregator      |
| **Mercury Proxy** | Full-article extraction sidecar    |
| **PostgreSQL**    | Miniflux database                  |
| **Caddy**         | Reverse proxy / static file server |

---

## Architecture

```
Browser
  │
  └─▶ ReactFlux (Caddy :2000)
          │
          ├─▶ /mercury/* ──▶ mercury-proxy:3001 (internal)
          │                       │
          │                       └─▶ @jocmp/mercury-parser
          │
          └─▶ Miniflux API (:8080, separate service)
```

---

## Ports

| Service           | Host port | Notes                                |
| ----------------- | --------- | ------------------------------------ |
| ReactFlux (Caddy) | `2000`    | configurable via `REACTFLUX_PORT`    |
| Miniflux          | `8080`    | configurable via `MINIFLUX_PORT`     |
| Mercury Proxy     | —         | internal only, proxied through Caddy |
| PostgreSQL        | —         | internal only                        |

---

## Requirements

- Docker ≥ 24
- Docker Compose v2 (`docker compose`, not `docker-compose`)

---

## Quick Start

### 1. Clone

```bash
git clone <repo-url>
cd <repo>
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env` and set secure passwords:

```env
POSTGRES_PASSWORD=your-strong-password
MINIFLUX_ADMIN_PASSWORD=your-strong-password
```

### 3. Start

```bash
docker compose up -d
```

First startup takes ~60 s while Miniflux runs database migrations.

### 4. Open

| Service   | URL                   |
| --------- | --------------------- |
| ReactFlux | http://localhost:2000 |
| Miniflux  | http://localhost:8080 |

Connect ReactFlux to Miniflux at the login screen using your configured credentials.

---

## Environment Variables

See [`.env.example`](.env.example) for the full list with documentation.

| Variable                  | Default    | Description                        |
| ------------------------- | ---------- | ---------------------------------- |
| `POSTGRES_PASSWORD`       | `changeme` | PostgreSQL / Miniflux DB password  |
| `MINIFLUX_ADMIN_USER`     | `admin`    | Miniflux admin username            |
| `MINIFLUX_ADMIN_PASSWORD` | `changeme` | Miniflux admin password            |
| `REACTFLUX_PORT`          | `2000`     | Host port for the ReactFlux UI     |
| `MINIFLUX_PORT`           | `8080`     | Host port for Miniflux             |
| `MERCURY_TIMEOUT_MS`      | `15000`    | Extraction timeout in milliseconds |

---

## Common Commands

```bash
# Start in background
docker compose up -d

# Watch logs
docker compose logs -f

# Rebuild images after code changes
docker compose build --no-cache && docker compose up -d

# Stop (keeps volumes/data)
docker compose down

# Stop and delete all data
docker compose down -v
```

---

## Development (hot reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

- ReactFlux served by Vite dev server on **http://localhost:3000** with HMR
- Mercury proxy exposed on **http://localhost:3001** for direct testing
- Source changes are reflected immediately without rebuilding the image

---

## Updating

```bash
git pull
docker compose build --no-cache
docker compose up -d
```

---

## LAN / Remote Access

Replace `localhost` with your server's IP or hostname.

For public access, put a TLS-terminating reverse proxy (Caddy, nginx, Traefik) in front and set the `MINIFLUX_BASE_URL` environment variable on the Miniflux service.

---

## Production Recommendations

- Set strong, unique passwords in `.env`
- Run behind HTTPS (Caddy with automatic TLS, nginx, Traefik)
- Schedule regular `pg_dump` backups of the `miniflux` database
- Pin image tags (e.g. `postgres:17-alpine`) rather than `latest`
- Enable Docker log rotation

---

## Persistence

All data lives in the `postgres_data` Docker volume. Containers can be recreated without data loss.

```bash
# Backup
docker exec <postgres-container> pg_dump -U miniflux miniflux > backup.sql

# Restore
docker exec -i <postgres-container> psql -U miniflux miniflux < backup.sql
```

---

## License

See [LICENSE](LICENSE).
