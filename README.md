# General Boss AI - Autonomous Agentic System

An autonomous AI agent that evolves from chat assistant to task execution engine. Features a 6-layer architecture with dark-mode Manus-style UI, streaming AI responses, Supabase persistence, and multimodal output rendering.

## Live Demo
- **App**: https://3000-iigb1ekl5c706e88310af-ea026bf9.sandbox.novita.ai
- **Documentation**: https://3000-iigb1ekl5c706e88310af-ea026bf9.sandbox.novita.ai/docs

## Phase 4: Agentic Execution System (Current)

### What's New
Phase 4 transforms the chat-based assistant into an **Agentic Execution System** with:

1. **Agentic Planning (L4)** - Task decomposition engine, real-time "Thinking Process" UI panel, Agent Mode toggle for deep execution tasks
2. **Multimodal Output Rendering (L5)** - Slides Generator (Markdown-to-slide with 16:9 preview), Web Designer (HTML preview with sandbox iframe + device toggle)
3. **Asynchronous Task Tracking (L2 & L3)** - In-memory task state tracking (Pending/Executing/Success/Failed), notification system with bell + panel
4. **Manus-Style UI/UX** - Landing page greeting "What can I do for you?", 4 quick-action cards + 4 secondary pills, dark-mode aesthetic, mobile responsiveness

### Phase 4 Features Completed
- Landing page with animated robot icon and gradient heading
- Quick-action cards: [Create Slides], [Build Website], [Automate Apps], [Design Concepts]
- Secondary actions: Research, Data Analysis, Writing, Marketing
- Agent Mode toggle in sidebar with glow effects and header badge
- Task decomposition for 5 categories (presentations, websites, automation, design, general)
- Thinking Process UI panel with animated step progression and status badges
- Slides Generator: detect `## Slide N:` patterns, parse and render, full-screen preview modal with keyboard nav (Left/Right arrows)
- Web Designer Preview: detect HTML code blocks, miniature preview card, full-screen sandboxed iframe with desktop/mobile toggle
- Notification system: bell icon with unread badge, slide-out panel, categorized alerts (info/success/warning/error)
- Settings > Tasks tab for agent task tracking with status badges
- Agent execution panel with distinct gradient background and pulse-glow animations
- Documentation (/docs) updated with Phase 4 section and "Agentic Execution" nav item

## 6-Layer Architecture

| Layer | Name | Status | Key Components |
|-------|------|--------|----------------|
| L1 | Security & API Protection | 95% | Rate limiting, CORS, sanitization, env secrets |
| L2 | Data Persistence (Supabase) | 80% | PostgreSQL via PostgREST, task state tracking |
| L3 | Credit & Payment System | 80% | Stripe + LemonSqueezy, demo mode, per-model costs |
| L4 | AI Processing & Agentic Planning | 90% | Task decomposition, fallback chain, streaming SSE |
| L5 | Frontend & Multimodal Output | 90% | Slides, Web Preview, Notifications, Manus UI |
| L6 | Edge Deployment & DevOps | 70% | Cloudflare Pages, PM2, Wrangler CLI |

## Interactive Documentation

The `/docs` route provides comprehensive documentation including:
- **System Overview** with architecture diagram and Phase 4 highlight
- **6 Layer Detail Pages** with process flows, component reports, implementation plans, risk assessments
- **Phase 4: Agentic Execution** dedicated section with system vision, upgrade areas, and execution flow
- **Process Diagrams** (request lifecycle, error handling matrix, file structure)
- **Implementation Plan** with Phases 1-5 tracking
- **Execution Strategy** with safety principles and rollback procedures
- **Live Status** with real-time health checks and Phase 4 feature checklist

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Main SPA (landing page + chat) |
| GET | `/docs` | Interactive documentation |
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
| GET | `/api/db/profile/:userId` | Load user profile |
| POST | `/api/db/profile` | Update user profile |
| GET | `/api/db/credits/:userId` | Load credits (backward compat) |
| POST | `/api/db/credits` | Update credits (backward compat) |
| POST | `/api/db/settings` | Save user settings |
| GET | `/api/db/settings/:userId` | Load user settings |

## Data Architecture

### Supabase Tables

```
profiles           - User credits, settings, plan
conversations      - Chat sessions (user_id FK)
messages           - Individual messages (conversation_id FK, CASCADE DELETE)
usage_history      - Credit usage tracking (user_id FK)
```

### Credit Cost Matrix

| Model | Display Name | Cost/Message |
|-------|-------------|--------------|
| gpt-5-mini | Manus Standard | 15 credits |
| gpt-5 | Manus Pro | 45 credits |
| gpt-5-nano | Manus Lite | 8 credits |

### Plans
- **Free**: 1,000 credits
- **Starter**: $9.99 / 5,000 credits
- **Pro**: $29.99 / 20,000 credits

## Tech Stack
- **Backend**: Hono (TypeScript, Edge-first)
- **Frontend**: Vanilla JS, Tailwind CSS (CDN), FontAwesome, Highlight.js, Marked.js
- **Database**: Supabase PostgreSQL (via PostgREST API)
- **AI**: OpenAI-compatible API (proxied server-side)
- **Payments**: Stripe + LemonSqueezy (server-side only)
- **Deployment**: Cloudflare Pages + Workers

## Project Structure

```
webapp/
├── src/
│   └── index.tsx              # Hono backend + HTML shell (~1300 lines)
│                                # Landing page, Agent Mode, modals, settings
├── public/static/
│   ├── app.js                 # Frontend JS (~1310 lines)
│   │                            # Agent Mode, task decomposition, slides,
│   │                            # web preview, notifications, persistence
│   ├── style.css              # Custom CSS (~390 lines)
│   │                            # Agent effects, multimodal styles, responsive
│   └── docs.js                # Interactive documentation system
├── supabase/
│   └── schema.sql             # Database schema
├── .dev.vars                  # Local environment variables
├── ecosystem.config.cjs       # PM2 configuration
├── wrangler.jsonc             # Cloudflare configuration
├── package.json               # Dependencies
└── README.md                  # This file
```

## Environment Variables

```bash
# Required for AI
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
pm2 start ecosystem.config.cjs   # Start with PM2 on port 3000

# Or without PM2:
npm run dev:sandbox
```

## User Guide

1. **Landing Page**: Choose a quick action or type your own task
2. **Agent Mode**: Toggle in sidebar for autonomous task execution with step-by-step thinking
3. **Chat**: Type messages, get streaming AI responses with markdown rendering
4. **Slides**: Ask to "create a presentation" - slides are auto-detected and rendered with preview modal
5. **Web Preview**: Ask to "build a website" - HTML code blocks render as live previews
6. **Notifications**: Bell icon shows task completion alerts
7. **Settings**: Manage account, view usage, upgrade plan, track tasks
8. **Keyboard**: Ctrl+K (new chat), Escape (close modals), Left/Right (slide nav)

## Deployment

```bash
# Production deployment to Cloudflare Pages
npm run build
npx wrangler pages deploy dist --project-name manus-ai

# Set production secrets
npx wrangler pages secret put OPENAI_API_KEY --project-name manus-ai
npx wrangler pages secret put SUPABASE_URL --project-name manus-ai
npx wrangler pages secret put SUPABASE_SERVICE_KEY --project-name manus-ai
```

## What's Next (Pending)

- [ ] Supabase `task_executions` table for persistent task tracking across sessions
- [ ] Background execution that survives browser close (server-side task queue)
- [ ] File-to-Web transform (upload file -> interactive landing page)
- [ ] Real Supabase credentials and Row Level Security
- [ ] Stripe/LemonSqueezy production keys and webhook signature verification
- [ ] Cloudflare Pages production deployment
- [ ] Server-side credit verification
- [ ] Accessibility (ARIA labels, focus management)

## Status
- **Platform**: Cloudflare Pages (dev sandbox)
- **Phase**: 4 - Agentic Execution System
- **Last Updated**: 2026-03-30
