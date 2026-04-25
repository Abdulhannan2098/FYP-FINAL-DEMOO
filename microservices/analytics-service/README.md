---
title: AutoSphere Analytics Service
emoji: 📊
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
short_description: Read-only analytics microservice for AutoSphere platform
---

# AutoSphere — Analytics Service

Python/FastAPI microservice that exposes aggregated analytics from the AutoSphere MongoDB database. **Read-only** — cannot modify any data.

## Endpoints

| Method | Path | Query Params | Description |
|--------|------|--------------|-------------|
| `GET` | `/health` | — | Health + DB connectivity check |
| `GET` | `/api/analytics/overview` | — | Users, products, orders, revenue totals |
| `GET` | `/api/analytics/orders` | `days=30` | Order breakdown by status + daily revenue |
| `GET` | `/api/analytics/products` | — | Product stats by category, approval, AR-ready |
| `GET` | `/api/analytics/users` | `days=30` | User growth, roles, auth providers |
| `GET` | `/api/analytics/revenue` | `days=30` | Monthly revenue + top vendors |

All `/api/*` endpoints require header `X-API-Key: <your-key>`.

## Required Space Secrets

Set these in **Settings → Variables and secrets** of this Space:

| Secret | Description |
|--------|-------------|
| `API_KEY` | Shared key between monolith and this service |
| `MONGODB_URI` | Full MongoDB connection string (read-only user recommended) |

## Interactive Docs

Visit `/docs` on this Space for the full Swagger UI.
