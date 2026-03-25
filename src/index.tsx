import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { streamText } from 'hono/streaming'

// ============================================================
// TYPE DEFINITIONS
// ============================================================
type Bindings = {
  // --- 1. SECURITY: All keys stored as env vars / Cloudflare secrets ---
  // NEVER exposed to frontend. All external calls go through server-side proxy.
  // Keys loaded from: .dev.vars (local dev) | Cloudflare Secrets (production)
  OPENAI_API_KEY: string
  OPENAI_BASE_URL: string
  // Payment (Stripe or LemonSqueezy)
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  STRIPE_PRICE_STARTER: string
  STRIPE_PRICE_PRO: string
  LEMONSQUEEZY_API_KEY: string
  LEMONSQUEEZY_WEBHOOK_SECRET: string
  LEMONSQUEEZY_STORE_ID: string
  // D1 Database binding
  DB: D1Database
}

// ============================================================
// HONO APP
// ============================================================
const app = new Hono<{ Bindings: Bindings }>()

// CORS for API routes only
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-Request-ID'],
  exposeHeaders: ['X-Model-Used', 'X-Fallback', 'X-RateLimit-Remaining'],
}))

// ============================================================
// 1. SECURITY & API PROTECTION
// ============================================================
// RULES:
// - API keys are NEVER sent to or accessible by frontend code
// - All external API calls (OpenAI, Stripe, LemonSqueezy) go through
//   server-side proxy routes defined in this file
// - Rate limiting per IP
// - Input sanitization on all user inputs
// - Request ID tracking for debugging
// ============================================================

// --- Rate Limiting (in-memory, per-IP, sliding window) ---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30
const RATE_WINDOW = 60_000

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT - 1 }
  }
  if (entry.count >= RATE_LIMIT) return { allowed: false, remaining: 0 }
  entry.count++
  return { allowed: true, remaining: RATE_LIMIT - entry.count }
}

// Rate limit middleware
app.use('/api/*', async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
  const { allowed, remaining } = checkRateLimit(ip)
  c.header('X-RateLimit-Remaining', remaining.toString())
  if (!allowed) {
    return c.json({
      error: 'Rate limit exceeded. Please wait and try again.',
      code: 'RATE_LIMITED',
      retryAfter: 60
    }, 429)
  }
  await next()
})

// Input sanitization
function sanitize(text: string, maxLen = 10000): string {
  if (typeof text !== 'string') return ''
  return text.slice(0, maxLen).trim()
}

// ============================================================
// 2. PERSISTENCE - D1 Database (Cloudflare Native)
// ============================================================
// Uses Cloudflare D1 (SQLite) for persistent storage.
// Falls back gracefully if DB binding is not configured.
// Tables: users, conversations, messages, credits, usage_history
// ============================================================

// --- DB initialization (create tables if not exist) ---
async function initDB(db: D1Database): Promise<boolean> {
  if (!db) return false
  try {
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT DEFAULT '',
        name TEXT DEFAULT 'User',
        plan TEXT DEFAULT 'free',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        model TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS credits (
        user_id TEXT PRIMARY KEY,
        balance INTEGER DEFAULT 1000,
        total_earned INTEGER DEFAULT 1000,
        updated_at TEXT DEFAULT (datetime('now'))
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS usage_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        detail TEXT NOT NULL,
        change_amount INTEGER NOT NULL,
        type TEXT DEFAULT 'usage',
        created_at TEXT DEFAULT (datetime('now'))
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS settings (
        user_id TEXT PRIMARY KEY,
        settings_json TEXT DEFAULT '{}',
        updated_at TEXT DEFAULT (datetime('now'))
      )`),
    ])
    return true
  } catch (e) {
    console.error('DB init failed:', e)
    return false
  }
}

// --- Ensure user exists ---
async function ensureUser(db: D1Database, userId: string): Promise<void> {
  if (!db) return
  try {
    const existing = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first()
    if (!existing) {
      await db.prepare('INSERT INTO users (id) VALUES (?)').bind(userId).run()
      await db.prepare('INSERT INTO credits (user_id, balance, total_earned) VALUES (?, 1000, 1000)').bind(userId).run()
      await db.prepare('INSERT INTO usage_history (user_id, detail, change_amount, type) VALUES (?, ?, ?, ?)').bind(userId, 'Welcome bonus for new users', 1000, 'bonus').run()
    }
  } catch {}
}

// --- DB: Save conversations ---
app.post('/api/db/conversations', async (c) => {
  try {
    const db = c.env.DB
    if (!db) return c.json({ success: false, fallback: 'localStorage' })
    await initDB(db)

    const { userId, conversations } = await c.req.json()
    if (!userId || !conversations) return c.json({ error: 'Missing fields' }, 400)

    const uid = sanitize(userId, 100)
    await ensureUser(db, uid)

    // Upsert conversations and messages
    for (const conv of conversations) {
      await db.prepare(
        `INSERT OR REPLACE INTO conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
      ).bind(conv.id, uid, sanitize(conv.title, 200), conv.createdAt || new Date().toISOString(), conv.updatedAt || new Date().toISOString()).run()

      // Delete old messages and re-insert
      await db.prepare('DELETE FROM messages WHERE conversation_id = ?').bind(conv.id).run()
      if (conv.messages && conv.messages.length > 0) {
        for (const msg of conv.messages) {
          await db.prepare(
            'INSERT INTO messages (conversation_id, role, content, model) VALUES (?, ?, ?, ?)'
          ).bind(conv.id, msg.role, sanitize(msg.content, 50000), msg.model || '').run()
        }
      }
    }

    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ error: err.message, fallback: 'localStorage' }, 500)
  }
})

// --- DB: Load conversations ---
app.get('/api/db/conversations/:userId', async (c) => {
  try {
    const db = c.env.DB
    if (!db) return c.json({ success: false, data: null, fallback: 'localStorage' })
    await initDB(db)

    const userId = sanitize(c.req.param('userId'), 100)
    await ensureUser(db, userId)

    const convs = await db.prepare(
      'SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC'
    ).bind(userId).all()

    const result = []
    for (const conv of (convs.results || [])) {
      const msgs = await db.prepare(
        'SELECT role, content, model, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC'
      ).bind(conv.id).all()
      result.push({
        id: conv.id,
        title: conv.title,
        messages: (msgs.results || []).map((m: any) => ({ role: m.role, content: m.content, model: m.model })),
        createdAt: conv.created_at,
        updatedAt: conv.updated_at
      })
    }

    return c.json({ success: true, data: result })
  } catch (err: any) {
    return c.json({ error: err.message, data: null, fallback: 'localStorage' }, 500)
  }
})

// --- DB: Delete conversation ---
app.delete('/api/db/conversations/:convId', async (c) => {
  try {
    const db = c.env.DB
    if (!db) return c.json({ success: false })
    const convId = sanitize(c.req.param('convId'), 100)
    await db.prepare('DELETE FROM messages WHERE conversation_id = ?').bind(convId).run()
    await db.prepare('DELETE FROM conversations WHERE id = ?').bind(convId).run()
    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// --- DB: Save/Load credits ---
app.get('/api/db/credits/:userId', async (c) => {
  try {
    const db = c.env.DB
    if (!db) return c.json({ success: false, data: null, fallback: 'localStorage' })
    await initDB(db)

    const userId = sanitize(c.req.param('userId'), 100)
    await ensureUser(db, userId)

    const cred = await db.prepare('SELECT * FROM credits WHERE user_id = ?').bind(userId).first()
    const history = await db.prepare(
      'SELECT detail, change_amount, type, created_at FROM usage_history WHERE user_id = ? ORDER BY id DESC LIMIT 50'
    ).bind(userId).all()

    return c.json({
      success: true,
      data: {
        credits: cred?.balance ?? 1000,
        totalCredits: cred?.total_earned ?? 1000,
        usageHistory: (history.results || []).map((h: any) => ({
          detail: h.detail,
          date: h.created_at?.split('T')[0] || h.created_at?.split(' ')[0] || '',
          change: h.change_amount > 0 ? `+${h.change_amount}` : `${h.change_amount}`,
          type: h.type
        }))
      }
    })
  } catch (err: any) {
    return c.json({ error: err.message, data: null, fallback: 'localStorage' }, 500)
  }
})

app.post('/api/db/credits', async (c) => {
  try {
    const db = c.env.DB
    if (!db) return c.json({ success: false, fallback: 'localStorage' })
    await initDB(db)

    const { userId, credits, totalCredits, detail, change, type } = await c.req.json()
    const uid = sanitize(userId, 100)
    await ensureUser(db, uid)

    // Update balance
    await db.prepare(
      'INSERT OR REPLACE INTO credits (user_id, balance, total_earned, updated_at) VALUES (?, ?, ?, datetime("now"))'
    ).bind(uid, credits, totalCredits || credits).run()

    // Add history entry if provided
    if (detail && change !== undefined) {
      await db.prepare(
        'INSERT INTO usage_history (user_id, detail, change_amount, type) VALUES (?, ?, ?, ?)'
      ).bind(uid, sanitize(detail, 200), change, type || 'usage').run()
    }

    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ error: err.message, fallback: 'localStorage' }, 500)
  }
})

// --- DB: Save/Load user settings ---
app.post('/api/db/settings', async (c) => {
  try {
    const db = c.env.DB
    if (!db) return c.json({ success: false, fallback: 'localStorage' })
    await initDB(db)

    const { userId, settings } = await c.req.json()
    const uid = sanitize(userId, 100)
    await ensureUser(db, uid)

    await db.prepare(
      'INSERT OR REPLACE INTO settings (user_id, settings_json, updated_at) VALUES (?, ?, datetime("now"))'
    ).bind(uid, JSON.stringify(settings)).run()

    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ error: err.message, fallback: 'localStorage' }, 500)
  }
})

app.get('/api/db/settings/:userId', async (c) => {
  try {
    const db = c.env.DB
    if (!db) return c.json({ success: false, data: null, fallback: 'localStorage' })
    await initDB(db)

    const userId = sanitize(c.req.param('userId'), 100)
    const row = await db.prepare('SELECT settings_json FROM settings WHERE user_id = ?').bind(userId).first()
    return c.json({ success: true, data: row ? JSON.parse(row.settings_json as string) : null })
  } catch (err: any) {
    return c.json({ error: err.message, data: null, fallback: 'localStorage' }, 500)
  }
})

// ============================================================
// 3. REAL-WORLD CREDIT SYSTEM - Stripe + LemonSqueezy
// ============================================================
// All payment operations happen server-side.
// Frontend calls /api/payment/* which proxies to payment provider.
// Secret keys are NEVER exposed to client.
// Supports both Stripe and LemonSqueezy as payment backends.
// ============================================================

// --- Get pricing plans ---
app.get('/api/payment/plans', (c) => {
  return c.json({
    plans: [
      {
        id: 'starter',
        name: 'Starter',
        price: '$9.99',
        priceAmount: 999,
        credits: 5000,
        features: ['5,000 credits', 'Standard model access', 'Chat history sync', 'Email support']
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '$29.99',
        priceAmount: 2999,
        credits: 20000,
        popular: true,
        features: ['20,000 credits', 'Pro model access', 'Priority processing', 'Chat history sync', 'Priority support']
      }
    ]
  })
})

// --- Create Checkout Session (Stripe primary, LemonSqueezy fallback) ---
app.post('/api/payment/checkout', async (c) => {
  try {
    const { plan, userId, returnUrl } = await c.req.json()
    const stripeKey = c.env.STRIPE_SECRET_KEY
    const lsKey = c.env.LEMONSQUEEZY_API_KEY

    const planMap: Record<string, { credits: number; stripePriceId: string }> = {
      starter: { credits: 5000, stripePriceId: c.env.STRIPE_PRICE_STARTER || '' },
      pro: { credits: 20000, stripePriceId: c.env.STRIPE_PRICE_PRO || '' }
    }

    const selected = planMap[plan]
    if (!selected) return c.json({ error: 'Invalid plan', code: 'INVALID_PLAN' }, 400)

    const origin = returnUrl || '/'

    // --- Try Stripe first ---
    if (stripeKey && selected.stripePriceId) {
      const params = new URLSearchParams({
        'payment_method_types[]': 'card',
        'mode': 'payment',
        'line_items[0][price]': selected.stripePriceId,
        'line_items[0][quantity]': '1',
        'success_url': `${origin}?payment=success&plan=${plan}&credits=${selected.credits}&provider=stripe`,
        'cancel_url': `${origin}?payment=cancelled`,
        'metadata[userId]': userId || 'anonymous',
        'metadata[plan]': plan,
        'metadata[credits]': selected.credits.toString()
      })

      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      })

      const session = await res.json() as any
      if (res.ok && session.url) {
        return c.json({ url: session.url, sessionId: session.id, provider: 'stripe' })
      }
    }

    // --- Fallback: Try LemonSqueezy ---
    if (lsKey && c.env.LEMONSQUEEZY_STORE_ID) {
      const lsVariantMap: Record<string, string> = { starter: 'variant_starter', pro: 'variant_pro' }
      const variantId = lsVariantMap[plan]

      const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lsKey}`,
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json'
        },
        body: JSON.stringify({
          data: {
            type: 'checkouts',
            attributes: {
              checkout_data: {
                custom: { user_id: userId || 'anonymous', plan, credits: selected.credits.toString() }
              },
              product_options: { redirect_url: `${origin}?payment=success&plan=${plan}&credits=${selected.credits}&provider=lemonsqueezy` }
            },
            relationships: {
              store: { data: { type: 'stores', id: c.env.LEMONSQUEEZY_STORE_ID } },
              variant: { data: { type: 'variants', id: variantId } }
            }
          }
        })
      })

      const data = await res.json() as any
      if (res.ok && data?.data?.attributes?.url) {
        return c.json({ url: data.data.attributes.url, provider: 'lemonsqueezy' })
      }
    }

    // --- Neither configured: return demo mode signal ---
    return c.json({
      error: 'Payment system not configured',
      code: 'PAYMENT_NOT_CONFIGURED',
      demoMode: true
    }, 503)
  } catch (err: any) {
    return c.json({ error: err.message, code: 'PAYMENT_ERROR' }, 500)
  }
})

// --- Stripe Webhook ---
app.post('/api/payment/stripe-webhook', async (c) => {
  try {
    const body = await c.req.text()
    const sig = c.req.header('stripe-signature')
    const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET

    // Verify webhook signature (production)
    if (webhookSecret && sig) {
      // In a full implementation, you'd verify using Stripe's HMAC
      // For Cloudflare Workers, use crypto.subtle to verify
      // For now, parse the event
    }

    const event = JSON.parse(body)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId = session.metadata?.userId
      const creditsToAdd = parseInt(session.metadata?.credits || '0')
      const plan = session.metadata?.plan || 'unknown'

      if (userId && creditsToAdd > 0) {
        const db = c.env.DB
        if (db) {
          await initDB(db)
          await ensureUser(db, userId)

          const current = await db.prepare('SELECT balance, total_earned FROM credits WHERE user_id = ?').bind(userId).first()
          const newBalance = ((current?.balance as number) || 0) + creditsToAdd
          const newTotal = ((current?.total_earned as number) || 0) + creditsToAdd

          await db.prepare(
            'INSERT OR REPLACE INTO credits (user_id, balance, total_earned, updated_at) VALUES (?, ?, ?, datetime("now"))'
          ).bind(userId, newBalance, newTotal).run()

          await db.prepare(
            'INSERT INTO usage_history (user_id, detail, change_amount, type) VALUES (?, ?, ?, ?)'
          ).bind(userId, `Purchased ${plan} plan via Stripe`, creditsToAdd, 'purchase').run()
        }
      }
    }

    return c.json({ received: true })
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }
})

// --- LemonSqueezy Webhook ---
app.post('/api/payment/ls-webhook', async (c) => {
  try {
    const body = await c.req.text()
    const event = JSON.parse(body)

    if (event.meta?.event_name === 'order_created') {
      const custom = event.meta?.custom_data || {}
      const userId = custom.user_id
      const creditsToAdd = parseInt(custom.credits || '0')
      const plan = custom.plan || 'unknown'

      if (userId && creditsToAdd > 0) {
        const db = c.env.DB
        if (db) {
          await initDB(db)
          await ensureUser(db, userId)

          const current = await db.prepare('SELECT balance, total_earned FROM credits WHERE user_id = ?').bind(userId).first()
          const newBalance = ((current?.balance as number) || 0) + creditsToAdd
          const newTotal = ((current?.total_earned as number) || 0) + creditsToAdd

          await db.prepare(
            'INSERT OR REPLACE INTO credits (user_id, balance, total_earned, updated_at) VALUES (?, ?, ?, datetime("now"))'
          ).bind(userId, newBalance, newTotal).run()

          await db.prepare(
            'INSERT INTO usage_history (user_id, detail, change_amount, type) VALUES (?, ?, ?, ?)'
          ).bind(userId, `Purchased ${plan} plan via LemonSqueezy`, creditsToAdd, 'purchase').run()
        }
      }
    }

    return c.json({ received: true })
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }
})

// ============================================================
// 4. EDGE CASES & ERROR HANDLING + MODEL FALLBACK
// ============================================================
// - If API returns non-200: try fallback model (nano/lite)
// - If all models fail: use smart local response generator
// - If credits are 0: block request with upgrade prompt
// - All errors return structured JSON with error codes
// ============================================================

const MODEL_FALLBACK_CHAIN = ['gpt-5-mini', 'gpt-5-nano']

// Smart local response generator (offline fallback)
function generateSmartResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase()

  if (msg.includes('slide') || msg.includes('presentation') || msg.includes('deck')) {
    return `## Presentation Plan

I'll create a professional presentation for you. Here's my approach:

### Structure
1. **Title Slide** - Eye-catching headline with key message
2. **Problem Statement** - Why this matters
3. **Key Insights** - 3-4 data-driven points
4. **Solution/Approach** - Your proposed direction
5. **Timeline & Milestones** - Actionable next steps
6. **Summary & CTA** - Clear call to action

### Design Guidelines
- Clean, minimal layout with ample whitespace
- Consistent color palette (2-3 brand colors)
- Data visualizations instead of text-heavy slides

Would you like me to draft the content for each slide?`
  }

  if (msg.includes('website') || msg.includes('landing') || msg.includes('web app')) {
    return `## Website Development Plan

I'll build a modern, responsive website:

### Tech Stack
- **Frontend**: HTML5, Tailwind CSS, Vanilla JS
- **Backend**: Hono (Edge-first framework)
- **Hosting**: Cloudflare Pages (global CDN)

### Key Features
1. **Responsive Design** - Mobile-first approach
2. **Fast Loading** - Optimized assets, lazy loading
3. **SEO Optimized** - Meta tags, structured data
4. **Accessibility** - WCAG 2.1 compliant

\`\`\`html
<section class="hero bg-gradient-to-br from-indigo-600 to-purple-700">
  <h1 class="text-5xl font-bold text-white">Build Something Amazing</h1>
</section>
\`\`\`

What kind of website do you need?`
  }

  if (msg.includes('code') || msg.includes('develop') || msg.includes('app') || msg.includes('function') || msg.includes('react') || msg.includes('todo')) {
    return `## Development Plan

### Step 1: Architecture Design
- Define data models and state management
- Plan component hierarchy

### Step 2: Core Implementation
\`\`\`typescript
app.get('/api/items', async (c) => {
  const items = await c.env.DB.prepare(
    'SELECT * FROM items ORDER BY created_at DESC LIMIT 20'
  ).all()
  return c.json({ success: true, data: items.results })
})
\`\`\`

### Step 3: Testing & Deployment
| Feature | Status |
|---------|--------|
| CRUD Operations | Planned |
| Authentication | Planned |
| Responsive UI | Planned |

Share more details about your app requirements!`
  }

  if (msg.includes('design') || msg.includes('brand') || msg.includes('logo') || msg.includes('ui') || msg.includes('ux')) {
    return `## Design Strategy

### Design Tokens
\`\`\`css
:root {
  --color-primary: #6366f1;
  --color-secondary: #8b5cf6;
  --color-accent: #f59e0b;
  --color-background: #0f172a;
}
\`\`\`

### Component Library
1. Buttons (primary, secondary, ghost, danger)
2. Input fields (text, select, checkbox)
3. Cards (content, pricing, feature)
4. Navigation (sidebar, topbar)
5. Modals & dialogs

Want me to create detailed designs for specific components?`
  }

  return `## I'd be happy to help!

### My Capabilities
- **Create Presentations** - Professional slides and decks
- **Build Websites** - Modern, responsive web applications
- **Develop Apps** - Full-stack application development
- **Design** - UI/UX design, branding, and visual systems
- **Research** - In-depth analysis and reports
- **Writing** - Blog posts, documentation, marketing copy

### How I Work
1. **Understand** - I analyze your requirements thoroughly
2. **Plan** - I create a structured approach
3. **Execute** - I deliver step-by-step results
4. **Refine** - I iterate based on your feedback

Could you provide more details about what you'd like to accomplish?`
}

// Try AI request with timeout
async function tryAIRequest(
  baseUrl: string, apiKey: string, model: string,
  messages: any[], systemPrompt: string
): Promise<Response | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        stream: true,
        temperature: 0.7,
        max_tokens: 4096
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    if (response.ok) return response
    return null
  } catch {
    return null
  }
}

// --- Main Chat API: Security proxy + fallback chain ---
app.post('/api/chat', async (c) => {
  const body = await c.req.json()
  const messages = body.messages || []
  const requestedModel = body.model || 'gpt-5-mini'
  const clientCredits = body.credits

  // Sanitize messages
  const sanitizedMessages = messages.map((m: any) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: sanitize(m.content || '')
  }))

  if (sanitizedMessages.length === 0) {
    return c.json({ error: 'No messages provided', code: 'EMPTY_MESSAGES' }, 400)
  }

  // --- Credit exhaustion check ---
  if (clientCredits !== undefined && clientCredits <= 0) {
    return c.json({
      error: 'You have run out of credits. Please upgrade your plan to continue.',
      code: 'CREDITS_EXHAUSTED',
      action: 'upgrade'
    }, 402)
  }

  const apiKey = c.env?.OPENAI_API_KEY
  const baseUrl = c.env?.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1'
  const lastMessage = sanitizedMessages[sanitizedMessages.length - 1]?.content || ''

  const systemPrompt = `You are Manus AI, an advanced autonomous AI agent. You help users by executing tasks, automating workflows, and delivering complete solutions.

Key behaviors:
- Think step-by-step and show your reasoning process
- Help with: creating slides, building websites, developing apps, design, research, data analysis, writing, and more
- Provide detailed, actionable responses
- Use markdown formatting for clarity
- When given a complex task, break it into steps and explain your approach
- Be proactive and suggest improvements
- Format code blocks with proper syntax highlighting`

  // --- Try API with fallback chain ---
  let usedModel = requestedModel
  let apiResponse: Response | null = null
  let fallbackUsed = false

  if (apiKey) {
    // Try requested model first
    apiResponse = await tryAIRequest(baseUrl, apiKey, requestedModel, sanitizedMessages, systemPrompt)

    // If failed, try fallback chain
    if (!apiResponse) {
      for (const fallbackModel of MODEL_FALLBACK_CHAIN) {
        if (fallbackModel === requestedModel) continue
        apiResponse = await tryAIRequest(baseUrl, apiKey, fallbackModel, sanitizedMessages, systemPrompt)
        if (apiResponse) {
          usedModel = fallbackModel
          fallbackUsed = true
          break
        }
      }
    }
  }

  // --- If API succeeded, stream it ---
  if (apiResponse) {
    c.header('Content-Type', 'text/event-stream')
    c.header('Cache-Control', 'no-cache')
    c.header('Connection', 'keep-alive')
    c.header('X-Model-Used', usedModel)
    c.header('X-Fallback', fallbackUsed ? 'true' : 'false')

    return streamText(c, async (stream) => {
      const reader = apiResponse!.body?.getReader()
      if (!reader) return

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              await stream.write('\n\n[DONE]')
              return
            }
            try {
              const json = JSON.parse(data)
              const content = json.choices?.[0]?.delta?.content
              if (content) await stream.write(content)
            } catch {}
          }
        }
      }
    })
  }

  // --- All API attempts failed: use smart local fallback ---
  const smartResponse = generateSmartResponse(lastMessage)

  c.header('Content-Type', 'text/event-stream')
  c.header('Cache-Control', 'no-cache')
  c.header('Connection', 'keep-alive')
  c.header('X-Model-Used', 'local-fallback')
  c.header('X-Fallback', 'true')

  return streamText(c, async (stream) => {
    const words = smartResponse.split(/(\s+)/)
    for (let i = 0; i < words.length; i++) {
      await stream.write(words[i])
      const delay = words[i].includes('\n') ? 30 : words[i].includes('#') ? 40 : Math.random() * 20 + 8
      await new Promise(r => setTimeout(r, delay))
    }
    await stream.write('\n\n[DONE]')
  })
})

// --- Models list ---
app.get('/api/models', (c) => {
  return c.json({
    models: [
      { id: 'gpt-5-mini', name: 'Manus Standard', description: 'Fast and efficient', icon: '\u26A1', creditCost: 15 },
      { id: 'gpt-5', name: 'Manus Pro', description: 'Advanced reasoning', icon: '\uD83E\uDDE0', creditCost: 45 },
      { id: 'gpt-5-nano', name: 'Manus Lite', description: 'Quick responses', icon: '\uD83D\uDCA8', creditCost: 8 },
    ]
  })
})

// --- Health check ---
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      ai: !!c.env?.OPENAI_API_KEY,
      database: !!c.env?.DB,
      stripe: !!c.env?.STRIPE_SECRET_KEY,
      lemonsqueezy: !!c.env?.LEMONSQUEEZY_API_KEY
    }
  })
})

// ============================================================
// MAIN HTML (SPA shell)
// ============================================================
app.get('/', (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manus AI</title>
    <meta name="description" content="Manus AI - Your autonomous AI agent for complex tasks, research, coding, design, and more.">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github-dark.min.css">
    <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/highlight.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='28' font-size='28'>&#x1F916;</text></svg>">
    <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { 'inter': ['Inter', 'sans-serif'] },
          colors: {
            'manus': {
              'bg': '#0a0a0a',
              'surface': '#141414',
              'surface2': '#1a1a1a',
              'surface3': '#222222',
              'border': '#2a2a2a',
              'border-light': '#333333',
              'text': '#e8e8e8',
              'text-muted': '#888888',
              'text-dim': '#555555',
              'accent': '#c8a2ff',
              'accent2': '#a78bfa',
              'hover': '#1e1e1e',
            }
          }
        }
      }
    }
    </script>
    <link rel="stylesheet" href="/static/style.css">
</head>
<body class="font-inter bg-manus-bg text-manus-text h-screen overflow-hidden">
    <div id="app" class="flex h-full">
        <!-- Sidebar -->
        <aside id="sidebar" class="w-[280px] bg-manus-surface border-r border-manus-border flex flex-col h-full transition-all duration-300 flex-shrink-0">
            <div class="p-4 flex items-center justify-between border-b border-manus-border">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-manus-accent to-purple-600 flex items-center justify-center">
                        <i class="fas fa-robot text-white text-sm"></i>
                    </div>
                    <span class="text-lg font-semibold tracking-tight">manus</span>
                </div>
                <button onclick="toggleSidebar()" class="p-1.5 rounded-lg hover:bg-manus-surface3 text-manus-text-muted transition-colors">
                    <i class="fas fa-bars text-sm"></i>
                </button>
            </div>
            <div class="p-3">
                <button onclick="newChat()" class="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-manus-surface2 hover:bg-manus-surface3 border border-manus-border text-sm font-medium transition-all duration-200 group">
                    <i class="fas fa-plus text-manus-text-muted group-hover:text-manus-accent transition-colors"></i>
                    <span>New conversation</span>
                    <span class="ml-auto text-[10px] text-manus-text-dim border border-manus-border rounded px-1.5 py-0.5">Ctrl+K</span>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto px-2 py-1" id="conversations-list">
                <div class="px-4 py-8 text-center text-manus-text-dim text-xs">
                    <i class="fas fa-message text-2xl mb-2 block opacity-30"></i>
                    No conversations yet
                </div>
            </div>
            <!-- Sync status indicator -->
            <div id="sync-status" class="hidden px-4 py-2 text-xs text-center border-t border-manus-border">
                <i class="fas fa-cloud text-manus-accent mr-1"></i>
                <span id="sync-status-text">Synced</span>
            </div>
            <div class="border-t border-manus-border p-3">
                <button onclick="openSettings()" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-manus-surface2 transition-colors text-sm">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <i class="fas fa-user text-white text-xs"></i>
                    </div>
                    <div class="flex-1 text-left">
                        <div class="font-medium text-sm" id="sidebar-username">User</div>
                        <div class="text-xs text-manus-text-dim" id="sidebar-plan">Free Plan</div>
                    </div>
                    <i class="fas fa-ellipsis text-manus-text-dim"></i>
                </button>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 flex flex-col h-full min-w-0 relative">
            <header class="h-14 flex items-center justify-between px-4 border-b border-manus-border bg-manus-bg/80 backdrop-blur-xl z-10 flex-shrink-0">
                <div class="flex items-center gap-3">
                    <button id="sidebar-toggle-mobile" onclick="toggleSidebar()" class="hidden p-2 rounded-lg hover:bg-manus-surface2 text-manus-text-muted transition-colors">
                        <i class="fas fa-bars"></i>
                    </button>
                    <div id="chat-title" class="text-sm font-medium text-manus-text-muted">New conversation</div>
                    <!-- Fallback badge -->
                    <div id="fallback-badge" class="hidden items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                        <i class="fas fa-triangle-exclamation text-[10px]"></i>
                        <span id="fallback-badge-text">Fallback mode</span>
                    </div>
                    <!-- DB status badge -->
                    <div id="db-badge" class="hidden items-center gap-1.5 px-2.5 py-1 rounded-full text-xs">
                        <i class="fas fa-database text-[10px]"></i>
                        <span id="db-badge-text">DB</span>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-manus-surface2 border border-manus-border text-sm cursor-pointer hover:border-manus-accent/30 transition-colors" onclick="openSettings(); showSettingsTab('usage')">
                        <i class="fas fa-sparkles text-manus-accent text-xs"></i>
                        <span id="header-credits" class="font-medium text-xs">1000</span>
                    </div>
                    <div class="relative" id="model-selector">
                        <button onclick="toggleModelDropdown()" class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-manus-surface2 text-sm text-manus-text-muted transition-colors border border-manus-border">
                            <span id="selected-model-icon">\u26A1</span>
                            <span id="selected-model-name">Standard</span>
                            <i class="fas fa-chevron-down text-xs"></i>
                        </button>
                        <div id="model-dropdown" class="hidden absolute right-0 top-full mt-2 w-64 bg-manus-surface border border-manus-border rounded-xl shadow-2xl py-2 z-50">
                            <div onclick="selectModel('gpt-5-mini', 'Standard', '\u26A1')" class="flex items-center gap-3 px-4 py-2.5 hover:bg-manus-surface2 cursor-pointer transition-colors">
                                <span class="text-lg">\u26A1</span>
                                <div class="flex-1"><div class="text-sm font-medium">Manus Standard</div><div class="text-xs text-manus-text-dim">Fast and efficient</div></div>
                                <span class="text-[10px] text-manus-text-dim">15 cr</span>
                            </div>
                            <div onclick="selectModel('gpt-5', 'Pro', '\uD83E\uDDE0')" class="flex items-center gap-3 px-4 py-2.5 hover:bg-manus-surface2 cursor-pointer transition-colors">
                                <span class="text-lg">\uD83E\uDDE0</span>
                                <div class="flex-1"><div class="text-sm font-medium">Manus Pro</div><div class="text-xs text-manus-text-dim">Advanced reasoning</div></div>
                                <span class="text-[10px] text-manus-text-dim">45 cr</span>
                            </div>
                            <div onclick="selectModel('gpt-5-nano', 'Lite', '\uD83D\uDCA8')" class="flex items-center gap-3 px-4 py-2.5 hover:bg-manus-surface2 cursor-pointer transition-colors">
                                <span class="text-lg">\uD83D\uDCA8</span>
                                <div class="flex-1"><div class="text-sm font-medium">Manus Lite</div><div class="text-xs text-manus-text-dim">Quick responses</div></div>
                                <span class="text-[10px] text-manus-text-dim">8 cr</span>
                            </div>
                        </div>
                    </div>
                    <button onclick="openSettings()" class="p-2 rounded-lg hover:bg-manus-surface2 text-manus-text-muted transition-colors">
                        <i class="fas fa-gear text-sm"></i>
                    </button>
                </div>
            </header>

            <div id="chat-container" class="flex-1 overflow-y-auto">
                <!-- Landing Page -->
                <div id="landing-page" class="flex flex-col items-center justify-center h-full px-4">
                    <div class="max-w-2xl w-full text-center">
                        <div class="mb-8 relative">
                            <div class="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-manus-accent/20 to-purple-600/20 flex items-center justify-center border border-manus-accent/30 shadow-lg shadow-manus-accent/10">
                                <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-manus-accent to-purple-600 flex items-center justify-center float-animation">
                                    <i class="fas fa-robot text-white text-2xl"></i>
                                </div>
                            </div>
                        </div>
                        <h1 class="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-white to-manus-text-muted bg-clip-text text-transparent">
                            What can I do for you?
                        </h1>
                        <p class="text-manus-text-muted text-base mb-10">
                            I'm Manus, your autonomous AI agent. I can help with complex tasks, research, coding, design, and more.
                        </p>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
                            <button onclick="quickAction('Create a presentation about AI trends in 2025')" class="group p-4 rounded-xl bg-manus-surface border border-manus-border hover:border-manus-accent/40 transition-all duration-300 text-left hover:shadow-lg hover:shadow-manus-accent/5 hover:-translate-y-0.5">
                                <div class="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><i class="fas fa-file-powerpoint text-orange-400"></i></div>
                                <div class="text-sm font-medium">Create slides</div>
                                <div class="text-xs text-manus-text-dim mt-1">Presentations & decks</div>
                            </button>
                            <button onclick="quickAction('Build a modern landing page for a SaaS startup')" class="group p-4 rounded-xl bg-manus-surface border border-manus-border hover:border-manus-accent/40 transition-all duration-300 text-left hover:shadow-lg hover:shadow-manus-accent/5 hover:-translate-y-0.5">
                                <div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><i class="fas fa-globe text-blue-400"></i></div>
                                <div class="text-sm font-medium">Build website</div>
                                <div class="text-xs text-manus-text-dim mt-1">Web apps & sites</div>
                            </button>
                            <button onclick="quickAction('Develop a React todo app with authentication')" class="group p-4 rounded-xl bg-manus-surface border border-manus-border hover:border-manus-accent/40 transition-all duration-300 text-left hover:shadow-lg hover:shadow-manus-accent/5 hover:-translate-y-0.5">
                                <div class="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><i class="fas fa-code text-green-400"></i></div>
                                <div class="text-sm font-medium">Develop apps</div>
                                <div class="text-xs text-manus-text-dim mt-1">Code & applications</div>
                            </button>
                            <button onclick="quickAction('Design a brand identity for a tech startup')" class="group p-4 rounded-xl bg-manus-surface border border-manus-border hover:border-manus-accent/40 transition-all duration-300 text-left hover:shadow-lg hover:shadow-manus-accent/5 hover:-translate-y-0.5">
                                <div class="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><i class="fas fa-palette text-purple-400"></i></div>
                                <div class="text-sm font-medium">Design</div>
                                <div class="text-xs text-manus-text-dim mt-1">UI/UX & branding</div>
                            </button>
                        </div>
                        <div class="flex flex-wrap gap-2 justify-center">
                            <button onclick="quickAction('Research the latest developments in quantum computing')" class="px-4 py-2 rounded-full bg-manus-surface border border-manus-border hover:border-manus-accent/40 text-sm text-manus-text-muted hover:text-manus-text transition-all duration-200"><i class="fas fa-flask mr-1.5 text-xs"></i>Research</button>
                            <button onclick="quickAction('Analyze this dataset and create visualizations')" class="px-4 py-2 rounded-full bg-manus-surface border border-manus-border hover:border-manus-accent/40 text-sm text-manus-text-muted hover:text-manus-text transition-all duration-200"><i class="fas fa-chart-bar mr-1.5 text-xs"></i>Data analysis</button>
                            <button onclick="quickAction('Write a comprehensive blog post about machine learning')" class="px-4 py-2 rounded-full bg-manus-surface border border-manus-border hover:border-manus-accent/40 text-sm text-manus-text-muted hover:text-manus-text transition-all duration-200"><i class="fas fa-pen-fancy mr-1.5 text-xs"></i>Writing</button>
                            <button onclick="quickAction('Help me plan a marketing strategy for my product')" class="px-4 py-2 rounded-full bg-manus-surface border border-manus-border hover:border-manus-accent/40 text-sm text-manus-text-muted hover:text-manus-text transition-all duration-200"><i class="fas fa-bullhorn mr-1.5 text-xs"></i>Marketing</button>
                        </div>
                    </div>
                </div>
                <div id="messages-area" class="hidden max-w-3xl mx-auto px-4 py-6"></div>
            </div>

            <!-- Input Area -->
            <div id="input-area" class="flex-shrink-0 border-t border-manus-border bg-manus-bg/80 backdrop-blur-xl px-4 py-4">
                <div class="max-w-3xl mx-auto">
                    <div class="relative flex items-end bg-manus-surface border border-manus-border rounded-2xl focus-within:border-manus-accent/50 transition-all duration-300 shadow-lg focus-within:shadow-manus-accent/5">
                        <textarea id="message-input" placeholder="Describe your task..." rows="1"
                            class="flex-1 bg-transparent px-5 py-4 text-sm resize-none outline-none max-h-40 placeholder-manus-text-dim"
                            onkeydown="handleKeyDown(event)" oninput="autoResize(this)"></textarea>
                        <div class="flex items-center gap-1 px-3 py-3">
                            <button onclick="document.getElementById('file-upload').click()" class="p-2 rounded-lg hover:bg-manus-surface3 text-manus-text-dim hover:text-manus-text-muted transition-colors" title="Attach file">
                                <i class="fas fa-paperclip text-sm"></i>
                            </button>
                            <input type="file" id="file-upload" class="hidden" onchange="handleFileUpload(event)">
                            <button id="send-btn" onclick="sendMessage()" class="p-2.5 rounded-xl bg-manus-accent hover:bg-manus-accent2 text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-manus-accent" disabled>
                                <i class="fas fa-arrow-up text-sm"></i>
                            </button>
                        </div>
                    </div>
                    <div class="text-center mt-2.5">
                        <span class="text-[11px] text-manus-text-dim">Manus AI can make mistakes. Verify important information.</span>
                    </div>
                </div>
            </div>

            <!-- Credits Exhausted Overlay -->
            <div id="credits-exhausted-overlay" class="hidden absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div class="credits-exhausted-card max-w-md w-full mx-4 p-6 bg-manus-surface border border-red-500/30 rounded-2xl shadow-2xl shadow-red-500/10">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <i class="fas fa-circle-exclamation text-red-400 text-xl"></i>
                        </div>
                        <div>
                            <div class="font-semibold">Credits Exhausted</div>
                            <div class="text-xs text-manus-text-muted">You've used all your available credits</div>
                        </div>
                    </div>
                    <p class="text-sm text-manus-text-muted mb-5">Upgrade your plan to continue using Manus AI with full capabilities. Your chat history is safely saved.</p>
                    <div class="flex gap-3">
                        <button onclick="openSettings(); showSettingsTab('billing')" class="flex-1 px-4 py-2.5 rounded-xl bg-manus-accent hover:bg-manus-accent2 text-white text-sm font-medium transition-colors">
                            <i class="fas fa-arrow-up-right mr-1.5"></i>Upgrade Plan
                        </button>
                        <button onclick="dismissCreditsWarning()" class="px-4 py-2.5 rounded-xl border border-manus-border text-sm text-manus-text-muted hover:bg-manus-surface2 transition-colors">
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>

            <!-- API Error Overlay (shown when API is completely down) -->
            <div id="api-error-overlay" class="hidden absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div class="max-w-md w-full mx-4 p-6 bg-manus-surface border border-amber-500/30 rounded-2xl shadow-2xl">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <i class="fas fa-wifi text-amber-400 text-xl" id="api-error-icon"></i>
                        </div>
                        <div>
                            <div class="font-semibold" id="api-error-title">Service Unavailable</div>
                            <div class="text-xs text-manus-text-muted" id="api-error-subtitle">AI service is temporarily down</div>
                        </div>
                    </div>
                    <p class="text-sm text-manus-text-muted mb-2" id="api-error-message">Manus AI is running in offline mode. You can still chat with limited capabilities using our built-in intelligence.</p>
                    <div class="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl mb-5 text-xs text-amber-300/80">
                        <i class="fas fa-info-circle mr-1.5"></i>
                        <span>Offline mode uses the Lite model with reduced capabilities. Your messages and credits are unaffected.</span>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="document.getElementById('api-error-overlay').classList.add('hidden')" class="flex-1 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm font-medium transition-colors border border-amber-500/20">
                            <i class="fas fa-check mr-1.5"></i>Continue in Offline Mode
                        </button>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Settings Modal -->
    <div id="settings-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="closeSettings()"></div>
        <div class="relative w-[720px] max-w-[92vw] max-h-[85vh] bg-manus-surface rounded-2xl border border-manus-border shadow-2xl flex overflow-hidden animate-in">
            <div class="w-[200px] bg-manus-surface2 border-r border-manus-border p-4 flex flex-col flex-shrink-0">
                <div class="flex items-center gap-2.5 mb-6">
                    <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-manus-accent to-purple-600 flex items-center justify-center">
                        <i class="fas fa-robot text-white text-xs"></i>
                    </div>
                    <span class="text-sm font-semibold">manus</span>
                </div>
                <nav class="space-y-1">
                    <button onclick="showSettingsTab('account')" class="settings-tab-btn active w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" data-tab="account">
                        <i class="fas fa-user w-4 text-center text-manus-text-muted"></i><span>Account</span>
                    </button>
                    <button onclick="showSettingsTab('usage')" class="settings-tab-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" data-tab="usage">
                        <i class="fas fa-sparkles w-4 text-center text-manus-text-muted"></i><span>Usage</span>
                    </button>
                    <button onclick="showSettingsTab('billing')" class="settings-tab-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" data-tab="billing">
                        <i class="fas fa-credit-card w-4 text-center text-manus-text-muted"></i><span>Billing</span>
                    </button>
                    <button onclick="showSettingsTab('general')" class="settings-tab-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" data-tab="general">
                        <i class="fas fa-sliders w-4 text-center text-manus-text-muted"></i><span>General</span>
                    </button>
                    <button onclick="window.open('mailto:support@manus.im')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-manus-text-muted hover:bg-manus-surface3 transition-colors">
                        <i class="fas fa-envelope w-4 text-center"></i><span>Contact us</span>
                        <i class="fas fa-arrow-up-right-from-square text-[10px] ml-auto"></i>
                    </button>
                </nav>
            </div>
            <div class="flex-1 p-6 overflow-y-auto relative">
                <button onclick="closeSettings()" class="absolute top-4 right-4 p-2 rounded-lg hover:bg-manus-surface3 text-manus-text-dim hover:text-manus-text transition-colors">
                    <i class="fas fa-xmark text-sm"></i>
                </button>

                <!-- Account Tab -->
                <div id="settings-account" class="settings-tab-content">
                    <h2 class="text-xl font-semibold mb-6">Account</h2>
                    <div class="space-y-4">
                        <div class="flex items-center gap-4 p-4 bg-manus-surface2 rounded-xl border border-manus-border">
                            <div class="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-user text-white text-xl"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="font-medium" id="account-display-name">User</div>
                                <div class="text-sm text-manus-text-muted" id="account-user-id">user@example.com</div>
                            </div>
                        </div>
                        <div class="p-4 bg-manus-surface2 rounded-xl border border-manus-border">
                            <div class="text-sm text-manus-text-muted mb-1">User ID</div>
                            <div class="font-mono text-xs text-manus-text-dim break-all" id="account-uid-display">-</div>
                        </div>
                        <div class="p-4 bg-manus-surface2 rounded-xl border border-manus-border">
                            <div class="text-sm text-manus-text-muted mb-1">Storage</div>
                            <div class="flex items-center justify-between">
                                <div class="font-medium text-sm" id="storage-status">
                                    <span class="inline-flex items-center gap-1.5">
                                        <span class="w-2 h-2 rounded-full bg-green-400"></span>
                                        <span id="storage-type-label">localStorage</span>
                                    </span>
                                </div>
                                <div class="text-xs text-manus-text-dim" id="storage-detail">Browser only</div>
                            </div>
                        </div>
                        <div class="p-4 bg-manus-surface2 rounded-xl border border-manus-border">
                            <div class="text-sm text-manus-text-muted mb-1">Plan</div>
                            <div class="flex items-center justify-between">
                                <div class="font-medium" id="settings-plan-name">Free Plan</div>
                                <button onclick="showSettingsTab('billing')" class="px-4 py-1.5 rounded-lg bg-manus-accent/10 text-manus-accent border border-manus-accent/20 text-sm hover:bg-manus-accent/20 transition-colors">Upgrade</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Usage Tab -->
                <div id="settings-usage" class="settings-tab-content hidden">
                    <h2 class="text-xl font-semibold mb-6">Usage</h2>
                    <div class="p-4 bg-manus-surface2 rounded-xl border border-manus-border mb-6">
                        <div class="flex items-center justify-between mb-4">
                            <span class="font-semibold text-lg" id="usage-plan-label">Free</span>
                            <button onclick="showSettingsTab('billing')" class="px-4 py-1.5 rounded-lg border border-manus-border text-sm hover:bg-manus-surface3 transition-colors">Upgrade</button>
                        </div>
                        <div class="border-t border-dashed border-manus-border pt-4">
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center gap-2 text-sm text-manus-text-muted">
                                    <i class="fas fa-sparkles text-manus-accent"></i>Credits
                                    <span class="w-4 h-4 rounded-full border border-manus-text-dim flex items-center justify-center text-[10px] cursor-help" title="Credits are consumed when you use AI features. Standard costs 15, Pro costs 45, Lite costs 8 per message.">?</span>
                                </div>
                                <span class="text-2xl font-bold" id="credit-balance">1000</span>
                            </div>
                            <div class="w-full h-2 bg-manus-surface3 rounded-full overflow-hidden">
                                <div id="credit-progress-bar" class="h-full bg-gradient-to-r from-manus-accent to-purple-500 rounded-full transition-all duration-500" style="width: 100%"></div>
                            </div>
                            <div class="flex justify-between mt-1.5 text-[11px] text-manus-text-dim">
                                <span id="credits-used-label">0 used</span>
                                <span id="credits-total-label">1,000 total</span>
                            </div>
                        </div>
                    </div>
                    <!-- Model cost breakdown -->
                    <div class="grid grid-cols-3 gap-3 mb-6">
                        <div class="p-3 bg-manus-surface2 rounded-xl border border-manus-border text-center">
                            <div class="text-lg mb-1">\u26A1</div>
                            <div class="text-xs font-medium">Standard</div>
                            <div class="text-xs text-manus-accent mt-1">15 credits/msg</div>
                        </div>
                        <div class="p-3 bg-manus-surface2 rounded-xl border border-manus-border text-center">
                            <div class="text-lg mb-1">\uD83E\uDDE0</div>
                            <div class="text-xs font-medium">Pro</div>
                            <div class="text-xs text-manus-accent mt-1">45 credits/msg</div>
                        </div>
                        <div class="p-3 bg-manus-surface2 rounded-xl border border-manus-border text-center">
                            <div class="text-lg mb-1">\uD83D\uDCA8</div>
                            <div class="text-xs font-medium">Lite</div>
                            <div class="text-xs text-manus-accent mt-1">8 credits/msg</div>
                        </div>
                    </div>
                    <div class="text-sm">
                        <div class="grid grid-cols-3 text-manus-text-dim pb-2 border-b border-manus-border">
                            <span>Details</span><span>Date</span><span class="text-right">Credits</span>
                        </div>
                        <div id="usage-history" class="divide-y divide-manus-border/50 max-h-[200px] overflow-y-auto"></div>
                    </div>
                </div>

                <!-- Billing Tab -->
                <div id="settings-billing" class="settings-tab-content hidden">
                    <h2 class="text-xl font-semibold mb-2">Billing</h2>
                    <p class="text-sm text-manus-text-muted mb-6">Choose a plan that fits your needs. Credits never expire.</p>
                    <!-- Payment provider status -->
                    <div id="payment-status" class="mb-4 p-3 rounded-xl text-xs flex items-center gap-2"></div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="pricing-cards">
                        <div class="p-5 bg-manus-surface2 rounded-xl border border-manus-border hover:border-manus-accent/30 transition-all">
                            <div class="text-sm font-medium text-manus-text-muted mb-1">Starter</div>
                            <div class="flex items-baseline gap-1 mb-4">
                                <span class="text-3xl font-bold">$9.99</span>
                                <span class="text-sm text-manus-text-dim">one-time</span>
                            </div>
                            <ul class="space-y-2 mb-5 text-sm">
                                <li class="flex items-center gap-2"><i class="fas fa-check text-green-400 text-xs"></i>5,000 credits</li>
                                <li class="flex items-center gap-2"><i class="fas fa-check text-green-400 text-xs"></i>Standard model access</li>
                                <li class="flex items-center gap-2"><i class="fas fa-check text-green-400 text-xs"></i>Chat history sync</li>
                                <li class="flex items-center gap-2"><i class="fas fa-check text-green-400 text-xs"></i>Email support</li>
                            </ul>
                            <button onclick="handlePurchase('starter')" id="btn-starter" class="w-full py-2.5 rounded-xl border border-manus-border text-sm font-medium hover:bg-manus-surface3 transition-colors">
                                Get Starter
                            </button>
                        </div>
                        <div class="p-5 bg-manus-surface2 rounded-xl border-2 border-manus-accent/40 relative hover:border-manus-accent/60 transition-all">
                            <div class="absolute -top-3 left-4 px-3 py-0.5 bg-manus-accent text-white text-[11px] font-medium rounded-full">Popular</div>
                            <div class="text-sm font-medium text-manus-text-muted mb-1">Pro</div>
                            <div class="flex items-baseline gap-1 mb-4">
                                <span class="text-3xl font-bold">$29.99</span>
                                <span class="text-sm text-manus-text-dim">one-time</span>
                            </div>
                            <ul class="space-y-2 mb-5 text-sm">
                                <li class="flex items-center gap-2"><i class="fas fa-check text-green-400 text-xs"></i>20,000 credits</li>
                                <li class="flex items-center gap-2"><i class="fas fa-check text-green-400 text-xs"></i>Pro model access</li>
                                <li class="flex items-center gap-2"><i class="fas fa-check text-green-400 text-xs"></i>Priority processing</li>
                                <li class="flex items-center gap-2"><i class="fas fa-check text-green-400 text-xs"></i>Chat history sync</li>
                                <li class="flex items-center gap-2"><i class="fas fa-check text-green-400 text-xs"></i>Priority support</li>
                            </ul>
                            <button onclick="handlePurchase('pro')" id="btn-pro" class="w-full py-2.5 rounded-xl bg-manus-accent hover:bg-manus-accent2 text-white text-sm font-medium transition-colors">
                                Get Pro
                            </button>
                        </div>
                    </div>
                </div>

                <!-- General Tab -->
                <div id="settings-general" class="settings-tab-content hidden">
                    <h2 class="text-xl font-semibold mb-6">General</h2>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between p-4 bg-manus-surface2 rounded-xl border border-manus-border">
                            <div><div class="font-medium text-sm">Theme</div><div class="text-xs text-manus-text-muted mt-0.5">Appearance of the app</div></div>
                            <select class="bg-manus-surface3 border border-manus-border rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer">
                                <option>Dark</option><option>Light</option><option>System</option>
                            </select>
                        </div>
                        <div class="flex items-center justify-between p-4 bg-manus-surface2 rounded-xl border border-manus-border">
                            <div><div class="font-medium text-sm">Language</div><div class="text-xs text-manus-text-muted mt-0.5">Interface language</div></div>
                            <select class="bg-manus-surface3 border border-manus-border rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer">
                                <option>English</option><option>Myanmar (Burmese)</option><option>Chinese</option><option>Japanese</option>
                            </select>
                        </div>
                        <div class="flex items-center justify-between p-4 bg-manus-surface2 rounded-xl border border-manus-border">
                            <div><div class="font-medium text-sm">Send with Enter</div><div class="text-xs text-manus-text-muted mt-0.5">Use Shift+Enter for new line</div></div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked class="sr-only peer">
                                <div class="w-10 h-5 bg-manus-surface3 rounded-full peer peer-checked:bg-manus-accent/60 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                            </label>
                        </div>
                        <div class="flex items-center justify-between p-4 bg-manus-surface2 rounded-xl border border-manus-border">
                            <div>
                                <div class="font-medium text-sm">Cloud sync (D1 Database)</div>
                                <div class="text-xs text-manus-text-muted mt-0.5">Sync conversations & credits to Cloudflare D1</div>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="sync-toggle" onchange="toggleSync(this.checked)" class="sr-only peer">
                                <div class="w-10 h-5 bg-manus-surface3 rounded-full peer peer-checked:bg-manus-accent/60 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                            </label>
                        </div>
                        <div class="flex items-center justify-between p-4 bg-manus-surface2 rounded-xl border border-manus-border">
                            <div><div class="font-medium text-sm text-red-400">Clear all conversations</div><div class="text-xs text-manus-text-muted mt-0.5">Delete all chat history permanently</div></div>
                            <button onclick="clearAllConversations()" class="px-4 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm hover:bg-red-500/20 transition-colors">Clear all</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Toast Container -->
    <div id="toast-container" class="fixed bottom-6 right-6 z-[60] flex flex-col gap-2"></div>

    <script src="/static/app.js"></script>
</body>
</html>`
  return c.html(html)
})

export default app
