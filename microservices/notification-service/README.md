---
title: AutoSphere Notification Service
emoji: 📧
colorFrom: red
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
short_description: Email notification microservice for AutoSphere platform
---

# AutoSphere — Notification Service

Python/FastAPI microservice that handles all email delivery for the AutoSphere e-commerce platform.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/notify/welcome` | Welcome email |
| `POST` | `/api/notify/email-verification` | Email OTP |
| `POST` | `/api/notify/password-reset` | Password reset OTP |
| `POST` | `/api/notify/password-changed` | Security notice |
| `POST` | `/api/notify/order-confirmation` | Order confirmation |
| `POST` | `/api/notify/order-status` | Order status update |
| `POST` | `/api/notify/vendor-registration` | Vendor application received |
| `POST` | `/api/notify/vendor-decision` | Vendor approved/rejected |
| `POST` | `/api/notify/vendor-verification-approved` | Vendor verified |
| `POST` | `/api/notify/vendor-verification-failed` | Verification failed |
| `POST` | `/api/notify/product-approved` | Product live notification |
| `POST` | `/api/notify/product-rejected` | Product rejected notification |
| `POST` | `/api/notify/new-order` | New order alert for vendor |

All `/api/*` endpoints require header `X-API-Key: <your-key>`.

## Required Space Secrets

Set these in **Settings → Variables and secrets** of this Space:

| Secret | Description |
|--------|-------------|
| `API_KEY` | Shared key between monolith and this service |
| `EMAIL_USER` | Gmail address used as sender |
| `EMAIL_PASSWORD` | Gmail App Password |
| `EMAIL_FROM` | Display from address (optional) |
| `FRONTEND_URL` | Frontend URL for email links |

## Interactive Docs

Visit `/docs` on this Space for the full Swagger UI.
