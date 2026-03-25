# Manus AI Clone

A full-featured AI chat application that replicates the Manus AI interface with dark-mode UI, streaming responses, and comprehensive backend services.

## Live Demo
- **Sandbox**: https://3000-iigb1ekl5c706e88310af-ea026bf9.sandbox.novita.ai

## Architecture Overview

### 4 Core Systems Implemented

#### 1. Security & API Protection
- **API keys NEVER exposed to frontend** - all external calls (OpenAI, Stripe, LemonSqueezy) go through server-side proxy routes in Hono
- **Environment variable management**: `.dev.vars` for local dev, Cloudflare Secrets for production (`wrangler secret put`)
- **Rate limiting**: In-memory per-IP rate limiting (30 req/60s window)
- **Input sanitization**: All user inputs sanitized and length-limited
- **CORS**: Configured for API routes only with proper headers
- **Request tracking**: X-RateLimit-Remaining header on all API responses

#### 2. Persistence (D1 Database + localStorage)
- **Cloudflare D1** (SQLite) as the primary persistent storage
- **localStorage** as instant offline fallback
- **Tables**: `users`, `conversations`, `messages`, `credits`, `usage_history`, `settings`
- **Dual-write strategy**: Always saves to localStorage; if sync enabled, also saves to D1
- **On load**: Tries D1 first, falls back to localStorage
- **Toggle**: Users can enable/disable cloud sync via Settings > General
- **DB Status badge**: Shows sync status in header (green=synced, amber=offline)

#### 3. Real-World Credit System (Stripe + LemonSqueezy)
- **Stripe primary, LemonSqueezy fallback** - dual payment provider support
- **Server-side checkout session creation** - no payment keys on client
- **Webhook handlers** for both providers (`/api/payment/stripe-webhook`, `/api/payment/ls-webhook`)
- **Demo mode**: Auto-activates when no payment keys configured; simulates purchases
- **Credit costs**: Standard=15, Pro=45, Lite=8 per message
- **Plans**: Starter ($9.99 / 5,000 credits), Pro ($29.99 / 20,000 credits)
- **Credit tracking**: Progress bar, color indicators (red when low), usage history

#### 4. Edge Cases & Error Handling
- **Model fallback chain**: Requested model -> gpt-5-mini -> gpt-5-nano -> local offline fallback
- **Offline intelligence**: Smart response generator for when all API calls fail
- **Custom error UI**: Distinct error cards for credits exhausted, rate limited, API down, generic errors
- **API error overlay**: Full-screen warning after 3+ consecutive API failures
- **Fallback badge**: Shows in header when using non-primary model
- **Retry buttons**: One-click retry on all error messages
- **30s timeout**: Per API request to prevent hanging

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Main SPA shell |
| GET | `/api/health` | Service health check (AI, DB, Stripe, LS status) |
| GET | `/api/models` | Available AI models with credit costs |
| POST | `/api/chat` | AI chat proxy with streaming (SSE) |
| GET | `/api/payment/plans` | Pricing plans |
| POST | `/api/payment/checkout` | Create checkout session |
| POST | `/api/payment/stripe-webhook` | Stripe webhook handler |
| POST | `/api/payment/ls-webhook` | LemonSqueezy webhook handler |
| POST | `/api/db/conversations` | Save conversations to D1 |
| GET | `/api/db/conversations/:userId` | Load conversations from D1 |
| DELETE | `/api/db/conversations/:convId` | Delete conversation from D1 |
| POST | `/api/db/credits` | Save credits/usage to D1 |
| GET | `/api/db/credits/:userId` | Load credits from D1 |
| POST | `/api/db/settings` | Save user settings to D1 |
| GET | `/api/db/settings/:userId` | Load user settings from D1 |

## Tech Stack
- **Backend**: Hono (TypeScript, Edge-first)
- **Frontend**: Vanilla JS, Tailwind CSS, FontAwesome, Highlight.js, Marked.js
- **Database**: Cloudflare D1 (SQLite)
- **AI**: OpenAI-compatible API (proxied server-side)
- **Payments**: Stripe + LemonSqueezy (server-side only)
- **Deployment**: Cloudflare Pages + Workers

## Environment Variables

```bash
# Required
OPENAI_API_KEY=your-key
OPENAI_BASE_URL=https://api.openai.com/v1

# Optional: Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...

# Optional: LemonSqueezy
LEMONSQUEEZY_API_KEY=...
LEMONSQUEEZY_WEBHOOK_SECRET=...
LEMONSQUEEZY_STORE_ID=...
```

## Local Development
```bash
npm install
npm run build
npm run dev:d1  # Start with D1 local database

# Or with PM2 (sandbox):
pm2 start ecosystem.config.cjs
```

## Production Deployment
```bash
# 1. Create D1 database
npx wrangler d1 create manus-ai-db
# Update database_id in wrangler.jsonc

# 2. Set secrets
npx wrangler pages secret put OPENAI_API_KEY --project-name manus-ai-clone
npx wrangler pages secret put STRIPE_SECRET_KEY --project-name manus-ai-clone

# 3. Deploy
npm run deploy
```

## Features
- Dark-mode Manus-style UI
- AI chat with streaming responses
- Thinking animation with execution steps
- Sidebar conversation history (grouped by date)
- Model selector (Standard/Pro/Lite) with credit costs
- Settings modal (Account, Usage, Billing, General tabs)
- Cloud sync toggle (D1 database)
- Payment integration (Stripe/LemonSqueezy or demo mode)
- Credits system with progress bar and usage history
- Quick-action cards (slides, website, apps, design)
- Markdown rendering with syntax highlighting and code copy
- Responsive mobile design
- Keyboard shortcuts (Ctrl+K, Escape)
- Toast notification system
- Error handling with retry buttons
- Auto-fallback to Lite model on API failure

## Project Structure
```
webapp/
├── src/
│   └── index.tsx          # Hono backend + HTML shell
├── public/static/
│   ├── app.js             # Frontend JavaScript
│   └── style.css          # Custom CSS
├── .dev.vars              # Local environment variables
├── ecosystem.config.cjs   # PM2 configuration
├── wrangler.jsonc         # Cloudflare configuration
├── package.json           # Dependencies
└── README.md              # This file
```
