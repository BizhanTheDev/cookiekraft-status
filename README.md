# CookieKraft Status

A simple Next.js + Vercel KV status page that tracks online players and session history.

## What you set in Vercel (Environment Variables)
- STATUS_API_URL
- CRON_SECRET

## Endpoints
- GET /api/status
- POST /api/cron/poll (requires header: x-cron-secret)
