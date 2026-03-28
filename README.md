# Manus AI Clone

A full-featured AI chat application that replicates the Manus AI interface with dark-mode UI, streaming responses, Supabase persistence, and comprehensive backend services.

## Live Demo
- **Sandbox**: https://3000-iigb1ekl5c706e88310af-ea026bf9.sandbox.novita.ai
- **Documentation**: https://3000-iigb1ekl5c706e88310af-ea026bf9.sandbox.novita.ai/docs

## Autonomous Agentic System Documentation

The `/docs` route provides a comprehensive interactive documentation system including:
- **6-Layer Architecture Overview** with visual diagrams
- **Detailed Reports** for each layer (Security, Persistence, Payments, AI Engine, Frontend, Deployment)
- **Process Diagrams** (request lifecycle, error handling matrix, data flow, ERD)
- **Step-by-Step Implementation Plans** with phase tracking
- **Risk-Free Incremental Execution Strategies** with rollback procedures
- **Live System Status** with real-time health checks

## Architecture Overview

### 4 Core Systems Implemented

#### 1. Security & API Protection
- **API keys NEVER exposed to frontend** - all external calls (OpenAI, Stripe, LemonSqueezy, Supabase) go through server-side proxy routes in Hono
- **Environment variable management**: `.dev.vars` for local dev, Cloudflare Secrets for production (`wrangler secret put`)
- **Rate limiting**: In-memory per-IP rate limiting (30 req/60s window)
- **Input sanitization**: All user inputs sanitized and length-limited
- **CORS**: Configured for API routes only with proper headers

#### 2. Persistence (Supabase PostgreSQL)
- **Supabase** as the primary persistent storage (replaces Cloudflare D1)
- **Tables**: `profiles` (credits, settings, plan), `conversations`, `messages`, `usage_history`
- **Database-first approach**: All data is fetched from Supabase on app load - NO localStorage for data
- **Cross-device sync**: Users can access their chats from ANY device with the same userId
- **Graceful fallback**: If Supabase is unreachable, app runs in offline mode
- **Server-side only**: Supabase service key stored as env var, never exposed to client
- **PostgREST API**: All DB operations go through Supabase REST API (no SDK dependency)

#### 3. Real-World Credit System (Stripe + LemonSqueezy)
- **Stripe primary, LemonSqueezy fallback** - dual payment provider support
- **Server-side checkout session creation** - no payment keys on client
- **Webhook handlers** for both providers
- **Demo mode**: Auto-activates when no payment keys configured
- **Credit costs**: Standard=15, Pro=45, Lite=8 per message
- **Plans**: Starter ($9.99 / 5,000 credits), Pro ($29.99 / 20,000 credits)

#### 4. Edge Cases & Error Handling
- **Model fallback chain**: Requested model -> gpt-5-mini -> gpt-5-nano -> local offline fallback
- **Offline intelligence**: Smart response generator for when all API calls fail
- **Custom error UI**: Distinct error cards for credits exhausted, rate limited, API down, generic errors
- **API error overlay**: Full-screen warning after 3+ consecutive API failures
- **Retry buttons**: One-click retry on all error messages

## Supabase Setup

### 1. Create Tables
Run the SQL in `supabase/schema.sql` in your Supabase SQL Editor:

```sql
-- Tables created:
-- profiles: user credits, settings, plan (linked by user_id)
-- conversations: chat sessions (linked to profiles via user_id)
-- messages: individual messages (linked to conversations)
-- usage_history: credit usage tracking (linked to profiles)
```

### 2. Get Credentials
From your Supabase Dashboard -> Project Settings -> API:
- **Project URL** (`SUPABASE_URL`): `https://your-project.supabase.co`
- **Service Role Key** (`SUPABASE_SERVICE_KEY`): `eyJ...` (the `service_role` key, NOT `anon`)

### 3. Configure Environment
```bash
# .dev.vars (local development)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...your-service-role-key

# Production (Cloudflare Secrets)
npx wrangler pages secret put SUPABASE_URL --project-name manus-ai-clone
npx wrangler pages secret put SUPABASE_SERVICE_KEY --project-name manus-ai-clone
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Main SPA shell |
| GET | `/api/health` | Service health check (AI, Supabase, Stripe, LS) |
| GET | `/api/models` | Available AI models with credit costs |
| POST | `/api/chat` | AI chat proxy with streaming (SSE) |
| GET | `/api/payment/plans` | Pricing plans |
| POST | `/api/payment/checkout` | Create checkout session |
| POST | `/api/payment/stripe-webhook` | Stripe webhook handler |
| POST | `/api/payment/ls-webhook` | LemonSqueezy webhook handler |
| POST | `/api/db/conversations` | Save conversations to Supabase |
| GET | `/api/db/conversations/:userId` | Load conversations from Supabase |
| DELETE | `/api/db/conversations/:convId` | Delete conversation |
| GET | `/api/db/profile/:userId` | Load user profile (credits, settings, history) |
| POST | `/api/db/profile` | Update user profile |
| GET | `/api/db/credits/:userId` | Load credits (backward compat) |
| POST | `/api/db/credits` | Update credits (backward compat) |
| POST | `/api/db/settings` | Save user settings |
| GET | `/api/db/settings/:userId` | Load user settings |

## Data Architecture

### Supabase Tables

```
profiles
  id TEXT PK          -- user_id
  email TEXT
  name TEXT
  plan TEXT            -- 'free', 'starter', 'pro'
  credits INTEGER      -- current credit balance
  total_credits INTEGER -- lifetime credits earned
  settings JSONB       -- user preferences
  created_at, updated_at

conversations
  id TEXT PK           -- conversation_id
  user_id TEXT FK -> profiles.id
  title TEXT
  created_at, updated_at

messages
  id BIGSERIAL PK
  conversation_id TEXT FK -> conversations.id (CASCADE DELETE)
  role TEXT             -- 'user', 'assistant', 'system'
  content TEXT
  model TEXT
  created_at

usage_history
  id BIGSERIAL PK
  user_id TEXT FK -> profiles.id
  detail TEXT
  change_amount INTEGER
  type TEXT             -- 'usage', 'bonus', 'purchase', 'refund'
  created_at
```

## Tech Stack
- **Backend**: Hono (TypeScript, Edge-first)
- **Frontend**: Vanilla JS, Tailwind CSS, FontAwesome, Highlight.js, Marked.js
- **Database**: Supabase PostgreSQL (via PostgREST API)
- **AI**: OpenAI-compatible API (proxied server-side)
- **Payments**: Stripe + LemonSqueezy (server-side only)
- **Deployment**: Cloudflare Pages + Workers

## Environment Variables

```bash
# Required
OPENAI_API_KEY=your-key
OPENAI_BASE_URL=https://api.openai.com/v1

# Required for persistence
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...service-role-key

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
npm run dev:sandbox  # Start with wrangler pages dev

# Or with PM2 (sandbox):
pm2 start ecosystem.config.cjs
```

## Production Deployment
```bash
# 1. Set up Supabase (run supabase/schema.sql in SQL Editor)

# 2. Set secrets
npx wrangler pages secret put OPENAI_API_KEY --project-name manus-ai-clone
npx wrangler pages secret put SUPABASE_URL --project-name manus-ai-clone
npx wrangler pages secret put SUPABASE_SERVICE_KEY --project-name manus-ai-clone

# 3. Deploy
npm run deploy
```

## Features
- Dark-mode Manus-style UI
- AI chat with streaming responses
- **Supabase PostgreSQL persistence** (cross-device sync)
- Thinking animation with execution steps
- Sidebar conversation history (grouped by date)
- Model selector (Standard/Pro/Lite) with credit costs
- Settings modal (Account, Usage, Billing, General tabs)
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
├── supabase/
│   └── schema.sql         # Database schema (run in Supabase SQL Editor)
├── .dev.vars              # Local environment variables
├── ecosystem.config.cjs   # PM2 configuration
├── wrangler.jsonc         # Cloudflare configuration
├── package.json           # Dependencies
└── README.md              # This file
```

## Migration from D1 to Supabase

This project was migrated from Cloudflare D1 to Supabase PostgreSQL:

| Before (D1) | After (Supabase) |
|---|---|
| localStorage + optional D1 sync | Supabase-first, no localStorage for data |
| Manual sync toggle in settings | Always synced (automatic) |
| Browser-only without sync | Cross-device access by default |
| D1 SQLite (Cloudflare-only) | Supabase PostgreSQL (any provider) |
| `DB: D1Database` binding | `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` env vars |
| 6 separate tables | 4 optimized tables (`profiles` merges users+credits+settings) |
