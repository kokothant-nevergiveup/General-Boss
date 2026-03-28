// ============================================================
// Autonomous Agentic System - Interactive Documentation
// ============================================================

// --- Navigation ---
let currentSection = 'overview';
let currentSubSection = null;

function navigateTo(section, subsection) {
  currentSection = section;
  currentSubSection = subsection || null;
  renderContent();
  
  // Update nav active states
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('active');
    if (el.dataset.section === section) el.classList.add('active');
  });
  
  // Scroll to top of content
  document.getElementById('docs-content').scrollTop = 0;
}

function renderContent() {
  const container = document.getElementById('docs-content-inner');
  if (!container) return;
  
  const sections = {
    'overview': renderOverview,
    'layer1': renderLayer1,
    'layer2': renderLayer2,
    'layer3': renderLayer3,
    'layer4': renderLayer4,
    'layer5': renderLayer5,
    'layer6': renderLayer6,
    'diagrams': renderDiagrams,
    'implementation': renderImplementation,
    'execution': renderExecution,
    'status': renderStatus
  };
  
  const renderer = sections[currentSection] || renderOverview;
  container.innerHTML = renderer();
  
  // Animate in
  container.querySelectorAll('.doc-card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(12px)';
    setTimeout(() => {
      card.style.transition = 'all 0.3s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, i * 60);
  });
}

// ============================================================
// SECTION: OVERVIEW
// ============================================================
function renderOverview() {
  return `
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
        Autonomous Agentic System
      </h1>
      <p class="text-gray-400 text-lg">Layer Architecture, Reports & Implementation Plans</p>
    </div>
    
    <!-- Architecture Diagram -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-layer-group text-purple-400"></i>
        System Architecture Overview
      </h2>
      <div class="relative">
        ${renderArchitectureDiagram()}
      </div>
    </div>
    
    <!-- Layer Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      ${renderLayerCard(1, 'Security & API Protection', 'fa-shield-halved', 'text-red-400', 'bg-red-500/10', 
        'API key isolation, rate limiting, input sanitization, CORS, environment-based secrets management',
        '95%')}
      ${renderLayerCard(2, 'Data Persistence (Supabase)', 'fa-database', 'text-blue-400', 'bg-blue-500/10',
        'PostgreSQL via PostgREST API, cross-device sync, profile/conversations/messages/usage tables',
        '75%')}
      ${renderLayerCard(3, 'Credit & Payment System', 'fa-credit-card', 'text-green-400', 'bg-green-500/10',
        'Stripe + LemonSqueezy dual-provider, webhook handlers, credit deduction per model, demo mode',
        '80%')}
      ${renderLayerCard(4, 'AI Processing & Fallback', 'fa-brain', 'text-purple-400', 'bg-purple-500/10',
        'OpenAI-compatible proxy, model fallback chain, streaming SSE, offline smart response generator',
        '90%')}
      ${renderLayerCard(5, 'Frontend Presentation', 'fa-desktop', 'text-cyan-400', 'bg-cyan-500/10',
        'Dark-mode SPA, Tailwind CSS, markdown rendering, conversation management, settings modal',
        '85%')}
      ${renderLayerCard(6, 'Edge Deployment & DevOps', 'fa-cloud', 'text-amber-400', 'bg-amber-500/10',
        'Cloudflare Pages/Workers, PM2 process management, Wrangler CLI, environment configuration',
        '70%')}
    </div>
    
    <!-- Current Status Summary -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-chart-pie text-green-400"></i>
        Current Project Status
      </h2>
      <div class="grid grid-cols-3 gap-4 mb-4">
        <div class="text-center p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
          <div class="text-3xl font-bold text-green-400">6</div>
          <div class="text-xs text-gray-400 mt-1">Completed Features</div>
        </div>
        <div class="text-center p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
          <div class="text-3xl font-bold text-amber-400">3</div>
          <div class="text-xs text-gray-400 mt-1">In Progress</div>
        </div>
        <div class="text-center p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
          <div class="text-3xl font-bold text-red-400">4</div>
          <div class="text-xs text-gray-400 mt-1">Pending</div>
        </div>
      </div>
      <div class="space-y-2 text-sm">
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Database schema created (supabase/schema.sql)</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Frontend UI loading & offline mode working</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">AI chat with streaming & model fallback operational</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Security middleware (rate limit, sanitization, CORS) active</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Payment checkout flow (demo mode) ready</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Credit system with per-model costs implemented</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-amber-400"></span><span class="text-gray-400">Supabase URL placeholder - needs real credentials</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-amber-400"></span><span class="text-gray-400">500 errors on DB endpoints - falls back to offline</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-amber-400"></span><span class="text-gray-400">README update & final commit pending</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-red-400"></span><span class="text-gray-500">Real Supabase/Firebase credential integration</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-red-400"></span><span class="text-gray-500">Stripe/LemonSqueezy production keys</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-red-400"></span><span class="text-gray-500">Row Level Security (RLS) policies</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-red-400"></span><span class="text-gray-500">Cloudflare Pages production deployment</span></div>
      </div>
    </div>`;
}

function renderLayerCard(num, title, icon, textColor, bgColor, desc, progress) {
  return `
    <div class="doc-card p-5 bg-[#141414] border border-[#2a2a2a] rounded-2xl cursor-pointer hover:border-purple-500/30 transition-all group"
         onclick="navigateTo('layer${num}')">
      <div class="flex items-start gap-3 mb-3">
        <div class="w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          <i class="fas ${icon} ${textColor}"></i>
        </div>
        <div>
          <div class="text-xs ${textColor} font-medium">Layer ${num}</div>
          <div class="font-semibold text-sm">${title}</div>
        </div>
      </div>
      <p class="text-xs text-gray-400 mb-3">${desc}</p>
      <div class="flex items-center gap-2">
        <div class="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div class="h-full ${bgColor.replace('/10', '/40')} rounded-full" style="width: ${progress}"></div>
        </div>
        <span class="text-[10px] text-gray-500">${progress}</span>
      </div>
    </div>`;
}

function renderArchitectureDiagram() {
  return `
    <div class="overflow-x-auto">
      <div class="min-w-[600px]">
        <!-- Top: User -->
        <div class="flex justify-center mb-4">
          <div class="px-6 py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-center">
            <i class="fas fa-user text-purple-400 mb-1"></i>
            <div class="text-xs font-medium text-purple-300">User / Client Browser</div>
          </div>
        </div>
        <div class="flex justify-center mb-4">
          <div class="w-px h-6 bg-purple-500/30"></div>
        </div>
        
        <!-- Layer 5: Frontend -->
        <div class="flex justify-center mb-2">
          <div class="w-full max-w-[540px] p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
            <div class="text-[10px] font-bold text-cyan-400 mb-1">LAYER 5: FRONTEND PRESENTATION</div>
            <div class="flex gap-2 flex-wrap">
              <span class="px-2 py-0.5 bg-cyan-500/10 rounded text-[10px] text-cyan-300">Tailwind CSS</span>
              <span class="px-2 py-0.5 bg-cyan-500/10 rounded text-[10px] text-cyan-300">Vanilla JS</span>
              <span class="px-2 py-0.5 bg-cyan-500/10 rounded text-[10px] text-cyan-300">Marked.js</span>
              <span class="px-2 py-0.5 bg-cyan-500/10 rounded text-[10px] text-cyan-300">Highlight.js</span>
            </div>
          </div>
        </div>
        <div class="flex justify-center mb-2">
          <div class="w-px h-4 bg-gray-600"></div>
        </div>
        
        <!-- Layer 1: Security -->
        <div class="flex justify-center mb-2">
          <div class="w-full max-w-[540px] p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
            <div class="text-[10px] font-bold text-red-400 mb-1">LAYER 1: SECURITY GATEWAY</div>
            <div class="flex gap-2 flex-wrap">
              <span class="px-2 py-0.5 bg-red-500/10 rounded text-[10px] text-red-300">Rate Limit</span>
              <span class="px-2 py-0.5 bg-red-500/10 rounded text-[10px] text-red-300">CORS</span>
              <span class="px-2 py-0.5 bg-red-500/10 rounded text-[10px] text-red-300">Sanitize</span>
              <span class="px-2 py-0.5 bg-red-500/10 rounded text-[10px] text-red-300">Env Secrets</span>
            </div>
          </div>
        </div>
        <div class="flex justify-center mb-2">
          <div class="w-px h-4 bg-gray-600"></div>
        </div>
        
        <!-- Middle: Hono Backend -->
        <div class="flex justify-center mb-2">
          <div class="w-full max-w-[540px] p-3 bg-[#1a1a1a] border border-[#333] rounded-xl">
            <div class="text-[10px] font-bold text-white mb-2">HONO EDGE BACKEND (src/index.tsx)</div>
            <div class="grid grid-cols-3 gap-2">
              <div class="p-2 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <div class="text-[10px] font-bold text-blue-400">L2: PERSISTENCE</div>
                <div class="text-[9px] text-gray-400 mt-0.5">Supabase PostgreSQL</div>
              </div>
              <div class="p-2 bg-green-500/5 border border-green-500/20 rounded-lg">
                <div class="text-[10px] font-bold text-green-400">L3: PAYMENTS</div>
                <div class="text-[9px] text-gray-400 mt-0.5">Stripe + LemonSqueezy</div>
              </div>
              <div class="p-2 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                <div class="text-[10px] font-bold text-purple-400">L4: AI ENGINE</div>
                <div class="text-[9px] text-gray-400 mt-0.5">OpenAI + Fallback</div>
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-center mb-2">
          <div class="w-px h-4 bg-gray-600"></div>
        </div>
        
        <!-- Layer 6: Deployment -->
        <div class="flex justify-center">
          <div class="w-full max-w-[540px] p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <div class="text-[10px] font-bold text-amber-400 mb-1">LAYER 6: EDGE DEPLOYMENT</div>
            <div class="flex gap-2 flex-wrap">
              <span class="px-2 py-0.5 bg-amber-500/10 rounded text-[10px] text-amber-300">Cloudflare Pages</span>
              <span class="px-2 py-0.5 bg-amber-500/10 rounded text-[10px] text-amber-300">Workers Runtime</span>
              <span class="px-2 py-0.5 bg-amber-500/10 rounded text-[10px] text-amber-300">Wrangler CLI</span>
              <span class="px-2 py-0.5 bg-amber-500/10 rounded text-[10px] text-amber-300">PM2</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

// ============================================================
// LAYER DETAIL RENDERERS
// ============================================================

function renderLayer1() {
  return `
    <div class="mb-6">
      <button onclick="navigateTo('overview')" class="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4 flex items-center gap-1">
        <i class="fas fa-arrow-left text-xs"></i> Back to Overview
      </button>
      <h1 class="text-2xl font-bold mb-2 flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
          <i class="fas fa-shield-halved text-red-400"></i>
        </div>
        Layer 1: Security & API Protection
      </h1>
      <p class="text-gray-400">The outermost defense layer that protects all /api/* routes</p>
    </div>
    
    <!-- Process Flow Diagram -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-diagram-project text-red-400"></i>
        Request Processing Flow
      </h3>
      <div class="overflow-x-auto">
        <div class="flex items-center gap-2 min-w-[700px]">
          ${flowStep('Incoming Request', 'fa-arrow-right', 'blue')}
          ${flowArrow()}
          ${flowStep('IP Extraction', 'fa-network-wired', 'gray')}
          ${flowArrow()}
          ${flowStep('Rate Limit Check', 'fa-gauge-high', 'amber')}
          ${flowArrow()}
          ${flowStep('CORS Headers', 'fa-globe', 'cyan')}
          ${flowArrow()}
          ${flowStep('Input Sanitize', 'fa-broom', 'green')}
          ${flowArrow()}
          ${flowStep('Route Handler', 'fa-check', 'green')}
        </div>
      </div>
    </div>
    
    <!-- Detailed Report -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4">Detailed Component Report</h3>
      <div class="space-y-4">
        ${reportItem('API Key Isolation', 'completed',
          'All API keys (OPENAI_API_KEY, STRIPE_SECRET_KEY, SUPABASE_SERVICE_KEY, etc.) are stored in environment variables via .dev.vars (local) or Cloudflare Secrets (production). The frontend JavaScript (app.js) never contains or accesses any secrets. All external API calls are proxied through server-side Hono routes.',
          'src/index.tsx - Bindings type definition, .dev.vars file')}
        ${reportItem('Rate Limiting', 'completed',
          'In-memory per-IP rate limiter: 30 requests per 60-second window. IP extracted from cf-connecting-ip header (Cloudflare) or x-forwarded-for. Returns 429 status with X-RateLimit-Remaining header and retryAfter value.',
          'src/index.tsx lines 41-65 - checkRateLimit() function + middleware')}
        ${reportItem('Input Sanitization', 'completed',
          'sanitize() function strips and truncates all user inputs to prevent injection. Default max length 10,000 chars. Applied to: message content (50,000 max), conversation titles (200), user IDs (100), settings detail (200).',
          'src/index.tsx line 67-70 - sanitize() helper')}
        ${reportItem('CORS Configuration', 'completed',
          'Configured for /api/* routes only. Allows all origins (*), GET/POST/DELETE/OPTIONS methods. Custom headers: Content-Type, X-Request-ID. Exposed: X-Model-Used, X-Fallback, X-RateLimit-Remaining.',
          'src/index.tsx lines 31-36 - cors() middleware')}
        ${reportItem('Request Timeout', 'completed',
          'AI API requests have a 30-second timeout via AbortController. Prevents hanging connections from blocking resources.',
          'src/index.tsx line 569 - tryAIRequest() with AbortController')}
      </div>
    </div>
    
    <!-- Implementation Plan -->
    ${renderImplementationPlan('Layer 1', [
      { step: 1, title: 'Environment Variables Setup', status: 'done', desc: 'Create .dev.vars with all API keys. Use wrangler pages secret put for production.' },
      { step: 2, title: 'Rate Limiter Middleware', status: 'done', desc: 'In-memory Map-based rate limiter applied to all /api/* routes.' },
      { step: 3, title: 'Input Sanitization', status: 'done', desc: 'Global sanitize() helper for all user-provided inputs.' },
      { step: 4, title: 'CORS Middleware', status: 'done', desc: 'Hono cors() middleware with specific allow headers.' },
      { step: 5, title: 'RLS Policies (Supabase)', status: 'pending', desc: 'Enable Row Level Security on all tables so users can only access their own data.' },
      { step: 6, title: 'Webhook Signature Verification', status: 'pending', desc: 'Verify Stripe/LemonSqueezy webhook signatures for production security.' }
    ])}
    
    <!-- Risk Assessment -->
    ${renderRiskAssessment([
      { risk: 'In-memory rate limit resets on worker restart', severity: 'low', mitigation: 'Workers are stateless per request in production. Consider Cloudflare Durable Objects for persistent rate limiting.' },
      { risk: 'CORS allows all origins', severity: 'medium', mitigation: 'Restrict to specific domain(s) in production deployment.' },
      { risk: 'No webhook signature verification', severity: 'high', mitigation: 'Add Stripe webhook signature verification using STRIPE_WEBHOOK_SECRET before processing payment events.' }
    ])}`;
}

function renderLayer2() {
  return `
    <div class="mb-6">
      <button onclick="navigateTo('overview')" class="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4 flex items-center gap-1">
        <i class="fas fa-arrow-left text-xs"></i> Back to Overview
      </button>
      <h1 class="text-2xl font-bold mb-2 flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <i class="fas fa-database text-blue-400"></i>
        </div>
        Layer 2: Data Persistence (Supabase)
      </h1>
      <p class="text-gray-400">PostgreSQL-backed persistence via Supabase PostgREST API</p>
    </div>
    
    <!-- Data Flow Diagram -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-diagram-project text-blue-400"></i>
        Data Flow Architecture
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
          <div class="text-xs font-bold text-blue-400 mb-2">CLIENT (Browser)</div>
          <div class="space-y-1 text-[11px] text-gray-400">
            <div>- userId in localStorage</div>
            <div>- Fetch /api/db/* endpoints</div>
            <div>- No direct DB access</div>
            <div>- Falls back to offline mode</div>
          </div>
        </div>
        <div class="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
          <div class="text-xs font-bold text-purple-400 mb-2">SERVER (Hono Edge)</div>
          <div class="space-y-1 text-[11px] text-gray-400">
            <div>- supabase() REST helper</div>
            <div>- ensureProfile() upsert</div>
            <div>- CRUD endpoints</div>
            <div>- Service key auth</div>
          </div>
        </div>
        <div class="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
          <div class="text-xs font-bold text-green-400 mb-2">DATABASE (Supabase)</div>
          <div class="space-y-1 text-[11px] text-gray-400">
            <div>- profiles (credits, settings)</div>
            <div>- conversations (user linked)</div>
            <div>- messages (cascade delete)</div>
            <div>- usage_history (audit trail)</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- ERD Diagram -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-table text-blue-400"></i>
        Entity Relationship Diagram
      </h3>
      <div class="overflow-x-auto">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-[600px]">
          ${erdTable('profiles', ['id TEXT PK', 'email TEXT', 'name TEXT', 'plan TEXT', 'credits INT', 'total_credits INT', 'settings JSONB', 'created_at', 'updated_at'], 'blue')}
          ${erdTable('conversations', ['id TEXT PK', 'user_id TEXT FK', 'title TEXT', 'created_at', 'updated_at'], 'green')}
          ${erdTable('messages', ['id BIGSERIAL PK', 'conversation_id FK', 'role TEXT', 'content TEXT', 'model TEXT', 'created_at'], 'purple')}
          ${erdTable('usage_history', ['id BIGSERIAL PK', 'user_id TEXT FK', 'detail TEXT', 'change_amount INT', 'type TEXT', 'created_at'], 'amber')}
        </div>
        <div class="mt-3 flex flex-wrap gap-3 text-[10px] text-gray-500">
          <span><i class="fas fa-arrow-right text-green-400"></i> conversations.user_id -> profiles.id (CASCADE)</span>
          <span><i class="fas fa-arrow-right text-purple-400"></i> messages.conversation_id -> conversations.id (CASCADE)</span>
          <span><i class="fas fa-arrow-right text-amber-400"></i> usage_history.user_id -> profiles.id (CASCADE)</span>
        </div>
      </div>
    </div>
    
    <!-- Report -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4">Detailed Component Report</h3>
      <div class="space-y-4">
        ${reportItem('Supabase REST Helper', 'completed',
          'Server-side supabase() function makes authenticated REST calls to PostgREST API. Supports GET, POST, PATCH, PUT, DELETE. Uses service_role key for admin access. Handles JSON parsing and error reporting.',
          'src/index.tsx lines 81-109')}
        ${reportItem('Profile Auto-Creation', 'completed',
          'ensureProfile() upserts a new profile with default 1000 credits when a user first interacts. Uses ignore-duplicates conflict resolution.',
          'src/index.tsx lines 112-123')}
        ${reportItem('Conversation CRUD', 'completed',
          'POST /api/db/conversations - saves all conversations with messages (delete+reinsert pattern). GET /api/db/conversations/:userId - loads with messages. DELETE /api/db/conversations/:convId - cascade deletes messages.',
          'src/index.tsx lines 126-221')}
        ${reportItem('Profile CRUD', 'completed',
          'GET /api/db/profile/:userId - returns credits, settings, usage history. POST /api/db/profile - partial update with optional usage history entry.',
          'src/index.tsx lines 224-300')}
        ${reportItem('Offline Fallback', 'completed',
          'Frontend checks /api/health for Supabase availability. If offline, shows "Database offline" badge and functions in memory-only mode. Data lost on refresh when offline.',
          'public/static/app.js - initializeFromDatabase()')}
        ${reportItem('Real Credential Integration', 'pending',
          'Current .dev.vars has placeholder SUPABASE_URL and SUPABASE_SERVICE_KEY. Need real Supabase project credentials to enable persistence.',
          '.dev.vars line 5-6')}
      </div>
    </div>
    
    ${renderImplementationPlan('Layer 2', [
      { step: 1, title: 'Schema Design', status: 'done', desc: 'supabase/schema.sql with 4 tables, indexes, and FK constraints.' },
      { step: 2, title: 'PostgREST Helper', status: 'done', desc: 'Server-side supabase() function for all DB operations.' },
      { step: 3, title: 'CRUD Endpoints', status: 'done', desc: 'All /api/db/* routes for conversations, profiles, credits, settings.' },
      { step: 4, title: 'Frontend Integration', status: 'done', desc: 'app.js loads from DB on init, saves on every mutation.' },
      { step: 5, title: 'Real Credentials', status: 'pending', desc: 'Create Supabase project, run schema.sql, copy URL + service key.' },
      { step: 6, title: 'Enable RLS', status: 'pending', desc: 'Uncomment RLS policies in schema.sql for production security.' },
      { step: 7, title: 'Connection Pooling', status: 'pending', desc: 'Consider Supabase connection pooling for high-traffic scenarios.' }
    ])}
    
    ${renderRiskAssessment([
      { risk: 'Placeholder Supabase credentials cause 500 errors', severity: 'high', mitigation: 'Create a Supabase project and replace placeholder values in .dev.vars immediately.' },
      { risk: 'No RLS - any user_id can access any data', severity: 'high', mitigation: 'Enable Row Level Security policies (commented in schema.sql) before production.' },
      { risk: 'Delete-reinsert pattern for messages is not atomic', severity: 'medium', mitigation: 'Consider Supabase RPC functions for transactional message updates.' },
      { risk: 'No pagination on conversation/message loading', severity: 'low', mitigation: 'Add limit/offset parameters for users with many conversations.' }
    ])}`;
}

function renderLayer3() {
  return `
    <div class="mb-6">
      <button onclick="navigateTo('overview')" class="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4 flex items-center gap-1">
        <i class="fas fa-arrow-left text-xs"></i> Back to Overview
      </button>
      <h1 class="text-2xl font-bold mb-2 flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
          <i class="fas fa-credit-card text-green-400"></i>
        </div>
        Layer 3: Credit & Payment System
      </h1>
      <p class="text-gray-400">Dual-provider payment with credit-based usage metering</p>
    </div>
    
    <!-- Payment Flow -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-money-bill-wave text-green-400"></i>
        Payment & Credit Flow
      </h3>
      <div class="overflow-x-auto">
        <div class="flex items-start gap-4 min-w-[700px]">
          <div class="flex-1 p-3 bg-green-500/5 border border-green-500/20 rounded-xl text-center">
            <i class="fas fa-user text-green-400 mb-1"></i>
            <div class="text-[10px] font-bold text-green-300">1. User selects plan</div>
            <div class="text-[9px] text-gray-500">Starter $9.99 / Pro $29.99</div>
          </div>
          <div class="flex items-center"><i class="fas fa-arrow-right text-gray-600"></i></div>
          <div class="flex-1 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-center">
            <i class="fas fa-server text-blue-400 mb-1"></i>
            <div class="text-[10px] font-bold text-blue-300">2. Server creates session</div>
            <div class="text-[9px] text-gray-500">Stripe > LemonSqueezy > Demo</div>
          </div>
          <div class="flex items-center"><i class="fas fa-arrow-right text-gray-600"></i></div>
          <div class="flex-1 p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl text-center">
            <i class="fas fa-globe text-purple-400 mb-1"></i>
            <div class="text-[10px] font-bold text-purple-300">3. External checkout</div>
            <div class="text-[9px] text-gray-500">Stripe/LS hosted page</div>
          </div>
          <div class="flex items-center"><i class="fas fa-arrow-right text-gray-600"></i></div>
          <div class="flex-1 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-center">
            <i class="fas fa-bell text-amber-400 mb-1"></i>
            <div class="text-[10px] font-bold text-amber-300">4. Webhook received</div>
            <div class="text-[9px] text-gray-500">Credits added to profile</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Credit Cost Table -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4">Credit Cost Matrix</h3>
      <table class="w-full text-sm">
        <thead>
          <tr class="text-gray-400 border-b border-[#2a2a2a]">
            <th class="text-left pb-2">Model</th>
            <th class="text-left pb-2">Display Name</th>
            <th class="text-right pb-2">Cost/Message</th>
            <th class="text-right pb-2">Messages (1000 cr)</th>
          </tr>
        </thead>
        <tbody class="text-gray-300">
          <tr class="border-b border-[#1a1a1a]">
            <td class="py-2 font-mono text-xs">gpt-5-mini</td>
            <td>Manus Standard <span class="text-amber-300">&#9889;</span></td>
            <td class="text-right text-green-400">15 credits</td>
            <td class="text-right">~66 messages</td>
          </tr>
          <tr class="border-b border-[#1a1a1a]">
            <td class="py-2 font-mono text-xs">gpt-5</td>
            <td>Manus Pro <span class="text-purple-300">&#129504;</span></td>
            <td class="text-right text-amber-400">45 credits</td>
            <td class="text-right">~22 messages</td>
          </tr>
          <tr>
            <td class="py-2 font-mono text-xs">gpt-5-nano</td>
            <td>Manus Lite <span class="text-cyan-300">&#128168;</span></td>
            <td class="text-right text-blue-400">8 credits</td>
            <td class="text-right">~125 messages</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4">Detailed Component Report</h3>
      <div class="space-y-4">
        ${reportItem('Payment Plans API', 'completed', 'GET /api/payment/plans returns Starter (5000 credits, $9.99) and Pro (20000 credits, $29.99) with feature lists.', 'src/index.tsx lines 409-422')}
        ${reportItem('Checkout Session', 'completed', 'POST /api/payment/checkout tries Stripe first, then LemonSqueezy, then returns demoMode:true. Server-side session creation with metadata (userId, plan, credits).', 'src/index.tsx lines 424-484')}
        ${reportItem('Stripe Webhook', 'completed', 'POST /api/payment/stripe-webhook handles checkout.session.completed events. Reads metadata, credits profile via Supabase.', 'src/index.tsx lines 487-513')}
        ${reportItem('LemonSqueezy Webhook', 'completed', 'POST /api/payment/ls-webhook handles order_created events with custom_data. Same credit addition logic as Stripe.', 'src/index.tsx lines 516-542')}
        ${reportItem('Demo Mode', 'completed', 'When no payment keys configured, frontend shows demo purchase dialog. Credits added locally and synced to DB.', 'public/static/app.js - showPurchaseDemo()')}
        ${reportItem('Credit Deduction', 'completed', 'deductCredits() subtracts per-model cost, logs to usage history, syncs to Supabase.', 'public/static/app.js lines 411-432')}
      </div>
    </div>
    
    ${renderImplementationPlan('Layer 3', [
      { step: 1, title: 'Plans Endpoint', status: 'done', desc: 'Static plan definitions with prices and features.' },
      { step: 2, title: 'Checkout Flow', status: 'done', desc: 'Server-side session creation for Stripe and LemonSqueezy.' },
      { step: 3, title: 'Webhook Handlers', status: 'done', desc: 'Both Stripe and LemonSqueezy webhook endpoints.' },
      { step: 4, title: 'Demo Mode Fallback', status: 'done', desc: 'Client-side simulated purchase when no keys configured.' },
      { step: 5, title: 'Credit Tracking', status: 'done', desc: 'Per-model cost deduction with usage history logging.' },
      { step: 6, title: 'Real Payment Keys', status: 'pending', desc: 'Configure Stripe test/live keys and price IDs.' },
      { step: 7, title: 'Webhook Signature Verify', status: 'pending', desc: 'Verify webhook authenticity before processing.' }
    ])}
    
    ${renderRiskAssessment([
      { risk: 'Webhook events not signature-verified', severity: 'high', mitigation: 'Implement Stripe webhook signature verification using STRIPE_WEBHOOK_SECRET before going live.' },
      { risk: 'Client-side credit count can be manipulated', severity: 'medium', mitigation: 'Always verify credit balance server-side before processing chat requests.' },
      { risk: 'Demo mode accidentally left in production', severity: 'medium', mitigation: 'Add environment check to disable demo purchases in production.' }
    ])}`;
}

function renderLayer4() {
  return `
    <div class="mb-6">
      <button onclick="navigateTo('overview')" class="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4 flex items-center gap-1">
        <i class="fas fa-arrow-left text-xs"></i> Back to Overview
      </button>
      <h1 class="text-2xl font-bold mb-2 flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <i class="fas fa-brain text-purple-400"></i>
        </div>
        Layer 4: AI Processing & Fallback Chain
      </h1>
      <p class="text-gray-400">Multi-model AI with streaming, fallback, and offline intelligence</p>
    </div>
    
    <!-- Fallback Chain Diagram -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-arrow-down-wide-short text-purple-400"></i>
        Model Fallback Chain
      </h3>
      <div class="space-y-3">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-xs font-bold text-green-400">1</div>
          <div class="flex-1 p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
            <div class="text-sm font-medium text-green-300">Requested Model (e.g. gpt-5-mini)</div>
            <div class="text-[10px] text-gray-500">Primary model chosen by user. 30s timeout.</div>
          </div>
          <span class="text-xs text-gray-500">If fails &#8594;</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-xs font-bold text-amber-400">2</div>
          <div class="flex-1 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <div class="text-sm font-medium text-amber-300">gpt-5-mini (Standard)</div>
            <div class="text-[10px] text-gray-500">First fallback. Skipped if already the primary.</div>
          </div>
          <span class="text-xs text-gray-500">If fails &#8594;</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-400">3</div>
          <div class="flex-1 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <div class="text-sm font-medium text-blue-300">gpt-5-nano (Lite)</div>
            <div class="text-[10px] text-gray-500">Cheapest model as last remote fallback.</div>
          </div>
          <span class="text-xs text-gray-500">If fails &#8594;</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-xs font-bold text-red-400">4</div>
          <div class="flex-1 p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
            <div class="text-sm font-medium text-red-300">Local Offline Generator</div>
            <div class="text-[10px] text-gray-500">Built-in smart responses based on keyword matching. No API call needed.</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4">Detailed Component Report</h3>
      <div class="space-y-4">
        ${reportItem('Streaming SSE Response', 'completed', 'Chat endpoint streams response via Server-Sent Events. Reader loop parses data: lines, extracts delta content, writes to client in real-time.', 'src/index.tsx lines 618-668')}
        ${reportItem('Model Fallback Chain', 'completed', 'tryAIRequest() attempts each model in chain. Sets X-Model-Used and X-Fallback response headers to inform client which model served the response.', 'src/index.tsx lines 547-614')}
        ${reportItem('Smart Offline Generator', 'completed', 'generateSmartResponse() produces keyword-matched markdown responses for common queries (slides, websites, code, general). Simulates typing with variable delays.', 'src/index.tsx lines 549-565')}
        ${reportItem('Credit Pre-check', 'completed', 'Returns 402 CREDITS_EXHAUSTED if client reports credits <= 0. Frontend shows dedicated overlay UI.', 'src/index.tsx line 595')}
        ${reportItem('System Prompt', 'completed', 'Manus AI persona with step-by-step reasoning, markdown formatting, and proactive suggestions. Configured in system message.', 'src/index.tsx lines 601')}
      </div>
    </div>
    
    ${renderImplementationPlan('Layer 4', [
      { step: 1, title: 'OpenAI Proxy Route', status: 'done', desc: 'POST /api/chat proxies to OpenAI-compatible endpoint.' },
      { step: 2, title: 'Streaming Parser', status: 'done', desc: 'SSE stream reader that extracts delta content from chunks.' },
      { step: 3, title: 'Fallback Chain', status: 'done', desc: 'Three-level model fallback with header reporting.' },
      { step: 4, title: 'Offline Generator', status: 'done', desc: 'Keyword-based smart response for total API failure.' },
      { step: 5, title: 'Server-side Credit Check', status: 'pending', desc: 'Verify credits from database, not client-reported value.' },
      { step: 6, title: 'Conversation Context Window', status: 'pending', desc: 'Truncate message history to fit model context limits.' }
    ])}`;
}

function renderLayer5() {
  return `
    <div class="mb-6">
      <button onclick="navigateTo('overview')" class="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4 flex items-center gap-1">
        <i class="fas fa-arrow-left text-xs"></i> Back to Overview
      </button>
      <h1 class="text-2xl font-bold mb-2 flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
          <i class="fas fa-desktop text-cyan-400"></i>
        </div>
        Layer 5: Frontend Presentation
      </h1>
      <p class="text-gray-400">Dark-mode SPA with responsive design and real-time UI updates</p>
    </div>
    
    <!-- UI Component Map -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-puzzle-piece text-cyan-400"></i>
        UI Component Architecture
      </h3>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        ${uiComponent('Sidebar', 'Conversation list, new chat, settings access, sync status', 'fa-bars')}
        ${uiComponent('Chat Container', 'Messages area, landing page, streaming content', 'fa-comments')}
        ${uiComponent('Input Area', 'Auto-resize textarea, file upload, send button', 'fa-keyboard')}
        ${uiComponent('Header', 'Model selector, credit display, settings gear', 'fa-heading')}
        ${uiComponent('Settings Modal', 'Account, Usage, Billing, General tabs', 'fa-gear')}
        ${uiComponent('Toast System', 'Info/success/warning/error notifications', 'fa-bell')}
        ${uiComponent('Error Overlays', 'Credits exhausted, API error, rate limited', 'fa-exclamation')}
        ${uiComponent('Thinking Indicator', 'Execution steps with spinner animation', 'fa-spinner')}
        ${uiComponent('Quick Actions', 'Slides, Website, Apps, Design cards', 'fa-bolt')}
      </div>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4">Component Report</h3>
      <div class="space-y-4">
        ${reportItem('Conversation Management', 'completed', 'Create, load, delete conversations. Grouped by date (Today/Yesterday/Older). Active state highlighting.', 'public/static/app.js - SIDEBAR & CONVERSATIONS section')}
        ${reportItem('Markdown Rendering', 'completed', 'Marked.js with Highlight.js syntax highlighting. Code block copy buttons. Table, blockquote, link styling.', 'public/static/style.css - .markdown-body styles')}
        ${reportItem('Credit Dashboard', 'completed', 'Real-time balance display in header and settings. Progress bar with color-coded warnings. Usage history table.', 'public/static/app.js - updateAllCreditDisplays()')}
        ${reportItem('Responsive Design', 'completed', 'Mobile sidebar toggle, collapsible layout, touch-friendly controls. Media queries for 768px breakpoint.', 'public/static/style.css - @media (max-width: 768px)')}
        ${reportItem('Keyboard Shortcuts', 'completed', 'Ctrl+K for new chat, Escape to close settings, Enter to send, Shift+Enter for newline.', 'public/static/app.js - document.addEventListener keydown')}
      </div>
    </div>
    
    ${renderImplementationPlan('Layer 5', [
      { step: 1, title: 'HTML Shell', status: 'done', desc: 'Server-rendered SPA shell in index.tsx with all components.' },
      { step: 2, title: 'Tailwind Styling', status: 'done', desc: 'CDN-loaded Tailwind with custom manus theme colors.' },
      { step: 3, title: 'JS Client Logic', status: 'done', desc: 'Vanilla JS for all interactions, streaming, state management.' },
      { step: 4, title: 'Custom CSS', status: 'done', desc: 'Animations, scrollbar, markdown, code block, responsive styles.' },
      { step: 5, title: 'Accessibility', status: 'pending', desc: 'ARIA labels, focus management, screen reader support.' },
      { step: 6, title: 'i18n/Localization', status: 'pending', desc: 'Myanmar/Chinese/Japanese language support beyond dropdown.' }
    ])}`;
}

function renderLayer6() {
  return `
    <div class="mb-6">
      <button onclick="navigateTo('overview')" class="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4 flex items-center gap-1">
        <i class="fas fa-arrow-left text-xs"></i> Back to Overview
      </button>
      <h1 class="text-2xl font-bold mb-2 flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <i class="fas fa-cloud text-amber-400"></i>
        </div>
        Layer 6: Edge Deployment & DevOps
      </h1>
      <p class="text-gray-400">Cloudflare Pages/Workers deployment with PM2 process management</p>
    </div>
    
    <!-- Deployment Pipeline -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-rocket text-amber-400"></i>
        Deployment Pipeline
      </h3>
      <div class="overflow-x-auto">
        <div class="flex items-center gap-2 min-w-[700px]">
          ${flowStep('Source Code', 'fa-code', 'blue')}
          ${flowArrow()}
          ${flowStep('vite build', 'fa-hammer', 'amber')}
          ${flowArrow()}
          ${flowStep('dist/ output', 'fa-folder', 'green')}
          ${flowArrow()}
          ${flowStep('wrangler deploy', 'fa-cloud-arrow-up', 'purple')}
          ${flowArrow()}
          ${flowStep('Cloudflare Edge', 'fa-globe', 'cyan')}
        </div>
      </div>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4">Component Report</h3>
      <div class="space-y-4">
        ${reportItem('Vite Build System', 'completed', 'Uses @hono/vite-build for Cloudflare Pages. Outputs _worker.js, _routes.json, and static assets to dist/.', 'vite.config.ts, package.json scripts')}
        ${reportItem('Wrangler Configuration', 'completed', 'wrangler.jsonc with compatibility_date 2026-03-23, nodejs_compat flag, pages_build_output_dir.', 'wrangler.jsonc')}
        ${reportItem('PM2 Process Manager', 'completed', 'ecosystem.config.cjs runs wrangler pages dev on port 3000 with env vars for sandbox development.', 'ecosystem.config.cjs')}
        ${reportItem('Cloudflare Pages Deploy', 'pending', 'npm run deploy triggers build + wrangler pages deploy. Needs CLOUDFLARE_API_TOKEN configured.', 'package.json deploy script')}
        ${reportItem('Secret Management', 'pending', 'Production secrets via wrangler pages secret put. All keys documented in README.', 'wrangler.jsonc comments')}
      </div>
    </div>
    
    ${renderImplementationPlan('Layer 6', [
      { step: 1, title: 'Vite + Hono Setup', status: 'done', desc: 'Project scaffolded with @hono/vite-build for Cloudflare Pages.' },
      { step: 2, title: 'PM2 Configuration', status: 'done', desc: 'ecosystem.config.cjs for sandbox development server.' },
      { step: 3, title: 'Build Pipeline', status: 'done', desc: 'npm run build produces deployable dist/ directory.' },
      { step: 4, title: 'Cloudflare API Key', status: 'pending', desc: 'Set up CLOUDFLARE_API_TOKEN for deployment.' },
      { step: 5, title: 'Production Deploy', status: 'pending', desc: 'Create Pages project and deploy with wrangler.' },
      { step: 6, title: 'Secret Configuration', status: 'pending', desc: 'Set all env vars as Cloudflare Pages secrets.' },
      { step: 7, title: 'Custom Domain', status: 'pending', desc: 'Optional: Add custom domain to Pages project.' },
      { step: 8, title: 'CI/CD Pipeline', status: 'pending', desc: 'Optional: GitHub Actions for auto-deploy on push.' }
    ])}`;
}

// ============================================================
// DIAGRAMS SECTION
// ============================================================
function renderDiagrams() {
  return `
    <div class="mb-6">
      <h1 class="text-2xl font-bold mb-2">Process Diagrams</h1>
      <p class="text-gray-400">Visual representations of all system processes</p>
    </div>
    
    <!-- Request Lifecycle -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-arrows-spin text-purple-400"></i>
        Complete Request Lifecycle
      </h3>
      <div class="space-y-2 text-sm">
        ${lifecycleStep(1, 'User types message in textarea', 'fa-keyboard', 'cyan')}
        ${lifecycleStep(2, 'Frontend checks credits > 0', 'fa-coins', 'green')}
        ${lifecycleStep(3, 'Create conversation if new (save to Supabase)', 'fa-plus', 'blue')}
        ${lifecycleStep(4, 'Render user message + thinking indicator', 'fa-spinner', 'purple')}
        ${lifecycleStep(5, 'POST /api/chat with messages, model, credits', 'fa-paper-plane', 'amber')}
        ${lifecycleStep(6, 'Security middleware: rate limit + CORS', 'fa-shield', 'red')}
        ${lifecycleStep(7, 'Server checks credit pre-condition', 'fa-check', 'green')}
        ${lifecycleStep(8, 'Try primary model -> fallback chain', 'fa-brain', 'purple')}
        ${lifecycleStep(9, 'Stream SSE response back to client', 'fa-stream', 'cyan')}
        ${lifecycleStep(10, 'Frontend renders streaming markdown', 'fa-file-lines', 'blue')}
        ${lifecycleStep(11, 'Save assistant message to conversation', 'fa-floppy-disk', 'green')}
        ${lifecycleStep(12, 'Deduct credits, update profile in Supabase', 'fa-minus', 'amber')}
      </div>
    </div>
    
    <!-- Error Handling Matrix -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-bug text-red-400"></i>
        Error Handling Matrix
      </h3>
      <table class="w-full text-xs">
        <thead>
          <tr class="text-gray-400 border-b border-[#2a2a2a]">
            <th class="text-left pb-2 pr-3">Error Type</th>
            <th class="text-left pb-2 pr-3">HTTP Code</th>
            <th class="text-left pb-2 pr-3">UI Response</th>
            <th class="text-left pb-2">Recovery Action</th>
          </tr>
        </thead>
        <tbody class="text-gray-300">
          <tr class="border-b border-[#1a1a1a]"><td class="py-2 pr-3">Credits Exhausted</td><td class="pr-3 text-amber-400">402</td><td class="pr-3">Overlay + error card</td><td>Upgrade plan button</td></tr>
          <tr class="border-b border-[#1a1a1a]"><td class="py-2 pr-3">Rate Limited</td><td class="pr-3 text-blue-400">429</td><td class="pr-3">Error card + timer</td><td>Retry in 10s button</td></tr>
          <tr class="border-b border-[#1a1a1a]"><td class="py-2 pr-3">Model Unavailable</td><td class="pr-3 text-purple-400">-</td><td class="pr-3">Fallback badge</td><td>Auto-switch model</td></tr>
          <tr class="border-b border-[#1a1a1a]"><td class="py-2 pr-3">All APIs Down</td><td class="pr-3 text-red-400">-</td><td class="pr-3">Offline mode overlay</td><td>Local response gen</td></tr>
          <tr class="border-b border-[#1a1a1a]"><td class="py-2 pr-3">DB Unavailable</td><td class="pr-3 text-amber-400">500</td><td class="pr-3">"Offline" badge</td><td>Memory-only mode</td></tr>
          <tr><td class="py-2 pr-3">Payment Failed</td><td class="pr-3 text-amber-400">503</td><td class="pr-3">Toast warning</td><td>Demo mode fallback</td></tr>
        </tbody>
      </table>
    </div>
    
    <!-- File Structure -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-folder-tree text-green-400"></i>
        Project File Structure
      </h3>
      <pre class="text-xs text-gray-400 bg-[#0d0d0d] p-4 rounded-xl border border-[#2a2a2a] overflow-x-auto"><code>webapp/
&#9500;&#9472;&#9472; src/
&#9474;   &#9492;&#9472;&#9472; index.tsx          <span class="text-purple-400"># Hono backend + HTML shell (1082 lines)</span>
&#9500;&#9472;&#9472; public/static/
&#9474;   &#9500;&#9472;&#9472; app.js             <span class="text-cyan-400"># Frontend JavaScript (1014 lines)</span>
&#9474;   &#9500;&#9472;&#9472; style.css          <span class="text-blue-400"># Custom CSS animations & styles (370 lines)</span>
&#9474;   &#9492;&#9472;&#9472; docs.js            <span class="text-green-400"># This documentation system</span>
&#9500;&#9472;&#9472; supabase/
&#9474;   &#9492;&#9472;&#9472; schema.sql         <span class="text-amber-400"># Database schema (67 lines)</span>
&#9500;&#9472;&#9472; .dev.vars              <span class="text-red-400"># Environment variables (local)</span>
&#9500;&#9472;&#9472; ecosystem.config.cjs   <span class="text-gray-500"># PM2 configuration</span>
&#9500;&#9472;&#9472; wrangler.jsonc         <span class="text-gray-500"># Cloudflare config</span>
&#9500;&#9472;&#9472; package.json           <span class="text-gray-500"># Dependencies & scripts</span>
&#9492;&#9472;&#9472; README.md              <span class="text-gray-500"># Project documentation</span></code></pre>
    </div>`;
}

// ============================================================
// IMPLEMENTATION & EXECUTION PLANS
// ============================================================
function renderImplementation() {
  return `
    <div class="mb-6">
      <h1 class="text-2xl font-bold mb-2">Step-by-Step Implementation Plan</h1>
      <p class="text-gray-400">Comprehensive build & integration plan for the entire system</p>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-list-check text-green-400"></i>
        Phase 1: Foundation (Completed)
      </h3>
      <div class="space-y-3">
        ${phaseStep('1.1', 'Project Scaffolding', 'done', 'Hono + Vite + Cloudflare Pages template. Package.json scripts. Git initialization.')}
        ${phaseStep('1.2', 'Database Schema', 'done', 'PostgreSQL tables for profiles, conversations, messages, usage_history with FK constraints and indexes.')}
        ${phaseStep('1.3', 'Security Middleware', 'done', 'Rate limiting, CORS, input sanitization applied to all /api/* routes.')}
        ${phaseStep('1.4', 'Basic AI Proxy', 'done', 'POST /api/chat with OpenAI-compatible endpoint, streaming, and model fallback.')}
        ${phaseStep('1.5', 'Frontend SPA', 'done', 'Dark-mode UI with sidebar, chat, settings, model selector, credit display.')}
      </div>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-spinner text-amber-400"></i>
        Phase 2: Integration (In Progress)
      </h3>
      <div class="space-y-3">
        ${phaseStep('2.1', 'Supabase Project Setup', 'in-progress', 'Create Supabase project, run schema.sql, obtain URL + service role key.')}
        ${phaseStep('2.2', 'Credential Configuration', 'in-progress', 'Replace placeholder values in .dev.vars with real Supabase credentials.')}
        ${phaseStep('2.3', 'DB Connection Verification', 'pending', 'Verify all /api/db/* endpoints return success with real database.')}
        ${phaseStep('2.4', 'Payment Key Setup', 'pending', 'Configure Stripe test keys and product/price IDs.')}
        ${phaseStep('2.5', 'End-to-End Testing', 'pending', 'Full flow test: register -> chat -> credit deduction -> payment -> credit addition.')}
      </div>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-flag-checkered text-red-400"></i>
        Phase 3: Production Hardening (Pending)
      </h3>
      <div class="space-y-3">
        ${phaseStep('3.1', 'Row Level Security', 'pending', 'Enable RLS policies so users can only read/write their own data.')}
        ${phaseStep('3.2', 'Webhook Verification', 'pending', 'Add Stripe webhook signature verification for payment security.')}
        ${phaseStep('3.3', 'Server-side Credit Check', 'pending', 'Verify credits from database instead of trusting client-reported value.')}
        ${phaseStep('3.4', 'CORS Restriction', 'pending', 'Limit CORS origin to production domain only.')}
        ${phaseStep('3.5', 'Error Monitoring', 'pending', 'Add structured logging and error tracking (Sentry or similar).')}
        ${phaseStep('3.6', 'Cloudflare Deploy', 'pending', 'Set up CLOUDFLARE_API_TOKEN, create Pages project, deploy to production.')}
        ${phaseStep('3.7', 'Production Secrets', 'pending', 'Set all secrets via wrangler pages secret put.')}
        ${phaseStep('3.8', 'Custom Domain', 'pending', 'Configure custom domain and SSL on Cloudflare Pages.')}
      </div>
    </div>`;
}

function renderExecution() {
  return `
    <div class="mb-6">
      <h1 class="text-2xl font-bold mb-2">Risk-Free Incremental Execution Strategy</h1>
      <p class="text-gray-400">Safe deployment approach with rollback capabilities at every step</p>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-shield-halved text-green-400"></i>
        Core Safety Principles
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
          <div class="text-xs font-bold text-green-400 mb-1"><i class="fas fa-check mr-1"></i> Offline-First</div>
          <div class="text-[11px] text-gray-400">App works without database. All features degrade gracefully to offline mode.</div>
        </div>
        <div class="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
          <div class="text-xs font-bold text-blue-400 mb-1"><i class="fas fa-check mr-1"></i> Demo-First Payments</div>
          <div class="text-[11px] text-gray-400">Payment system works in demo mode. Real keys are additive, not required.</div>
        </div>
        <div class="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl">
          <div class="text-xs font-bold text-purple-400 mb-1"><i class="fas fa-check mr-1"></i> Fallback AI</div>
          <div class="text-[11px] text-gray-400">Even without API keys, the local smart response generator provides basic functionality.</div>
        </div>
        <div class="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
          <div class="text-xs font-bold text-amber-400 mb-1"><i class="fas fa-check mr-1"></i> Git Versioned</div>
          <div class="text-[11px] text-gray-400">Every change committed. Rollback to any previous state with git revert.</div>
        </div>
      </div>
    </div>
    
    <!-- Step-by-step safe execution -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-stairs text-purple-400"></i>
        Incremental Deployment Steps
      </h3>
      <div class="space-y-4">
        ${executionStep(1, 'Verify Current State', 'green',
          'Run health check, test all endpoints, confirm offline mode works.',
          'curl /api/health, /api/models, /api/chat',
          'If any endpoint fails, check PM2 logs and rebuild.')}
        ${executionStep(2, 'Connect Supabase', 'blue',
          'Create Supabase project, run schema.sql, add real credentials to .dev.vars.',
          'Replace placeholder URL/KEY, restart server, check /api/health shows supabase:true',
          'Revert .dev.vars to placeholders. App falls back to offline mode.')}
        ${executionStep(3, 'Test Database CRUD', 'blue',
          'Verify conversations save/load, profile create/update, credit tracking works.',
          'Create conversation, reload page, verify data persists.',
          'Clear .wrangler state, revert credentials. No data loss as DB is external.')}
        ${executionStep(4, 'Add Payment Keys', 'green',
          'Configure Stripe test keys. Test checkout flow in test mode.',
          'Set STRIPE_SECRET_KEY, STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO in .dev.vars.',
          'Remove payment keys. Demo mode automatically activates.')}
        ${executionStep(5, 'Deploy to Cloudflare', 'amber',
          'Build and deploy to Cloudflare Pages. Set production secrets.',
          'npm run build && wrangler pages deploy dist',
          'Previous deployment still active. Redeploy previous commit.')}
        ${executionStep(6, 'Enable RLS', 'red',
          'Run RLS policy SQL in Supabase dashboard. Test that users cannot access others\' data.',
          'Uncomment and run RLS policies from schema.sql.',
          'Disable RLS policies in Supabase dashboard immediately.')}
        ${executionStep(7, 'Production Monitoring', 'purple',
          'Set up error tracking, monitor Cloudflare analytics, verify webhook deliveries.',
          'Check Cloudflare dashboard, Supabase logs, Stripe webhook logs.',
          'Scale down or pause via Cloudflare dashboard.')}
      </div>
    </div>`;
}

function renderStatus() {
  return `
    <div class="mb-6">
      <h1 class="text-2xl font-bold mb-2">Live System Status</h1>
      <p class="text-gray-400">Real-time health check of all system components</p>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-heartbeat text-red-400"></i>
        Service Health
      </h3>
      <div id="health-status" class="space-y-3">
        <div class="text-sm text-gray-400 flex items-center gap-2">
          <div class="agent-spinner w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full"></div>
          Checking services...
        </div>
      </div>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-link text-blue-400"></i>
        API Endpoint Tests
      </h3>
      <div id="endpoint-tests" class="space-y-2">
        <div class="text-sm text-gray-400">Running tests...</div>
      </div>
    </div>`;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function flowStep(label, icon, color) {
  const colors = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
    green: 'bg-green-500/10 border-green-500/20 text-green-300',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    red: 'bg-red-500/10 border-red-500/20 text-red-300',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
    cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300',
    gray: 'bg-gray-500/10 border-gray-500/20 text-gray-300'
  };
  return `<div class="flex-shrink-0 px-3 py-2 ${colors[color]} border rounded-lg text-center">
    <i class="fas ${icon} text-xs block mb-1"></i>
    <div class="text-[10px] font-medium whitespace-nowrap">${label}</div>
  </div>`;
}

function flowArrow() {
  return `<div class="flex-shrink-0 text-gray-600"><i class="fas fa-arrow-right text-xs"></i></div>`;
}

function reportItem(title, status, desc, location) {
  const statusBadge = status === 'completed' 
    ? '<span class="px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] rounded-full border border-green-500/20">Completed</span>'
    : '<span class="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] rounded-full border border-amber-500/20">Pending</span>';
  return `
    <div class="p-4 bg-[#1a1a1a] rounded-xl border border-[#222]">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">${title}</span>
        ${statusBadge}
      </div>
      <p class="text-xs text-gray-400 mb-2">${desc}</p>
      ${location ? `<div class="text-[10px] text-gray-600 font-mono"><i class="fas fa-file-code mr-1"></i>${location}</div>` : ''}
    </div>`;
}

function erdTable(name, fields, color) {
  const colors = { blue: 'border-blue-500/30 text-blue-400', green: 'border-green-500/30 text-green-400', purple: 'border-purple-500/30 text-purple-400', amber: 'border-amber-500/30 text-amber-400' };
  return `
    <div class="border ${colors[color].split(' ')[0]} rounded-lg overflow-hidden">
      <div class="px-3 py-1.5 bg-${color}-500/10 text-xs font-bold ${colors[color].split(' ')[1]}">${name}</div>
      <div class="p-2 space-y-0.5">
        ${fields.map(f => `<div class="text-[10px] text-gray-400 font-mono">${f}</div>`).join('')}
      </div>
    </div>`;
}

function uiComponent(name, desc, icon) {
  return `
    <div class="p-3 bg-[#1a1a1a] rounded-xl border border-[#222]">
      <div class="flex items-center gap-2 mb-1">
        <i class="fas ${icon} text-cyan-400/60 text-xs"></i>
        <span class="text-xs font-medium">${name}</span>
      </div>
      <div class="text-[10px] text-gray-500">${desc}</div>
    </div>`;
}

function renderImplementationPlan(layerName, steps) {
  return `
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-list-check text-green-400"></i>
        Implementation Plan - ${layerName}
      </h3>
      <div class="space-y-2">
        ${steps.map(s => {
          const icon = s.status === 'done' ? 'fa-circle-check text-green-400' : 'fa-circle text-gray-600';
          const textClass = s.status === 'done' ? 'text-gray-300' : 'text-gray-400';
          return `<div class="flex items-start gap-3 p-2 rounded-lg ${s.status === 'done' ? 'bg-green-500/5' : 'bg-[#1a1a1a]'}">
            <div class="flex-shrink-0 mt-0.5"><i class="fas ${icon} text-sm"></i></div>
            <div>
              <div class="text-xs font-medium ${textClass}">Step ${s.step}: ${s.title}</div>
              <div class="text-[10px] text-gray-500">${s.desc}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function renderRiskAssessment(risks) {
  return `
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-triangle-exclamation text-amber-400"></i>
        Risk Assessment
      </h3>
      <div class="space-y-3">
        ${risks.map(r => {
          const sevColors = { low: 'bg-blue-500/10 text-blue-400 border-blue-500/20', medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20', high: 'bg-red-500/10 text-red-400 border-red-500/20' };
          return `<div class="p-3 ${sevColors[r.severity].split(' ')[0]} border ${sevColors[r.severity].split(' ')[2]} rounded-xl">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-medium ${sevColors[r.severity].split(' ')[1]}">${r.risk}</span>
              <span class="text-[10px] uppercase font-bold ${sevColors[r.severity].split(' ')[1]}">${r.severity}</span>
            </div>
            <div class="text-[10px] text-gray-400"><i class="fas fa-shield-halved mr-1"></i>Mitigation: ${r.mitigation}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function lifecycleStep(num, text, icon, color) {
  return `<div class="flex items-center gap-3 p-2 bg-${color}-500/5 rounded-lg">
    <div class="w-6 h-6 rounded-full bg-${color}-500/20 flex items-center justify-center text-[10px] font-bold text-${color}-400 flex-shrink-0">${num}</div>
    <i class="fas ${icon} text-${color}-400/60 text-xs flex-shrink-0"></i>
    <span class="text-xs text-gray-300">${text}</span>
  </div>`;
}

function phaseStep(num, title, status, desc) {
  const icons = { done: 'fa-circle-check text-green-400', 'in-progress': 'fa-spinner fa-spin text-amber-400', pending: 'fa-circle text-gray-600' };
  const bg = status === 'done' ? 'bg-green-500/5' : status === 'in-progress' ? 'bg-amber-500/5' : 'bg-[#1a1a1a]';
  return `<div class="flex items-start gap-3 p-3 ${bg} rounded-xl">
    <i class="fas ${icons[status]} mt-0.5"></i>
    <div>
      <div class="text-xs font-medium">${num}. ${title}</div>
      <div class="text-[10px] text-gray-500">${desc}</div>
    </div>
  </div>`;
}

function executionStep(num, title, color, desc, verify, rollback) {
  return `
    <div class="p-4 bg-[#1a1a1a] rounded-xl border border-[#222]">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-7 h-7 rounded-lg bg-${color}-500/10 flex items-center justify-center text-xs font-bold text-${color}-400">${num}</div>
        <span class="text-sm font-medium">${title}</span>
      </div>
      <p class="text-xs text-gray-400 mb-2">${desc}</p>
      <div class="grid grid-cols-2 gap-2">
        <div class="p-2 bg-green-500/5 border border-green-500/10 rounded-lg">
          <div class="text-[10px] font-bold text-green-400 mb-0.5"><i class="fas fa-check mr-1"></i>Verify</div>
          <div class="text-[10px] text-gray-500">${verify}</div>
        </div>
        <div class="p-2 bg-red-500/5 border border-red-500/10 rounded-lg">
          <div class="text-[10px] font-bold text-red-400 mb-0.5"><i class="fas fa-rotate-left mr-1"></i>Rollback</div>
          <div class="text-[10px] text-gray-500">${rollback}</div>
        </div>
      </div>
    </div>`;
}

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  renderContent();
  
  // Run health check if on status page
  if (currentSection === 'status') {
    runHealthCheck();
  }
});

async function runHealthCheck() {
  const container = document.getElementById('health-status');
  if (!container) return;
  
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    
    container.innerHTML = Object.entries(data.services || {}).map(([name, status]) => {
      const icon = status ? 'fa-circle-check text-green-400' : 'fa-circle-xmark text-red-400';
      const label = status ? 'Online' : 'Offline';
      return `<div class="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-xl">
        <div class="flex items-center gap-2">
          <i class="fas ${icon}"></i>
          <span class="text-sm font-medium capitalize">${name}</span>
        </div>
        <span class="text-xs ${status ? 'text-green-400' : 'text-red-400'}">${label}</span>
      </div>`;
    }).join('');
  } catch {
    container.innerHTML = '<div class="p-3 bg-red-500/10 text-red-400 rounded-xl text-sm">Failed to reach health endpoint</div>';
  }
  
  // Test endpoints
  const testContainer = document.getElementById('endpoint-tests');
  if (!testContainer) return;
  
  const endpoints = [
    { path: '/api/health', method: 'GET' },
    { path: '/api/models', method: 'GET' },
    { path: '/api/payment/plans', method: 'GET' }
  ];
  
  const results = [];
  for (const ep of endpoints) {
    try {
      const start = Date.now();
      const res = await fetch(ep.path);
      const ms = Date.now() - start;
      results.push(`<div class="flex items-center justify-between p-2 bg-[#1a1a1a] rounded-lg">
        <div class="flex items-center gap-2 text-xs">
          <span class="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px] font-mono">${ep.method}</span>
          <span class="font-mono text-gray-300">${ep.path}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] text-gray-500">${ms}ms</span>
          <span class="text-xs ${res.ok ? 'text-green-400' : 'text-red-400'}">${res.status}</span>
        </div>
      </div>`);
    } catch {
      results.push(`<div class="flex items-center justify-between p-2 bg-red-500/5 rounded-lg">
        <span class="text-xs font-mono text-gray-400">${ep.method} ${ep.path}</span>
        <span class="text-xs text-red-400">Error</span>
      </div>`);
    }
  }
  testContainer.innerHTML = results.join('');
}
