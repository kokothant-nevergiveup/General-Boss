import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { streamText } from 'hono/streaming'

// ============================================================
// TYPE DEFINITIONS
// ============================================================
type Bindings = {
  // --- 1. SECURITY: All keys stored as env vars / Cloudflare secrets ---
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
  // Supabase (replaces D1)
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

// ============================================================
// HONO APP
// ============================================================
const app = new Hono<{ Bindings: Bindings }>()

// CORS for API routes only
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-Request-ID'],
  exposeHeaders: ['X-Model-Used', 'X-Fallback', 'X-RateLimit-Remaining'],
}))

// ============================================================
// 1. SECURITY & API PROTECTION
// ============================================================
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

app.use('/api/*', async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
  const { allowed, remaining } = checkRateLimit(ip)
  c.header('X-RateLimit-Remaining', remaining.toString())
  if (!allowed) {
    return c.json({ error: 'Rate limit exceeded. Please wait and try again.', code: 'RATE_LIMITED', retryAfter: 60 }, 429)
  }
  await next()
})

function sanitize(text: string, maxLen = 10000): string {
  if (typeof text !== 'string') return ''
  return text.slice(0, maxLen).trim()
}

// ============================================================
// 2. PERSISTENCE - Supabase (PostgREST API)
// ============================================================
// All data persists in Supabase PostgreSQL via REST API.
// Tables: profiles, conversations, messages, usage_history
// Keys are stored server-side only (SUPABASE_SERVICE_KEY).
// ============================================================

// --- Supabase REST helper ---
async function supabase(
  env: Bindings,
  table: string,
  method: string = 'GET',
  body?: any,
  query: string = '',
  headers: Record<string, string> = {}
): Promise<any> {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`
  const defaultHeaders: Record<string, string> = {
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation,resolution=merge-duplicates' : 'return=representation',
    ...headers,
  }
  const opts: RequestInit = { method, headers: defaultHeaders }
  if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    opts.body = JSON.stringify(body)
  }
  const res = await fetch(url, opts)
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Supabase ${method} ${table}: ${res.status} - ${errText}`)
  }
  const text = await res.text()
  if (!text) return null
  try { return JSON.parse(text) } catch { return text }
}

// --- Ensure user profile exists (upsert) ---
async function ensureProfile(env: Bindings, userId: string): Promise<void> {
  try {
    await supabase(env, 'profiles', 'POST', {
      id: userId,
      credits: 1000,
      total_credits: 1000,
      updated_at: new Date().toISOString()
    }, '', { 'Prefer': 'return=minimal,resolution=ignore-duplicates' })
  } catch {
    // Profile already exists or minor error - OK
  }
}

// --- DB: Save conversations ---
app.post('/api/db/conversations', async (c) => {
  try {
    const sbUrl = c.env.SUPABASE_URL
    const sbKey = c.env.SUPABASE_SERVICE_KEY
    if (!sbUrl || !sbKey) return c.json({ success: false, fallback: 'localStorage' })

    const { userId, conversations } = await c.req.json()
    if (!userId || !conversations) return c.json({ error: 'Missing fields' }, 400)

    const uid = sanitize(userId, 100)
    await ensureProfile(c.env, uid)

    for (const conv of conversations) {
      // Upsert conversation
      await supabase(c.env, 'conversations', 'POST', {
        id: conv.id,
        user_id: uid,
        title: sanitize(conv.title, 200),
        created_at: conv.createdAt || new Date().toISOString(),
        updated_at: conv.updatedAt || new Date().toISOString()
      })

      // Delete old messages then re-insert
      await supabase(c.env, 'messages', 'DELETE', null, `conversation_id=eq.${conv.id}`)

      if (conv.messages && conv.messages.length > 0) {
        const msgBatch = conv.messages.map((msg: any) => ({
          conversation_id: conv.id,
          role: msg.role,
          content: sanitize(msg.content, 50000),
          model: msg.model || ''
        }))
        await supabase(c.env, 'messages', 'POST', msgBatch, '', {
          'Prefer': 'return=minimal'
        })
      }
    }

    return c.json({ success: true })
  } catch (err: any) {
    console.error('Save conversations error:', err.message)
    return c.json({ error: err.message, fallback: 'localStorage' }, 500)
  }
})

// --- DB: Load conversations ---
app.get('/api/db/conversations/:userId', async (c) => {
  try {
    const sbUrl = c.env.SUPABASE_URL
    const sbKey = c.env.SUPABASE_SERVICE_KEY
    if (!sbUrl || !sbKey) return c.json({ success: false, data: null, fallback: 'localStorage' })

    const userId = sanitize(c.req.param('userId'), 100)
    await ensureProfile(c.env, userId)

    // Get conversations
    const convs = await supabase(c.env, 'conversations', 'GET', null,
      `user_id=eq.${encodeURIComponent(userId)}&order=updated_at.desc`)

    const result = []
    for (const conv of (convs || [])) {
      // Get messages for this conversation
      const msgs = await supabase(c.env, 'messages', 'GET', null,
        `conversation_id=eq.${encodeURIComponent(conv.id)}&order=id.asc`)

      result.push({
        id: conv.id,
        title: conv.title,
        messages: (msgs || []).map((m: any) => ({ role: m.role, content: m.content, model: m.model })),
        createdAt: conv.created_at,
        updatedAt: conv.updated_at
      })
    }

    return c.json({ success: true, data: result })
  } catch (err: any) {
    console.error('Load conversations error:', err.message)
    return c.json({ error: err.message, data: null, fallback: 'localStorage' }, 500)
  }
})

// --- DB: Delete conversation ---
app.delete('/api/db/conversations/:convId', async (c) => {
  try {
    const sbUrl = c.env.SUPABASE_URL
    const sbKey = c.env.SUPABASE_SERVICE_KEY
    if (!sbUrl || !sbKey) return c.json({ success: false })

    const convId = sanitize(c.req.param('convId'), 100)
    // Messages cascade-deleted via FK
    await supabase(c.env, 'conversations', 'DELETE', null, `id=eq.${encodeURIComponent(convId)}`)
    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// --- DB: Get user profile (credits + settings) ---
app.get('/api/db/profile/:userId', async (c) => {
  try {
    const sbUrl = c.env.SUPABASE_URL
    const sbKey = c.env.SUPABASE_SERVICE_KEY
    if (!sbUrl || !sbKey) return c.json({ success: false, data: null, fallback: 'localStorage' })

    const userId = sanitize(c.req.param('userId'), 100)
    await ensureProfile(c.env, userId)

    const rows = await supabase(c.env, 'profiles', 'GET', null,
      `id=eq.${encodeURIComponent(userId)}&limit=1`)
    const profile = rows?.[0]

    // Get usage history
    const history = await supabase(c.env, 'usage_history', 'GET', null,
      `user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=50`)

    return c.json({
      success: true,
      data: {
        credits: profile?.credits ?? 1000,
        totalCredits: profile?.total_credits ?? 1000,
        plan: profile?.plan ?? 'free',
        name: profile?.name ?? 'User',
        settings: profile?.settings ?? {},
        usageHistory: (history || []).map((h: any) => ({
          detail: h.detail,
          date: h.created_at?.split('T')[0] || '',
          change: h.change_amount > 0 ? `+${h.change_amount}` : `${h.change_amount}`,
          type: h.type
        }))
      }
    })
  } catch (err: any) {
    console.error('Load profile error:', err.message)
    return c.json({ error: err.message, data: null, fallback: 'localStorage' }, 500)
  }
})

// --- DB: Update profile (credits + settings) ---
app.post('/api/db/profile', async (c) => {
  try {
    const sbUrl = c.env.SUPABASE_URL
    const sbKey = c.env.SUPABASE_SERVICE_KEY
    if (!sbUrl || !sbKey) return c.json({ success: false, fallback: 'localStorage' })

    const body = await c.req.json()
    const uid = sanitize(body.userId, 100)
    await ensureProfile(c.env, uid)

    // Build update payload
    const updates: any = { updated_at: new Date().toISOString() }
    if (body.credits !== undefined) updates.credits = body.credits
    if (body.totalCredits !== undefined) updates.total_credits = body.totalCredits
    if (body.plan !== undefined) updates.plan = body.plan
    if (body.name !== undefined) updates.name = sanitize(body.name, 100)
    if (body.settings !== undefined) updates.settings = body.settings

    await supabase(c.env, 'profiles', 'PATCH', updates,
      `id=eq.${encodeURIComponent(uid)}`)

    // Add usage history entry if provided
    if (body.detail && body.change !== undefined) {
      await supabase(c.env, 'usage_history', 'POST', {
        user_id: uid,
        detail: sanitize(body.detail, 200),
        change_amount: body.change,
        type: body.type || 'usage'
      }, '', { 'Prefer': 'return=minimal' })
    }

    return c.json({ success: true })
  } catch (err: any) {
    console.error('Update profile error:', err.message)
    return c.json({ error: err.message, fallback: 'localStorage' }, 500)
  }
})

// --- DB: Backward compat - credits GET ---
app.get('/api/db/credits/:userId', async (c) => {
  try {
    const sbUrl = c.env.SUPABASE_URL
    const sbKey = c.env.SUPABASE_SERVICE_KEY
    if (!sbUrl || !sbKey) return c.json({ success: false, data: null, fallback: 'localStorage' })

    const userId = sanitize(c.req.param('userId'), 100)
    await ensureProfile(c.env, userId)

    const rows = await supabase(c.env, 'profiles', 'GET', null,
      `id=eq.${encodeURIComponent(userId)}&select=credits,total_credits&limit=1`)
    const profile = rows?.[0]

    const history = await supabase(c.env, 'usage_history', 'GET', null,
      `user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=50`)

    return c.json({
      success: true,
      data: {
        credits: profile?.credits ?? 1000,
        totalCredits: profile?.total_credits ?? 1000,
        usageHistory: (history || []).map((h: any) => ({
          detail: h.detail,
          date: h.created_at?.split('T')[0] || '',
          change: h.change_amount > 0 ? `+${h.change_amount}` : `${h.change_amount}`,
          type: h.type
        }))
      }
    })
  } catch (err: any) {
    return c.json({ error: err.message, data: null, fallback: 'localStorage' }, 500)
  }
})

// --- DB: Backward compat - credits POST ---
app.post('/api/db/credits', async (c) => {
  try {
    const sbUrl = c.env.SUPABASE_URL
    const sbKey = c.env.SUPABASE_SERVICE_KEY
    if (!sbUrl || !sbKey) return c.json({ success: false, fallback: 'localStorage' })

    const { userId, credits, totalCredits, detail, change, type } = await c.req.json()
    const uid = sanitize(userId, 100)
    await ensureProfile(c.env, uid)

    await supabase(c.env, 'profiles', 'PATCH', {
      credits,
      total_credits: totalCredits || credits,
      updated_at: new Date().toISOString()
    }, `id=eq.${encodeURIComponent(uid)}`)

    if (detail && change !== undefined) {
      await supabase(c.env, 'usage_history', 'POST', {
        user_id: uid,
        detail: sanitize(detail, 200),
        change_amount: change,
        type: type || 'usage'
      }, '', { 'Prefer': 'return=minimal' })
    }

    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ error: err.message, fallback: 'localStorage' }, 500)
  }
})

// --- DB: Settings backward compat ---
app.post('/api/db/settings', async (c) => {
  try {
    const sbUrl = c.env.SUPABASE_URL
    const sbKey = c.env.SUPABASE_SERVICE_KEY
    if (!sbUrl || !sbKey) return c.json({ success: false, fallback: 'localStorage' })

    const { userId, settings } = await c.req.json()
    const uid = sanitize(userId, 100)
    await ensureProfile(c.env, uid)

    await supabase(c.env, 'profiles', 'PATCH', {
      settings,
      updated_at: new Date().toISOString()
    }, `id=eq.${encodeURIComponent(uid)}`)

    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ error: err.message, fallback: 'localStorage' }, 500)
  }
})

app.get('/api/db/settings/:userId', async (c) => {
  try {
    const sbUrl = c.env.SUPABASE_URL
    const sbKey = c.env.SUPABASE_SERVICE_KEY
    if (!sbUrl || !sbKey) return c.json({ success: false, data: null, fallback: 'localStorage' })

    const userId = sanitize(c.req.param('userId'), 100)
    const rows = await supabase(c.env, 'profiles', 'GET', null,
      `id=eq.${encodeURIComponent(userId)}&select=settings&limit=1`)
    return c.json({ success: true, data: rows?.[0]?.settings ?? null })
  } catch (err: any) {
    return c.json({ error: err.message, data: null, fallback: 'localStorage' }, 500)
  }
})

// ============================================================
// 3. REAL-WORLD CREDIT SYSTEM - Stripe + LemonSqueezy
// ============================================================
app.get('/api/payment/plans', (c) => {
  return c.json({
    plans: [
      {
        id: 'starter', name: 'Starter', price: '$9.99', priceAmount: 999, credits: 5000,
        features: ['5,000 credits', 'Standard model access', 'Chat history sync', 'Email support']
      },
      {
        id: 'pro', name: 'Pro', price: '$29.99', priceAmount: 2999, credits: 20000, popular: true,
        features: ['20,000 credits', 'Pro model access', 'Priority processing', 'Chat history sync', 'Priority support']
      }
    ]
  })
})

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

    // Try Stripe
    if (stripeKey && selected.stripePriceId) {
      const params = new URLSearchParams({
        'payment_method_types[]': 'card', 'mode': 'payment',
        'line_items[0][price]': selected.stripePriceId, 'line_items[0][quantity]': '1',
        'success_url': `${origin}?payment=success&plan=${plan}&credits=${selected.credits}&provider=stripe`,
        'cancel_url': `${origin}?payment=cancelled`,
        'metadata[userId]': userId || 'anonymous', 'metadata[plan]': plan, 'metadata[credits]': selected.credits.toString()
      })
      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      })
      const session = await res.json() as any
      if (res.ok && session.url) return c.json({ url: session.url, sessionId: session.id, provider: 'stripe' })
    }

    // Try LemonSqueezy
    if (lsKey && c.env.LEMONSQUEEZY_STORE_ID) {
      const lsVariantMap: Record<string, string> = { starter: 'variant_starter', pro: 'variant_pro' }
      const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${lsKey}`, 'Content-Type': 'application/vnd.api+json', 'Accept': 'application/vnd.api+json' },
        body: JSON.stringify({
          data: {
            type: 'checkouts',
            attributes: {
              checkout_data: { custom: { user_id: userId || 'anonymous', plan, credits: selected.credits.toString() } },
              product_options: { redirect_url: `${origin}?payment=success&plan=${plan}&credits=${selected.credits}&provider=lemonsqueezy` }
            },
            relationships: {
              store: { data: { type: 'stores', id: c.env.LEMONSQUEEZY_STORE_ID } },
              variant: { data: { type: 'variants', id: lsVariantMap[plan] } }
            }
          }
        })
      })
      const data = await res.json() as any
      if (res.ok && data?.data?.attributes?.url) return c.json({ url: data.data.attributes.url, provider: 'lemonsqueezy' })
    }

    return c.json({ error: 'Payment system not configured', code: 'PAYMENT_NOT_CONFIGURED', demoMode: true }, 503)
  } catch (err: any) {
    return c.json({ error: err.message, code: 'PAYMENT_ERROR' }, 500)
  }
})

// Stripe Webhook - credits via Supabase
app.post('/api/payment/stripe-webhook', async (c) => {
  try {
    const body = await c.req.text()
    const event = JSON.parse(body)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId = session.metadata?.userId
      const creditsToAdd = parseInt(session.metadata?.credits || '0')
      const plan = session.metadata?.plan || 'unknown'

      if (userId && creditsToAdd > 0 && c.env.SUPABASE_URL && c.env.SUPABASE_SERVICE_KEY) {
        await ensureProfile(c.env, userId)
        const rows = await supabase(c.env, 'profiles', 'GET', null, `id=eq.${encodeURIComponent(userId)}&select=credits,total_credits&limit=1`)
        const current = rows?.[0]
        const newBalance = (current?.credits || 0) + creditsToAdd
        const newTotal = (current?.total_credits || 0) + creditsToAdd

        await supabase(c.env, 'profiles', 'PATCH', { credits: newBalance, total_credits: newTotal, updated_at: new Date().toISOString() }, `id=eq.${encodeURIComponent(userId)}`)
        await supabase(c.env, 'usage_history', 'POST', { user_id: userId, detail: `Purchased ${plan} plan via Stripe`, change_amount: creditsToAdd, type: 'purchase' }, '', { 'Prefer': 'return=minimal' })
      }
    }
    return c.json({ received: true })
  } catch (err: any) {
    return c.json({ error: err.message }, 400)
  }
})

// LemonSqueezy Webhook
app.post('/api/payment/ls-webhook', async (c) => {
  try {
    const body = await c.req.text()
    const event = JSON.parse(body)

    if (event.meta?.event_name === 'order_created') {
      const custom = event.meta?.custom_data || {}
      const userId = custom.user_id
      const creditsToAdd = parseInt(custom.credits || '0')
      const plan = custom.plan || 'unknown'

      if (userId && creditsToAdd > 0 && c.env.SUPABASE_URL && c.env.SUPABASE_SERVICE_KEY) {
        await ensureProfile(c.env, userId)
        const rows = await supabase(c.env, 'profiles', 'GET', null, `id=eq.${encodeURIComponent(userId)}&select=credits,total_credits&limit=1`)
        const current = rows?.[0]
        const newBalance = (current?.credits || 0) + creditsToAdd
        const newTotal = (current?.total_credits || 0) + creditsToAdd

        await supabase(c.env, 'profiles', 'PATCH', { credits: newBalance, total_credits: newTotal, updated_at: new Date().toISOString() }, `id=eq.${encodeURIComponent(userId)}`)
        await supabase(c.env, 'usage_history', 'POST', { user_id: userId, detail: `Purchased ${plan} plan via LemonSqueezy`, change_amount: creditsToAdd, type: 'purchase' }, '', { 'Prefer': 'return=minimal' })
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
const MODEL_FALLBACK_CHAIN = ['gpt-5-mini', 'gpt-5-nano']

function generateSmartResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase()

  if (msg.includes('slide') || msg.includes('presentation') || msg.includes('deck')) {
    return `## Presentation Plan\n\nI'll create a professional presentation for you. Here's my approach:\n\n### Structure\n1. **Title Slide** - Eye-catching headline with key message\n2. **Problem Statement** - Why this matters\n3. **Key Insights** - 3-4 data-driven points\n4. **Solution/Approach** - Your proposed direction\n5. **Timeline & Milestones** - Actionable next steps\n6. **Summary & CTA** - Clear call to action\n\n### Design Guidelines\n- Clean, minimal layout with ample whitespace\n- Consistent color palette (2-3 brand colors)\n- Data visualizations instead of text-heavy slides\n\nWould you like me to draft the content for each slide?`
  }

  if (msg.includes('website') || msg.includes('landing') || msg.includes('web app')) {
    return `## Website Development Plan\n\nI'll build a modern, responsive website:\n\n### Tech Stack\n- **Frontend**: HTML5, Tailwind CSS, Vanilla JS\n- **Backend**: Hono (Edge-first framework)\n- **Hosting**: Cloudflare Pages (global CDN)\n\n### Key Features\n1. **Responsive Design** - Mobile-first approach\n2. **Fast Loading** - Optimized assets, lazy loading\n3. **SEO Optimized** - Meta tags, structured data\n4. **Accessibility** - WCAG 2.1 compliant\n\nWhat kind of website do you need?`
  }

  if (msg.includes('code') || msg.includes('develop') || msg.includes('app') || msg.includes('function') || msg.includes('react') || msg.includes('todo')) {
    return `## Development Plan\n\n### Step 1: Architecture Design\n- Define data models and state management\n- Plan component hierarchy\n\n### Step 2: Core Implementation\n\`\`\`typescript\napp.get('/api/items', async (c) => {\n  const items = await c.env.DB.prepare(\n    'SELECT * FROM items ORDER BY created_at DESC LIMIT 20'\n  ).all()\n  return c.json({ success: true, data: items.results })\n})\n\`\`\`\n\n### Step 3: Testing & Deployment\n\nShare more details about your app requirements!`
  }

  return `## I'd be happy to help!\n\n### My Capabilities\n- **Create Presentations** - Professional slides and decks\n- **Build Websites** - Modern, responsive web applications\n- **Develop Apps** - Full-stack application development\n- **Design** - UI/UX design, branding, and visual systems\n- **Research** - In-depth analysis and reports\n- **Writing** - Blog posts, documentation, marketing copy\n\n### How I Work\n1. **Understand** - I analyze your requirements thoroughly\n2. **Plan** - I create a structured approach\n3. **Execute** - I deliver step-by-step results\n4. **Refine** - I iterate based on your feedback\n\nCould you provide more details about what you'd like to accomplish?`
}

async function tryAIRequest(baseUrl: string, apiKey: string, model: string, messages: any[], systemPrompt: string): Promise<Response | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, ...messages], stream: true, temperature: 0.7, max_tokens: 4096 }),
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    if (response.ok) return response
    return null
  } catch { return null }
}

app.post('/api/chat', async (c) => {
  const body = await c.req.json()
  const messages = body.messages || []
  const requestedModel = body.model || 'gpt-5-mini'
  const clientCredits = body.credits

  const sanitizedMessages = messages.map((m: any) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: sanitize(m.content || '')
  }))

  if (sanitizedMessages.length === 0) return c.json({ error: 'No messages provided', code: 'EMPTY_MESSAGES' }, 400)
  if (clientCredits !== undefined && clientCredits <= 0) return c.json({ error: 'You have run out of credits. Please upgrade your plan to continue.', code: 'CREDITS_EXHAUSTED', action: 'upgrade' }, 402)

  const apiKey = c.env?.OPENAI_API_KEY
  const baseUrl = c.env?.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1'
  const lastMessage = sanitizedMessages[sanitizedMessages.length - 1]?.content || ''

  const systemPrompt = `You are General Boss AI, an advanced autonomous AI agent. You help users by executing tasks, automating workflows, and delivering complete solutions.\n\nKey behaviors:\n- Think step-by-step and show your reasoning process\n- Help with: creating slides, building websites, developing apps, design, research, data analysis, writing, and more\n- Provide detailed, actionable responses\n- Use markdown formatting for clarity\n- When given a complex task, break it into steps and explain your approach\n- Be proactive and suggest improvements\n- Format code blocks with proper syntax highlighting`

  let usedModel = requestedModel
  let apiResponse: Response | null = null
  let fallbackUsed = false

  if (apiKey) {
    apiResponse = await tryAIRequest(baseUrl, apiKey, requestedModel, sanitizedMessages, systemPrompt)
    if (!apiResponse) {
      for (const fallbackModel of MODEL_FALLBACK_CHAIN) {
        if (fallbackModel === requestedModel) continue
        apiResponse = await tryAIRequest(baseUrl, apiKey, fallbackModel, sanitizedMessages, systemPrompt)
        if (apiResponse) { usedModel = fallbackModel; fallbackUsed = true; break }
      }
    }
  }

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
            if (data === '[DONE]') { await stream.write('\n\n[DONE]'); return }
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

  // Fallback
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
      { id: 'gpt-5-mini', name: 'General Boss Standard', description: 'Fast and efficient', icon: '\u26A1', creditCost: 15 },
      { id: 'gpt-5', name: 'General Boss Pro', description: 'Advanced reasoning', icon: '\uD83E\uDDE0', creditCost: 45 },
      { id: 'gpt-5-nano', name: 'General Boss Lite', description: 'Quick responses', icon: '\uD83D\uDCA8', creditCost: 8 },
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
      database: !!(c.env?.SUPABASE_URL && c.env?.SUPABASE_SERVICE_KEY),
      supabase: !!(c.env?.SUPABASE_URL && c.env?.SUPABASE_SERVICE_KEY),
      stripe: !!c.env?.STRIPE_SECRET_KEY,
      lemonsqueezy: !!c.env?.LEMONSQUEEZY_API_KEY
    }
  })
})

// ============================================================
// DOCUMENTATION PAGE - Autonomous Agentic System
// ============================================================
app.get('/docs', (c) => {
  const docsHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>General Boss - Documentation</title>
    <meta name="description" content="Layer architecture, reports, process diagrams, and implementation plans for General Boss.">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='28' font-size='28'>&#x1F4D1;</text></svg>">
    <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { 'inter': ['Inter', 'sans-serif'] }
        }
      }
    }
    </script>
    <style>
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: #444; }
      .nav-item { transition: all 0.15s ease; }
      .nav-item:hover { background: #1e1e1e; }
      .nav-item.active { background: #1a1a1a; color: #e8e8e8; border-left: 2px solid #c8a2ff; }
      @keyframes spin-smooth { to { transform: rotate(360deg); } }
      .agent-spinner { animation: spin-smooth 1s linear infinite; }
    </style>
</head>
<body class="font-inter bg-[#0a0a0a] text-[#e8e8e8] h-screen overflow-hidden">
    <div class="flex h-full">
        <!-- Docs Sidebar -->
        <aside class="w-[260px] bg-[#141414] border-r border-[#2a2a2a] flex flex-col h-full flex-shrink-0">
            <div class="p-4 border-b border-[#2a2a2a]">
                <a href="/" class="flex items-center gap-2.5 mb-3 hover:opacity-80 transition-opacity">
                    <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                        <i class="fas fa-robot text-white text-xs"></i>
                    </div>
                    <span class="text-sm font-semibold tracking-tight">General Boss</span>
                </a>
                <div class="text-xs text-gray-400 font-medium">GENERAL BOSS PLATFORM</div>
                <div class="text-[10px] text-gray-600">Documentation & Reports</div>
            </div>
            <nav class="flex-1 overflow-y-auto p-2 space-y-0.5">
                <div class="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Overview</div>
                <button data-section="overview" onclick="navigateTo('overview')" class="nav-item active w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-400">
                    <i class="fas fa-home w-4 text-center"></i><span>System Overview</span>
                </button>
                
                <div class="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-3">Layers</div>
                <button data-section="layer1" onclick="navigateTo('layer1')" class="nav-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-400">
                    <i class="fas fa-shield-halved w-4 text-center text-red-400/60"></i><span>L1: Security</span>
                </button>
                <button data-section="layer2" onclick="navigateTo('layer2')" class="nav-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-400">
                    <i class="fas fa-database w-4 text-center text-blue-400/60"></i><span>L2: Persistence</span>
                </button>
                <button data-section="layer3" onclick="navigateTo('layer3')" class="nav-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-400">
                    <i class="fas fa-credit-card w-4 text-center text-green-400/60"></i><span>L3: Payments</span>
                </button>
                <button data-section="layer4" onclick="navigateTo('layer4')" class="nav-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-400">
                    <i class="fas fa-brain w-4 text-center text-purple-400/60"></i><span>L4: AI Engine</span>
                </button>
                <button data-section="layer5" onclick="navigateTo('layer5')" class="nav-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-400">
                    <i class="fas fa-desktop w-4 text-center text-cyan-400/60"></i><span>L5: Frontend</span>
                </button>
                <button data-section="layer6" onclick="navigateTo('layer6')" class="nav-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-400">
                    <i class="fas fa-cloud w-4 text-center text-amber-400/60"></i><span>L6: Deployment</span>
                </button>
                
                <div class="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-3">Phase 4</div>
                <button data-section="phase4" onclick="navigateTo('phase4')" class="nav-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-400">
                    <i class="fas fa-wand-magic-sparkles w-4 text-center text-purple-400/60"></i><span>Agentic Execution</span>
                </button>
                
                <div class="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-3">Reports</div>
                <button data-section="diagrams" onclick="navigateTo('diagrams')" class="nav-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-400">
                    <i class="fas fa-diagram-project w-4 text-center"></i><span>Process Diagrams</span>
                </button>
                <button data-section="implementation" onclick="navigateTo('implementation')" class="nav-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-400">
                    <i class="fas fa-list-check w-4 text-center"></i><span>Implementation Plan</span>
                </button>
                <button data-section="execution" onclick="navigateTo('execution')" class="nav-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-400">
                    <i class="fas fa-shield-halved w-4 text-center"></i><span>Execution Strategy</span>
                </button>
                <button data-section="status" onclick="navigateTo('status'); runHealthCheck()" class="nav-item w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-400">
                    <i class="fas fa-heartbeat w-4 text-center"></i><span>Live Status</span>
                </button>
            </nav>
            <div class="p-3 border-t border-[#2a2a2a]">
                <a href="/" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:bg-[#1e1e1e] transition-colors">
                    <i class="fas fa-arrow-left text-xs"></i>
                    <span>Back to App</span>
                </a>
            </div>
        </aside>
        
        <!-- Main Content -->
        <main id="docs-content" class="flex-1 overflow-y-auto">
            <div id="docs-content-inner" class="max-w-4xl mx-auto px-6 py-8">
                <!-- Content rendered by docs.js -->
            </div>
        </main>
    </div>
    
    <script src="/static/docs.js"></script>
</body>
</html>`
  return c.html(docsHtml)
})

// ============================================================
// MAIN HTML (SPA shell) - Phase 4: Agentic Execution System
// ============================================================
app.get('/', (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>General Boss AI</title>
    <meta name="description" content="General Boss AI - Your autonomous AI execution partner. From idea to execution while you focus on what matters.">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
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
              'bg': '#0a0a0a', 'surface': '#141414', 'surface2': '#1a1a1a', 'surface3': '#222222',
              'border': '#2a2a2a', 'border-light': '#333333', 'text': '#e8e8e8', 'text-muted': '#888888',
              'text-dim': '#555555', 'accent': '#c8a2ff', 'accent2': '#a78bfa', 'hover': '#1e1e1e',
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
                    <span class="text-lg font-semibold tracking-tight">General Boss</span>
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

            <!-- Agent Mode Toggle -->
            <div class="px-3 pb-2">
                <div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-manus-surface2 border border-manus-border">
                    <i class="fas fa-wand-magic-sparkles text-manus-accent text-xs"></i>
                    <span class="text-xs font-medium flex-1">Agent Mode</span>
                    <label class="relative inline-flex items-center cursor-pointer" title="Deep execution for complex tasks">
                        <input type="checkbox" id="agent-mode-toggle" class="sr-only peer" onchange="toggleAgentMode(this.checked)">
                        <div class="w-9 h-5 bg-manus-surface3 rounded-full peer peer-checked:bg-manus-accent/60 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                    </label>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto px-2 py-1" id="conversations-list">
                <div class="px-4 py-8 text-center text-manus-text-dim text-xs">
                    <i class="fas fa-message text-2xl mb-2 block opacity-30"></i>
                    No conversations yet
                </div>
            </div>
            <!-- Sync status indicator -->
            <div id="sync-status" class="px-4 py-2 text-xs text-center border-t border-manus-border">
                <i class="fas fa-cloud text-manus-accent mr-1"></i>
                <span id="sync-status-text">Connecting...</span>
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
                    <!-- Agent Mode badge -->
                    <div id="agent-badge" class="hidden items-center gap-1.5 px-2.5 py-1 rounded-full bg-manus-accent/10 border border-manus-accent/20 text-xs text-manus-accent">
                        <i class="fas fa-wand-magic-sparkles text-[10px]"></i>
                        <span>Agent</span>
                    </div>
                    <div id="fallback-badge" class="hidden items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                        <i class="fas fa-triangle-exclamation text-[10px]"></i>
                        <span id="fallback-badge-text">Fallback mode</span>
                    </div>
                    <div id="db-badge" class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-green-500/10 border border-green-500/20 text-green-400">
                        <i class="fas fa-database text-[10px]"></i>
                        <span id="db-badge-text">Supabase</span>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <!-- Notification bell -->
                    <button id="notification-bell" onclick="toggleNotifications()" class="relative p-2 rounded-lg hover:bg-manus-surface2 text-manus-text-muted transition-colors" title="Notifications">
                        <i class="fas fa-bell text-sm"></i>
                        <span id="notif-count" class="hidden absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">0</span>
                    </button>
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
                                <div class="flex-1"><div class="text-sm font-medium">General Boss Standard</div><div class="text-xs text-manus-text-dim">Fast and efficient</div></div>
                                <span class="text-[10px] text-manus-text-dim">15 cr</span>
                            </div>
                            <div onclick="selectModel('gpt-5', 'Pro', '\uD83E\uDDE0')" class="flex items-center gap-3 px-4 py-2.5 hover:bg-manus-surface2 cursor-pointer transition-colors">
                                <span class="text-lg">\uD83E\uDDE0</span>
                                <div class="flex-1"><div class="text-sm font-medium">General Boss Pro</div><div class="text-xs text-manus-text-dim">Advanced reasoning</div></div>
                                <span class="text-[10px] text-manus-text-dim">45 cr</span>
                            </div>
                            <div onclick="selectModel('gpt-5-nano', 'Lite', '\uD83D\uDCA8')" class="flex items-center gap-3 px-4 py-2.5 hover:bg-manus-surface2 cursor-pointer transition-colors">
                                <span class="text-lg">\uD83D\uDCA8</span>
                                <div class="flex-1"><div class="text-sm font-medium">General Boss Lite</div><div class="text-xs text-manus-text-dim">Quick responses</div></div>
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
                <!-- LANDING PAGE - General Boss Style -->
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
                            I execute tasks autonomously while you focus on what matters. From slides to websites, research to automation.
                        </p>
                        <!-- 4 Quick Action Cards -->
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                            <button onclick="quickAction('Create a professional presentation about AI trends in 2025 with 8 slides')" class="group p-4 rounded-xl bg-manus-surface border border-manus-border hover:border-orange-400/40 transition-all duration-300 text-left hover:shadow-lg hover:shadow-orange-400/5 hover:-translate-y-0.5">
                                <div class="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><i class="fas fa-file-powerpoint text-orange-400"></i></div>
                                <div class="text-sm font-medium">Create Slides</div>
                                <div class="text-xs text-manus-text-dim mt-1">Presentations & decks</div>
                            </button>
                            <button onclick="quickAction('Build a modern responsive landing page for a SaaS product with hero, features, pricing sections')" class="group p-4 rounded-xl bg-manus-surface border border-manus-border hover:border-blue-400/40 transition-all duration-300 text-left hover:shadow-lg hover:shadow-blue-400/5 hover:-translate-y-0.5">
                                <div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><i class="fas fa-globe text-blue-400"></i></div>
                                <div class="text-sm font-medium">Build Website</div>
                                <div class="text-xs text-manus-text-dim mt-1">Web apps & pages</div>
                            </button>
                            <button onclick="quickAction('Automate a workflow: monitor RSS feeds, summarize new articles, and create a weekly digest email')" class="group p-4 rounded-xl bg-manus-surface border border-manus-border hover:border-green-400/40 transition-all duration-300 text-left hover:shadow-lg hover:shadow-green-400/5 hover:-translate-y-0.5">
                                <div class="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><i class="fas fa-gears text-green-400"></i></div>
                                <div class="text-sm font-medium">Automate Apps</div>
                                <div class="text-xs text-manus-text-dim mt-1">Workflows & scripts</div>
                            </button>
                            <button onclick="quickAction('Design a complete brand identity system: logo concept, color palette, typography, and usage guidelines')" class="group p-4 rounded-xl bg-manus-surface border border-manus-border hover:border-purple-400/40 transition-all duration-300 text-left hover:shadow-lg hover:shadow-purple-400/5 hover:-translate-y-0.5">
                                <div class="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><i class="fas fa-palette text-purple-400"></i></div>
                                <div class="text-sm font-medium">Design Concepts</div>
                                <div class="text-xs text-manus-text-dim mt-1">Branding & UI/UX</div>
                            </button>
                        </div>
                        <div class="flex flex-wrap gap-2 justify-center">
                            <button onclick="quickAction('Research the latest breakthroughs in quantum computing and write an executive summary')" class="px-4 py-2 rounded-full bg-manus-surface border border-manus-border hover:border-manus-accent/40 text-sm text-manus-text-muted hover:text-manus-text transition-all duration-200"><i class="fas fa-flask mr-1.5 text-xs"></i>Research</button>
                            <button onclick="quickAction('Analyze this dataset and create interactive visualizations with insights')" class="px-4 py-2 rounded-full bg-manus-surface border border-manus-border hover:border-manus-accent/40 text-sm text-manus-text-muted hover:text-manus-text transition-all duration-200"><i class="fas fa-chart-bar mr-1.5 text-xs"></i>Data analysis</button>
                            <button onclick="quickAction('Write a comprehensive technical blog post about building scalable microservices')" class="px-4 py-2 rounded-full bg-manus-surface border border-manus-border hover:border-manus-accent/40 text-sm text-manus-text-muted hover:text-manus-text transition-all duration-200"><i class="fas fa-pen-fancy mr-1.5 text-xs"></i>Writing</button>
                            <button onclick="quickAction('Create a complete marketing strategy with channels, budget, and timeline')" class="px-4 py-2 rounded-full bg-manus-surface border border-manus-border hover:border-manus-accent/40 text-sm text-manus-text-muted hover:text-manus-text transition-all duration-200"><i class="fas fa-bullhorn mr-1.5 text-xs"></i>Marketing</button>
                        </div>
                        <!-- Agent mode hint -->
                        <div class="mt-8 flex items-center justify-center gap-2 text-xs text-manus-text-dim">
                            <i class="fas fa-wand-magic-sparkles text-manus-accent/50"></i>
                            <span>Enable <button onclick="document.getElementById('agent-mode-toggle').click()" class="text-manus-accent hover:underline">Agent Mode</button> for deep autonomous execution</span>
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
                        <span class="text-[11px] text-manus-text-dim">General Boss AI can make mistakes. Verify important information.</span>
                    </div>
                </div>
            </div>

            <!-- Credits Exhausted Overlay -->
            <div id="credits-exhausted-overlay" class="hidden absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div class="credits-exhausted-card max-w-md w-full mx-4 p-6 bg-manus-surface border border-red-500/30 rounded-2xl shadow-2xl shadow-red-500/10">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center"><i class="fas fa-circle-exclamation text-red-400 text-xl"></i></div>
                        <div><div class="font-semibold">Credits Exhausted</div><div class="text-xs text-manus-text-muted">You've used all your available credits</div></div>
                    </div>
                    <p class="text-sm text-manus-text-muted mb-5">Upgrade your plan to continue using General Boss AI with full capabilities. Your chat history is safely saved.</p>
                    <div class="flex gap-3">
                        <button onclick="openSettings(); showSettingsTab('billing')" class="flex-1 px-4 py-2.5 rounded-xl bg-manus-accent hover:bg-manus-accent2 text-white text-sm font-medium transition-colors"><i class="fas fa-arrow-up-right mr-1.5"></i>Upgrade Plan</button>
                        <button onclick="dismissCreditsWarning()" class="px-4 py-2.5 rounded-xl border border-manus-border text-sm text-manus-text-muted hover:bg-manus-surface2 transition-colors">Dismiss</button>
                    </div>
                </div>
            </div>

            <!-- API Error Overlay -->
            <div id="api-error-overlay" class="hidden absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div class="max-w-md w-full mx-4 p-6 bg-manus-surface border border-amber-500/30 rounded-2xl shadow-2xl">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center"><i class="fas fa-wifi text-amber-400 text-xl" id="api-error-icon"></i></div>
                        <div><div class="font-semibold" id="api-error-title">Service Unavailable</div><div class="text-xs text-manus-text-muted" id="api-error-subtitle">AI service is temporarily down</div></div>
                    </div>
                    <p class="text-sm text-manus-text-muted mb-2" id="api-error-message">General Boss AI is running in offline mode. You can still chat with limited capabilities using our built-in intelligence.</p>
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

    <!-- Notification Panel (slides out from right) -->
    <div id="notification-panel" class="hidden fixed top-14 right-4 w-80 max-h-[60vh] bg-manus-surface border border-manus-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in">
        <div class="p-4 border-b border-manus-border flex items-center justify-between">
            <div class="flex items-center gap-2"><i class="fas fa-bell text-manus-accent text-sm"></i><span class="text-sm font-semibold">Notifications</span></div>
            <button onclick="clearNotifications()" class="text-xs text-manus-text-dim hover:text-manus-text transition-colors">Clear all</button>
        </div>
        <div id="notification-list" class="overflow-y-auto max-h-[50vh] p-2">
            <div class="px-3 py-6 text-center text-manus-text-dim text-xs"><i class="fas fa-check-circle text-lg mb-2 block opacity-30"></i>No new notifications</div>
        </div>
    </div>

    <!-- Slide Preview Modal -->
    <div id="slide-preview-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" onclick="closeSlidePreview()"></div>
        <div class="relative w-[90vw] max-w-[1100px] h-[80vh] bg-manus-surface rounded-2xl border border-manus-border shadow-2xl flex flex-col overflow-hidden animate-in">
            <div class="h-12 px-4 flex items-center justify-between border-b border-manus-border flex-shrink-0">
                <div class="flex items-center gap-3">
                    <i class="fas fa-file-powerpoint text-orange-400 text-sm"></i>
                    <span class="text-sm font-medium" id="slide-preview-title">Presentation Preview</span>
                    <span class="text-xs text-manus-text-dim" id="slide-counter">Slide 1 / 1</span>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="prevSlide()" class="p-1.5 rounded-lg hover:bg-manus-surface3 text-manus-text-muted transition-colors"><i class="fas fa-chevron-left text-sm"></i></button>
                    <button onclick="nextSlide()" class="p-1.5 rounded-lg hover:bg-manus-surface3 text-manus-text-muted transition-colors"><i class="fas fa-chevron-right text-sm"></i></button>
                    <button onclick="closeSlidePreview()" class="p-1.5 rounded-lg hover:bg-manus-surface3 text-manus-text-dim hover:text-manus-text transition-colors ml-2"><i class="fas fa-xmark text-sm"></i></button>
                </div>
            </div>
            <div class="flex-1 flex items-center justify-center p-6 bg-[#0d0d0d]" id="slide-viewport">
                <div id="slide-content" class="w-full max-w-[960px] aspect-[16/9] bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-xl shadow-2xl flex items-center justify-center p-12 text-white"></div>
            </div>
        </div>
    </div>

    <!-- Web Preview Modal -->
    <div id="web-preview-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" onclick="closeWebPreview()"></div>
        <div class="relative w-[90vw] max-w-[1100px] h-[85vh] bg-manus-surface rounded-2xl border border-manus-border shadow-2xl flex flex-col overflow-hidden animate-in">
            <div class="h-12 px-4 flex items-center justify-between border-b border-manus-border flex-shrink-0">
                <div class="flex items-center gap-3">
                    <div class="flex gap-1.5">
                        <div class="w-3 h-3 rounded-full bg-red-500/80"></div>
                        <div class="w-3 h-3 rounded-full bg-amber-400/80"></div>
                        <div class="w-3 h-3 rounded-full bg-green-500/80"></div>
                    </div>
                    <div class="flex items-center gap-2 px-3 py-1 rounded-lg bg-manus-surface2 border border-manus-border text-xs text-manus-text-dim flex-1 max-w-sm">
                        <i class="fas fa-lock text-green-400 text-[9px]"></i>
                        <span id="web-preview-url">preview://localhost</span>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="toggleWebPreviewDevice('desktop')" class="p-1.5 rounded-lg hover:bg-manus-surface3 text-manus-text-muted transition-colors" title="Desktop"><i class="fas fa-desktop text-sm"></i></button>
                    <button onclick="toggleWebPreviewDevice('mobile')" class="p-1.5 rounded-lg hover:bg-manus-surface3 text-manus-text-muted transition-colors" title="Mobile"><i class="fas fa-mobile-screen text-sm"></i></button>
                    <button onclick="copyWebPreviewCode()" class="p-1.5 rounded-lg hover:bg-manus-surface3 text-manus-text-muted transition-colors" title="Copy code"><i class="fas fa-code text-sm"></i></button>
                    <button onclick="closeWebPreview()" class="p-1.5 rounded-lg hover:bg-manus-surface3 text-manus-text-dim hover:text-manus-text transition-colors ml-2"><i class="fas fa-xmark text-sm"></i></button>
                </div>
            </div>
            <div class="flex-1 bg-white flex items-start justify-center p-0 overflow-hidden" id="web-preview-container">
                <iframe id="web-preview-frame" class="w-full h-full border-0" sandbox="allow-scripts allow-same-origin"></iframe>
            </div>
        </div>
    </div>

    <!-- Settings Modal -->
    <div id="settings-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="closeSettings()"></div>
        <div class="relative w-[720px] max-w-[92vw] max-h-[85vh] bg-manus-surface rounded-2xl border border-manus-border shadow-2xl flex overflow-hidden animate-in">
            <div class="w-[200px] bg-manus-surface2 border-r border-manus-border p-4 flex flex-col flex-shrink-0">
                <div class="flex items-center gap-2.5 mb-6">
                    <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-manus-accent to-purple-600 flex items-center justify-center"><i class="fas fa-robot text-white text-xs"></i></div>
                    <span class="text-sm font-semibold">General Boss</span>
                </div>
                <nav class="space-y-1">
                    <button onclick="showSettingsTab('account')" class="settings-tab-btn active w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" data-tab="account"><i class="fas fa-user w-4 text-center text-manus-text-muted"></i><span>Account</span></button>
                    <button onclick="showSettingsTab('usage')" class="settings-tab-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" data-tab="usage"><i class="fas fa-sparkles w-4 text-center text-manus-text-muted"></i><span>Usage</span></button>
                    <button onclick="showSettingsTab('billing')" class="settings-tab-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" data-tab="billing"><i class="fas fa-credit-card w-4 text-center text-manus-text-muted"></i><span>Billing</span></button>
                    <button onclick="showSettingsTab('tasks')" class="settings-tab-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" data-tab="tasks"><i class="fas fa-list-check w-4 text-center text-manus-text-muted"></i><span>Tasks</span></button>
                    <button onclick="showSettingsTab('general')" class="settings-tab-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" data-tab="general"><i class="fas fa-sliders w-4 text-center text-manus-text-muted"></i><span>General</span></button>
                    <button onclick="window.open('/docs')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-manus-text-muted hover:bg-manus-surface3 transition-colors"><i class="fas fa-book w-4 text-center"></i><span>Docs</span><i class="fas fa-arrow-up-right-from-square text-[10px] ml-auto"></i></button>
                </nav>
            </div>
            <div class="flex-1 p-6 overflow-y-auto relative">
                <button onclick="closeSettings()" class="absolute top-4 right-4 p-2 rounded-lg hover:bg-manus-surface3 text-manus-text-dim hover:text-manus-text transition-colors"><i class="fas fa-xmark text-sm"></i></button>

                <!-- Account Tab -->
                <div id="settings-account" class="settings-tab-content">
                    <h2 class="text-xl font-semibold mb-6">Account</h2>
                    <div class="space-y-4">
                        <div class="flex items-center gap-4 p-4 bg-manus-surface2 rounded-xl border border-manus-border">
                            <div class="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0"><i class="fas fa-user text-white text-xl"></i></div>
                            <div class="flex-1 min-w-0"><div class="font-medium" id="account-display-name">User</div><div class="text-sm text-manus-text-muted" id="account-user-id">user@example.com</div></div>
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
                                        <span id="storage-type-label">Supabase PostgreSQL</span>
                                    </span>
                                </div>
                                <div class="text-xs text-manus-text-dim" id="storage-detail">Cloud synced</div>
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
                                <div class="flex items-center gap-2 text-sm text-manus-text-muted"><i class="fas fa-sparkles text-manus-accent"></i>Credits<span class="w-4 h-4 rounded-full border border-manus-text-dim flex items-center justify-center text-[10px] cursor-help" title="Credits are consumed when you use AI features.">?</span></div>
                                <span class="text-2xl font-bold" id="credit-balance">1000</span>
                            </div>
                            <div class="w-full h-2 bg-manus-surface3 rounded-full overflow-hidden">
                                <div id="credit-progress-bar" class="h-full bg-gradient-to-r from-manus-accent to-purple-500 rounded-full transition-all duration-500" style="width: 100%"></div>
                            </div>
                            <div class="flex justify-between mt-1.5 text-[11px] text-manus-text-dim"><span id="credits-used-label">0 used</span><span id="credits-total-label">1,000 total</span></div>
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-3 mb-6">
                        <div class="p-3 bg-manus-surface2 rounded-xl border border-manus-border text-center"><div class="text-lg mb-1">\u26A1</div><div class="text-xs font-medium">Standard</div><div class="text-xs text-manus-accent mt-1">15 cr/msg</div></div>
                        <div class="p-3 bg-manus-surface2 rounded-xl border border-manus-border text-center"><div class="text-lg mb-1">\uD83E\uDDE0</div><div class="text-xs font-medium">Pro</div><div class="text-xs text-manus-accent mt-1">45 cr/msg</div></div>
                        <div class="p-3 bg-manus-surface2 rounded-xl border border-manus-border text-center"><div class="text-lg mb-1">\uD83D\uDCA8</div><div class="text-xs font-medium">Lite</div><div class="text-xs text-manus-accent mt-1">8 cr/msg</div></div>
                    </div>
                    <div class="text-sm">
                        <div class="grid grid-cols-3 text-manus-text-dim pb-2 border-b border-manus-border"><span>Details</span><span>Date</span><span class="text-right">Credits</span></div>
                        <div id="usage-history" class="divide-y divide-manus-border/50 max-h-[200px] overflow-y-auto"></div>
                    </div>
                </div>

                <!-- Billing Tab -->
                <div id="settings-billing" class="settings-tab-content hidden">
                    <h2 class="text-xl font-semibold mb-2">Billing</h2>
                    <p class="text-sm text-manus-text-muted mb-6">Choose a plan that fits your needs. Credits never expire.</p>
                    <div id="payment-status" class="mb-4 p-3 rounded-xl text-xs flex items-center gap-2"></div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="pricing-cards">
                        <div class="p-5 bg-manus-surface2 rounded-xl border border-manus-border hover:border-manus-accent/30 transition-all">
                            <div class="text-sm font-medium text-manus-text-muted mb-1">Starter</div>
                            <div class="flex items-baseline gap-1 mb-4"><span class="text-3xl font-bold">$9.99</span><span class="text-sm text-manus-text-dim">one-time</span></div>
                            <ul class="space-y-2 mb-5 text-sm"><li class="flex items-center gap-2"><i class="fas fa-check text-green-400 text-xs"></i>5,000 credits</li><li class="flex items-center gap-2"><i class="fas fa-check text-green-400 text-xs"></i>Standard model access</li><li class="flex items-center gap-2"><i class="fas fa-check text-green-400 text-xs"></i>Chat history sync</li><li class="flex items-center gap-2"><i class="fas fa-check text-green-400 text-xs"></i>Email support</li></ul>
                            <button onclick="handlePurchase('starter')" id="btn-starter" class="w-full py-2.5 rounded-xl border border-manus-border text-sm font-medium hover:bg-manus-surface3 transition-colors">Get Starter</button>
                        </div>
                        <div class="p-5 bg-manus-surface2 rounded-xl border-2 border-manus-accent/40 relative hover:border-manus-accent/60 transition-all">
                            <div class="absolute -top-3 left-4 px-3 py-0.5 bg-manus-accent text-white text-[11px] font-medium rounded-full">Popular</div>
                            <div class="text-sm font-medium text-manus-text-muted mb-1">Pro</div>
                            <div class="flex items-baseline gap-1 mb-4"><span class="text-3xl font-bold">$29.99</span><span class="text-sm text-manus-text-dim">one-time</span></div>
                            <ul class="space-y-2 mb-5 text-sm"><li class="flex items-center gap-2"><i class="fas fa-check text-green-400 text-xs"></i>20,000 credits</li><li class="flex items-center gap-2"><i class="fas fa-check text-green-400 text-xs"></i>Pro model access</li><li class="flex items-center gap-2"><i class="fas fa-check text-green-400 text-xs"></i>Priority processing</li><li class="flex items-center gap-2"><i class="fas fa-check text-green-400 text-xs"></i>Chat history sync</li><li class="flex items-center gap-2"><i class="fas fa-check text-green-400 text-xs"></i>Priority support</li></ul>
                            <button onclick="handlePurchase('pro')" id="btn-pro" class="w-full py-2.5 rounded-xl bg-manus-accent hover:bg-manus-accent2 text-white text-sm font-medium transition-colors">Get Pro</button>
                        </div>
                    </div>
                </div>

                <!-- Tasks Tab (NEW) -->
                <div id="settings-tasks" class="settings-tab-content hidden">
                    <h2 class="text-xl font-semibold mb-2">Agent Tasks</h2>
                    <p class="text-sm text-manus-text-muted mb-6">Track autonomous task execution status.</p>
                    <div id="tasks-list" class="space-y-3">
                        <div class="px-4 py-8 text-center text-manus-text-dim text-xs"><i class="fas fa-list-check text-2xl mb-2 block opacity-30"></i>No tasks yet. Enable Agent Mode and send a request to start.</div>
                    </div>
                </div>

                <!-- General Tab -->
                <div id="settings-general" class="settings-tab-content hidden">
                    <h2 class="text-xl font-semibold mb-6">General</h2>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between p-4 bg-manus-surface2 rounded-xl border border-manus-border">
                            <div><div class="font-medium text-sm">Theme</div><div class="text-xs text-manus-text-muted mt-0.5">Appearance of the app</div></div>
                            <select class="bg-manus-surface3 border border-manus-border rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer"><option>Dark</option><option>Light</option><option>System</option></select>
                        </div>
                        <div class="flex items-center justify-between p-4 bg-manus-surface2 rounded-xl border border-manus-border">
                            <div><div class="font-medium text-sm">Language</div><div class="text-xs text-manus-text-muted mt-0.5">Interface language</div></div>
                            <select class="bg-manus-surface3 border border-manus-border rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer"><option>English</option><option>Myanmar (Burmese)</option><option>Chinese</option><option>Japanese</option></select>
                        </div>
                        <div class="flex items-center justify-between p-4 bg-manus-surface2 rounded-xl border border-manus-border">
                            <div><div class="font-medium text-sm">Send with Enter</div><div class="text-xs text-manus-text-muted mt-0.5">Use Shift+Enter for new line</div></div>
                            <label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked class="sr-only peer"><div class="w-10 h-5 bg-manus-surface3 rounded-full peer peer-checked:bg-manus-accent/60 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div></label>
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
