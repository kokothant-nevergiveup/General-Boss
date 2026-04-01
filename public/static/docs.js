// ============================================================
// General Boss - Interactive Documentation
// Phase 5: Production & Deployment Hardening
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
    'phase4': renderPhase4,
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
      <div class="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs text-amber-300">
        <i class="fas fa-rocket"></i> Phase 5: Production & Deployment - In Progress
      </div>
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
    
    <!-- Phase 4 Highlight Card -->
    <div class="doc-card p-6 bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/20 rounded-2xl mb-6">
      <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
        <i class="fas fa-wand-magic-sparkles text-purple-400"></i>
        Phase 4: Agentic Execution System
      </h2>
      <p class="text-sm text-gray-400 mb-4">Evolving from chat assistant to autonomous task execution engine</p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center">
          <i class="fas fa-brain text-purple-400 text-lg mb-2"></i>
          <div class="text-xs font-medium text-purple-300">Agentic Planning</div>
          <div class="text-[10px] text-gray-500 mt-1">Task decomposition & thinking UI</div>
        </div>
        <div class="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-center">
          <i class="fas fa-display text-cyan-400 text-lg mb-2"></i>
          <div class="text-xs font-medium text-cyan-300">Multimodal Output</div>
          <div class="text-[10px] text-gray-500 mt-1">Slides, Web Preview, File-to-Web</div>
        </div>
        <div class="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center">
          <i class="fas fa-clock-rotate-left text-blue-400 text-lg mb-2"></i>
          <div class="text-xs font-medium text-blue-300">Async Persistence</div>
          <div class="text-[10px] text-gray-500 mt-1">Task states & notifications</div>
        </div>
        <div class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
          <i class="fas fa-palette text-amber-400 text-lg mb-2"></i>
          <div class="text-xs font-medium text-amber-300">General Boss UI</div>
          <div class="text-[10px] text-gray-500 mt-1">Dark mode, quick actions, mobile</div>
        </div>
      </div>
      <div class="mt-4 text-center">
        <button onclick="navigateTo('phase4')" class="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-sm rounded-xl border border-purple-500/20 transition-colors">
          <i class="fas fa-arrow-right mr-1.5"></i>View Phase 4 Details
        </button>
      </div>
    </div>
    
    <!-- Layer Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      ${renderLayerCard(1, 'Security & API Protection', 'fa-shield-halved', 'text-red-400', 'bg-red-500/10', 
        'API key isolation, rate limiting, input sanitization, CORS, environment-based secrets management',
        '95%')}
      ${renderLayerCard(2, 'Data Persistence (Supabase)', 'fa-database', 'text-blue-400', 'bg-blue-500/10',
        'PostgreSQL via PostgREST API, cross-device sync, task state tracking, notification persistence',
        '80%')}
      ${renderLayerCard(3, 'Credit & Payment System', 'fa-credit-card', 'text-green-400', 'bg-green-500/10',
        'Stripe + LemonSqueezy dual-provider, webhook handlers, credit deduction per model, task cost tracking',
        '80%')}
      ${renderLayerCard(4, 'AI Processing & Agentic Planning', 'fa-brain', 'text-purple-400', 'bg-purple-500/10',
        'Task decomposition, thinking process UI, Agent Mode toggle, model fallback chain, streaming SSE',
        '90%')}
      ${renderLayerCard(5, 'Frontend & Multimodal Output', 'fa-desktop', 'text-cyan-400', 'bg-cyan-500/10',
        'Slides generator, web designer preview, General Boss landing, dark mode, notification system',
        '90%')}
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
          <div class="text-3xl font-bold text-green-400">14</div>
          <div class="text-xs text-gray-400 mt-1">Completed Features</div>
        </div>
        <div class="text-center p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
          <div class="text-3xl font-bold text-amber-400">3</div>
          <div class="text-xs text-gray-400 mt-1">In Progress</div>
        </div>
        <div class="text-center p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
          <div class="text-3xl font-bold text-red-400">5</div>
          <div class="text-xs text-gray-400 mt-1">Pending</div>
        </div>
      </div>
      <div class="space-y-2 text-sm">
        <div class="text-xs font-bold text-gray-500 uppercase mt-3 mb-2">Phase 1-3 (Foundation)</div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Database schema created (supabase/schema.sql)</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">AI chat with streaming & model fallback operational</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Security middleware (rate limit, sanitization, CORS) active</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Payment checkout flow (demo mode) ready</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Credit system with per-model costs implemented</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Conversation CRUD with Supabase persistence</span></div>
        
        <div class="text-xs font-bold text-purple-400 uppercase mt-4 mb-2">Phase 4 (Agentic Execution)</div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">General Boss landing page ("What can I do for you?") with quick-action cards</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Agent Mode toggle with task decomposition & thinking process UI</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Slides Generator: Markdown-to-slide with interactive preview modal</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Web Designer: HTML/CSS code preview with sandbox iframe & device toggle</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Notification system with bell icon, panel, and task completion alerts</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Settings modal with Tasks tab for agent task tracking</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Dark-mode aesthetic with agent glow effects & mobile responsiveness</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Documentation updated to reflect Phase 4 architecture</span></div>

        <div class="text-xs font-bold text-amber-400 uppercase mt-4 mb-2">Phase 5 (Production & Deployment)</div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Persistent task_executions schema, indexes, and update triggers added</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Task execution API routes added for save/load/delete flows</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Health endpoint now reports production readiness and missing required secrets</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span><span class="text-gray-300">Deployment templates updated with APP_ENV and ALLOWED_ORIGIN guidance</span></div>
        
        <div class="text-xs font-bold text-amber-400 uppercase mt-4 mb-2">In Progress</div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-amber-400"></span><span class="text-gray-400">Supabase URL placeholder - needs real credentials</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-amber-400"></span><span class="text-gray-400">File-to-Web transform (upload file -> interactive landing page)</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-amber-400"></span><span class="text-gray-400">Background execution persistence (survives browser close)</span></div>
        
        <div class="text-xs font-bold text-red-400 uppercase mt-4 mb-2">Pending</div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-red-400"></span><span class="text-gray-500">Real Supabase/Firebase credential integration</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-red-400"></span><span class="text-gray-500">Stripe/LemonSqueezy production keys</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-red-400"></span><span class="text-gray-500">Row Level Security (RLS) policies</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-red-400"></span><span class="text-gray-500">Cloudflare Pages production deployment</span></div>
        <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-red-400"></span><span class="text-gray-500">Production deployment to Cloudflare Pages with live secrets</span></div>
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
        
        <!-- Layer 5: Frontend + Multimodal -->
        <div class="flex justify-center mb-2">
          <div class="w-full max-w-[540px] p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
            <div class="text-[10px] font-bold text-cyan-400 mb-1">LAYER 5: FRONTEND & MULTIMODAL OUTPUT</div>
            <div class="flex gap-2 flex-wrap">
              <span class="px-2 py-0.5 bg-cyan-500/10 rounded text-[10px] text-cyan-300">Tailwind CSS</span>
              <span class="px-2 py-0.5 bg-cyan-500/10 rounded text-[10px] text-cyan-300">Vanilla JS</span>
              <span class="px-2 py-0.5 bg-cyan-500/10 rounded text-[10px] text-cyan-300">Marked.js</span>
              <span class="px-2 py-0.5 bg-purple-500/10 rounded text-[10px] text-purple-300">Slides Generator</span>
              <span class="px-2 py-0.5 bg-blue-500/10 rounded text-[10px] text-blue-300">Web Preview</span>
              <span class="px-2 py-0.5 bg-amber-500/10 rounded text-[10px] text-amber-300">Notifications</span>
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
                <div class="text-[9px] text-gray-400 mt-0.5">Supabase + Task States</div>
              </div>
              <div class="p-2 bg-green-500/5 border border-green-500/20 rounded-lg">
                <div class="text-[10px] font-bold text-green-400">L3: PAYMENTS</div>
                <div class="text-[9px] text-gray-400 mt-0.5">Stripe + LemonSqueezy</div>
              </div>
              <div class="p-2 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                <div class="text-[10px] font-bold text-purple-400">L4: AGENTIC AI</div>
                <div class="text-[9px] text-gray-400 mt-0.5">Planning + Fallback</div>
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
// PHASE 4 DETAIL PAGE
// ============================================================
function renderPhase4() {
  return `
    <div class="mb-6">
      <button onclick="navigateTo('overview')" class="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4 flex items-center gap-1">
        <i class="fas fa-arrow-left text-xs"></i> Back to Overview
      </button>
      <h1 class="text-2xl font-bold mb-2 flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <i class="fas fa-wand-magic-sparkles text-purple-400"></i>
        </div>
        Phase 4: Agentic Execution System
      </h1>
      <p class="text-gray-400">Evolving from chat-based assistant to autonomous task execution engine</p>
    </div>
    
    <!-- System Vision -->
    <div class="doc-card p-6 bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/20 rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-3 flex items-center gap-2">
        <i class="fas fa-compass text-purple-400"></i>
        System Vision ("General Boss" Product DNA)
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div class="p-3 bg-[#141414] rounded-xl border border-[#2a2a2a]">
          <div class="text-xs font-bold text-purple-400 mb-1"><i class="fas fa-lightbulb mr-1"></i>Idea to Execution</div>
          <div class="text-[10px] text-gray-400">Don't just answer. Break tasks into sub-tasks and execute autonomously.</div>
        </div>
        <div class="p-3 bg-[#141414] rounded-xl border border-[#2a2a2a]">
          <div class="text-xs font-bold text-blue-400 mb-1"><i class="fas fa-handshake mr-1"></i>Trusted Colleague</div>
          <div class="text-[10px] text-gray-400">Async cloud execution with notifications when tasks complete.</div>
        </div>
        <div class="p-3 bg-[#141414] rounded-xl border border-[#2a2a2a]">
          <div class="text-xs font-bold text-cyan-400 mb-1"><i class="fas fa-sparkles mr-1"></i>Stunning Outputs</div>
          <div class="text-[10px] text-gray-400">Multimodal rendering: Slides, Web deployments, interactive previews.</div>
        </div>
        <div class="p-3 bg-[#141414] rounded-xl border border-[#2a2a2a]">
          <div class="text-xs font-bold text-green-400 mb-1"><i class="fas fa-toggle-on mr-1"></i>Agent Mode</div>
          <div class="text-[10px] text-gray-400">Switch between Chat and Advanced Agent Mode for complex tasks.</div>
        </div>
        <div class="p-3 bg-[#141414] rounded-xl border border-[#2a2a2a]">
          <div class="text-xs font-bold text-amber-400 mb-1"><i class="fas fa-clock mr-1"></i>Reclaim Time</div>
          <div class="text-[10px] text-gray-400">Support complex automation workflows that run while you rest.</div>
        </div>
      </div>
    </div>
    
    <!-- 4 Upgrade Areas -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4">1. Agentic Planning (L4 Enhancement)</h3>
      <div class="space-y-3">
        ${reportItem('Task Decomposition Engine', 'completed',
          'decomposeTask() analyzes user intent and generates context-aware step lists for: presentations, websites, automation, design, and general queries. Steps include analysis, research, structure, generation, and rendering phases.',
          'public/static/app.js - decomposeTask()')}
        ${reportItem('Thinking Process UI Panel', 'completed',
          'Real-time execution panel with animated step progression. Standard mode shows simple execution steps. Agent mode shows full task checklist with status badges (Running/Pending/Done) and pulse-glow animations.',
          'public/static/app.js - renderThinkingIndicator(), advanceAgentStep()')}
        ${reportItem('Agent Mode Toggle', 'completed',
          'Sidebar toggle switch enables/disables Agent Mode. When enabled: body gets agent-mode-active class for glow effects, header shows Agent badge, tasks are decomposed and tracked in agentTasks array.',
          'public/static/app.js - toggleAgentMode(), src/index.tsx sidebar HTML')}
        ${reportItem('Agent Task Tracking', 'completed',
          'agentTasks[] array tracks all agent executions with id, title, status (executing/success/failed), steps, and timestamps. Viewable in Settings > Tasks tab.',
          'public/static/app.js - agentTasks state, renderTasksList()')}
      </div>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4">2. Multimodal Output Rendering (L5 Enhancement)</h3>
      <div class="space-y-3">
        ${reportItem('Slides Generator', 'completed',
          'Detects "## Slide N:" patterns in AI responses. parseSlides() extracts title, subtitle, bullets, content. Renders in-chat slide cards with click-to-preview. Full-screen slide preview modal with keyboard navigation (Left/Right arrows), theme cycling (dark/accent/cool), and slide counter.',
          'public/static/app.js - detectAndRenderSlides(), openSlidePreview(), renderCurrentSlide()')}
        ${reportItem('Web Designer Preview', 'completed',
          'Detects HTML code blocks in responses. Renders miniature preview cards with browser chrome. Full-screen preview modal with sandboxed iframe, desktop/mobile device toggle, and copy-code button.',
          'public/static/app.js - detectAndRenderWebPreview(), openWebPreview(), toggleWebPreviewDevice()')}
        ${reportItem('File-to-Web Transform', 'in-progress',
          'File upload button in input area captures file name. AI processes uploaded content description and can generate HTML landing pages. Currently limited to filename attachment - full file content reading pending.',
          'public/static/app.js - handleFileUpload(), src/index.tsx input area HTML')}
      </div>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4">3. Asynchronous Persistence (L2 & L3 Enhancement)</h3>
      <div class="space-y-3">
        ${reportItem('Task State Tracking UI', 'completed',
          'agentTasks array maintains Pending/Executing/Success/Failed states. Settings > Tasks tab renders status with color-coded badges, timestamps, and step details. Notification system alerts on completion/failure.',
          'public/static/app.js - agentTasks[], renderTasksList(), addNotification()')}
        ${reportItem('Notification Component', 'completed',
          'Bell icon with unread count badge. Slide-out notification panel with categorized alerts (info/success/warning/error). Auto-marks as read on panel open. Clear all button.',
          'public/static/app.js - notifications[], toggleNotifications(), renderNotifications()')}
        ${reportItem('Supabase Task Persistence', 'completed',
          'task_executions schema, indexes, update triggers, and /api/db/tasks endpoints now persist agent task states across sessions. Frontend sync loads tasks during initialization and saves state updates after execution.',
          'supabase/schema.sql, src/index.tsx, public/static/app.js')}
        ${reportItem('Background Execution', 'pending',
          'Long-running tasks should survive browser close via server-side execution tracking. Requires Supabase webhook or polling mechanism to update task state.',
          'Requires: Server-side task queue + Supabase real-time subscriptions')}
      </div>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4">4. UI/UX Refinement (General Boss Style)</h3>
      <div class="space-y-3">
        ${reportItem('Landing Page Greeting', 'completed',
          'Full-screen landing with animated robot icon (float-animation), gradient heading "What can I do for you?", descriptive subtitle, and agent mode hint. Hidden when conversation starts.',
          'src/index.tsx - #landing-page section')}
        ${reportItem('Quick-Action Cards', 'completed',
          '4 primary cards: [Create Slides] (orange), [Build Website] (blue), [Automate Apps] (green), [Design Concepts] (purple). 4 secondary pill buttons: Research, Data Analysis, Writing, Marketing. Each triggers quickAction() with pre-filled prompts.',
          'src/index.tsx - landing page grid, public/static/app.js - quickAction()')}
        ${reportItem('Dark-Mode Aesthetic', 'completed',
          'Custom manus color palette (bg:#0a0a0a, surface:#141414, accent:#c8a2ff). Tailwind config extends theme with manus- prefixed colors. Consistent dark surfaces with subtle borders and accent highlights.',
          'src/index.tsx - tailwind.config, public/static/style.css')}
        ${reportItem('Mobile Responsiveness', 'completed',
          'Sidebar: fixed overlay on mobile with translateX animation. Grid: responsive cols (2->4 on desktop). Slide renderer: smaller padding/fonts on mobile. 768px breakpoint with mobile-open toggle.',
          'public/static/style.css - @media (max-width: 768px)')}
        ${reportItem('Agent Mode Visual Effects', 'completed',
          'agent-mode-active class adds subtle purple glow to sidebar border, header border, and execution panels. Agent execution panels use distinct gradient backgrounds (from-[#0f0a1a] to-[#150e22]).',
          'public/static/style.css - .agent-mode-active, .agent-execution-panel')}
      </div>
    </div>
    
    <!-- Phase 4 Architecture Diagram -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-diagram-project text-purple-400"></i>
        Phase 4 Execution Flow
      </h3>
      <div class="overflow-x-auto">
        <div class="space-y-3 min-w-[600px]">
          <div class="flex items-center gap-2">
            ${flowStep('User Input', 'fa-keyboard', 'cyan')}
            ${flowArrow()}
            ${flowStep('Agent Mode?', 'fa-code-branch', 'purple')}
            ${flowArrow()}
            ${flowStep('Decompose Task', 'fa-list-check', 'purple')}
            ${flowArrow()}
            ${flowStep('Thinking UI', 'fa-spinner', 'amber')}
          </div>
          <div class="flex items-center gap-2 pl-16">
            ${flowArrow()}
            ${flowStep('AI Stream', 'fa-brain', 'blue')}
            ${flowArrow()}
            ${flowStep('Detect Output', 'fa-eye', 'green')}
            ${flowArrow()}
            ${flowStep('Render Modal', 'fa-display', 'cyan')}
            ${flowArrow()}
            ${flowStep('Notify', 'fa-bell', 'amber')}
          </div>
        </div>
      </div>
    </div>
    
    ${renderRiskAssessment([
      { risk: 'Agent tasks lost on page refresh (in-memory only)', severity: 'medium', mitigation: 'Add task_executions table to Supabase and persist agent tasks server-side.' },
      { risk: 'File upload only captures filename, not content', severity: 'medium', mitigation: 'Implement FileReader API to read file content and send to AI for processing.' },
      { risk: 'Slide detection relies on "## Slide N:" pattern', severity: 'low', mitigation: 'Enhance pattern detection to support more markdown heading formats and Marp-style separators.' },
      { risk: 'Web preview iframe sandbox may block some scripts', severity: 'low', mitigation: 'sandbox="allow-scripts" is set. Add allow-forms if form interaction is needed.' }
    ])}`;
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
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4">Detailed Component Report</h3>
      <div class="space-y-4">
        ${reportItem('API Key Isolation', 'completed',
          'All API keys (OPENAI_API_KEY, STRIPE_SECRET_KEY, SUPABASE_SERVICE_KEY, etc.) stored in env vars. Frontend never accesses secrets.',
          'src/index.tsx - Bindings type definition')}
        ${reportItem('Rate Limiting', 'completed',
          'In-memory per-IP rate limiter: 30 req/60s. Returns 429 with X-RateLimit-Remaining header.',
          'src/index.tsx lines 41-65')}
        ${reportItem('Input Sanitization', 'completed',
          'sanitize() strips and truncates all user inputs. Max lengths: messages 50K, titles 200, IDs 100.',
          'src/index.tsx line 67-70')}
        ${reportItem('CORS Configuration', 'completed',
          'Configured for /api/* routes. Allows *, GET/POST/DELETE/OPTIONS. Custom headers exposed.',
          'src/index.tsx lines 31-36')}
        ${reportItem('Request Timeout', 'completed',
          'AI requests have 30s timeout via AbortController.',
          'src/index.tsx - tryAIRequest()')}
      </div>
    </div>
    
    ${renderImplementationPlan('Layer 1', [
      { step: 1, title: 'Environment Variables Setup', status: 'done', desc: 'Create .dev.vars with all API keys.' },
      { step: 2, title: 'Rate Limiter Middleware', status: 'done', desc: 'In-memory Map-based rate limiter on /api/*.' },
      { step: 3, title: 'Input Sanitization', status: 'done', desc: 'Global sanitize() helper for all inputs.' },
      { step: 4, title: 'CORS Middleware', status: 'done', desc: 'Hono cors() with specific allow headers.' },
      { step: 5, title: 'RLS Policies (Supabase)', status: 'pending', desc: 'Enable Row Level Security on all tables.' },
      { step: 6, title: 'Webhook Signature Verification', status: 'pending', desc: 'Verify Stripe/LS webhook signatures.' }
    ])}
    
    ${renderRiskAssessment([
      { risk: 'In-memory rate limit resets on worker restart', severity: 'low', mitigation: 'Consider Cloudflare Durable Objects for persistent rate limiting.' },
      { risk: 'CORS allows all origins', severity: 'medium', mitigation: 'Restrict to specific domain(s) in production.' },
      { risk: 'No webhook signature verification', severity: 'high', mitigation: 'Add Stripe/LS webhook signature verification before production.' }
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
      <div class="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] text-purple-300">
        <i class="fas fa-bolt text-[8px]"></i> Phase 4: + Task State Tracking & Notifications
      </div>
    </div>
    
    <!-- ERD -->
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
      </div>
    </div>
    
    <!-- Phase 4: Task State Tracking -->
    <div class="doc-card p-6 bg-purple-500/5 border border-purple-500/20 rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-wand-magic-sparkles text-purple-400"></i>
        Phase 4: Async Task State Tracking
      </h3>
      <div class="space-y-3">
        ${reportItem('In-Memory Task Tracking', 'completed',
          'agentTasks[] in app.js tracks task id, title, status (pending/executing/success/failed), steps, and timestamps. Rendered in Settings > Tasks tab.',
          'public/static/app.js - agentTasks[]')}
        ${reportItem('Notification State', 'completed',
          'notifications[] array stores alerts with id, title, body, type, timestamp, read status. Rendered in notification panel with unread badge count.',
          'public/static/app.js - notifications[]')}
        ${reportItem('Supabase task_executions Table', 'pending',
          'Planned table: task_executions (id, user_id FK, title, status, steps JSONB, result TEXT, created_at, updated_at). Will persist tasks across sessions.',
          'Requires: supabase/schema.sql update')}
      </div>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4">Core Component Report</h3>
      <div class="space-y-4">
        ${reportItem('Supabase REST Helper', 'completed',
          'Server-side supabase() function for authenticated REST calls. Supports GET/POST/PATCH/PUT/DELETE.',
          'src/index.tsx lines 81-109')}
        ${reportItem('Conversation CRUD', 'completed',
          'Save/load/delete conversations with messages. Delete-reinsert pattern for message sync.',
          'src/index.tsx lines 126-221')}
        ${reportItem('Profile CRUD', 'completed',
          'Credits, settings, usage history management with auto-create via ensureProfile().',
          'src/index.tsx lines 224-300')}
        ${reportItem('Offline Fallback', 'completed',
          'Frontend checks /api/health for availability. Falls back to memory-only mode gracefully.',
          'public/static/app.js - initializeFromDatabase()')}
      </div>
    </div>
    
    ${renderImplementationPlan('Layer 2', [
      { step: 1, title: 'Schema Design', status: 'done', desc: '4 tables with indexes and FK constraints.' },
      { step: 2, title: 'PostgREST Helper', status: 'done', desc: 'Server-side supabase() function.' },
      { step: 3, title: 'CRUD Endpoints', status: 'done', desc: 'All /api/db/* routes.' },
      { step: 4, title: 'Frontend Integration', status: 'done', desc: 'Load on init, save on mutation.' },
      { step: 5, title: 'Task State Tracking (Phase 4)', status: 'done', desc: 'In-memory agentTasks with UI rendering.' },
      { step: 6, title: 'Task Persistence to Supabase', status: 'done', desc: 'task_executions table + API endpoints + frontend sync.' },
      { step: 7, title: 'Real Credentials', status: 'pending', desc: 'Create Supabase project, run schema.' },
      { step: 8, title: 'Enable RLS', status: 'pending', desc: 'Row Level Security policies.' }
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
    
    <!-- Credit Cost Table -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4">Credit Cost Matrix</h3>
      <table class="w-full text-sm">
        <thead>
          <tr class="text-gray-400 border-b border-[#2a2a2a]">
            <th class="text-left pb-2">Model</th><th class="text-left pb-2">Name</th><th class="text-right pb-2">Cost/msg</th><th class="text-right pb-2">Msgs (1000 cr)</th>
          </tr>
        </thead>
        <tbody class="text-gray-300">
          <tr class="border-b border-[#1a1a1a]"><td class="py-2 font-mono text-xs">gpt-5-mini</td><td>Standard</td><td class="text-right text-green-400">15 cr</td><td class="text-right">~66</td></tr>
          <tr class="border-b border-[#1a1a1a]"><td class="py-2 font-mono text-xs">gpt-5</td><td>Pro</td><td class="text-right text-amber-400">45 cr</td><td class="text-right">~22</td></tr>
          <tr><td class="py-2 font-mono text-xs">gpt-5-nano</td><td>Lite</td><td class="text-right text-blue-400">8 cr</td><td class="text-right">~125</td></tr>
        </tbody>
      </table>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4">Component Report</h3>
      <div class="space-y-4">
        ${reportItem('Payment Plans API', 'completed', 'Starter (5K credits, $9.99) and Pro (20K credits, $29.99).', 'src/index.tsx lines 409-422')}
        ${reportItem('Checkout Session', 'completed', 'Stripe first, then LemonSqueezy, then demoMode.', 'src/index.tsx lines 424-484')}
        ${reportItem('Webhooks', 'completed', 'Stripe + LemonSqueezy webhook handlers.', 'src/index.tsx lines 487-542')}
        ${reportItem('Demo Mode', 'completed', 'Frontend simulated purchase when no keys configured.', 'public/static/app.js - showPurchaseDemo()')}
        ${reportItem('Credit Deduction', 'completed', 'Per-model cost with usage history logging.', 'public/static/app.js - deductCredits()')}
      </div>
    </div>
    
    ${renderImplementationPlan('Layer 3', [
      { step: 1, title: 'Plans Endpoint', status: 'done', desc: 'Static plan definitions.' },
      { step: 2, title: 'Checkout Flow', status: 'done', desc: 'Server-side session creation.' },
      { step: 3, title: 'Webhook Handlers', status: 'done', desc: 'Stripe + LemonSqueezy.' },
      { step: 4, title: 'Demo Mode', status: 'done', desc: 'Client-side simulated purchase.' },
      { step: 5, title: 'Credit Tracking', status: 'done', desc: 'Per-model deduction + history.' },
      { step: 6, title: 'Real Payment Keys', status: 'pending', desc: 'Configure production keys.' },
      { step: 7, title: 'Webhook Signatures', status: 'pending', desc: 'Verify webhook authenticity.' }
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
        Layer 4: AI Processing & Agentic Planning
      </h1>
      <p class="text-gray-400">Multi-model AI with streaming, fallback, task decomposition, and autonomous execution</p>
      <div class="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] text-purple-300">
        <i class="fas fa-bolt text-[8px]"></i> Phase 4: + Agentic Planning Engine
      </div>
    </div>
    
    <!-- Fallback Chain -->
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
            <div class="text-sm font-medium text-amber-300">gpt-5-mini -> gpt-5-nano</div>
            <div class="text-[10px] text-gray-500">Fallback chain. Skips models already tried.</div>
          </div>
          <span class="text-xs text-gray-500">If fails &#8594;</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-xs font-bold text-red-400">3</div>
          <div class="flex-1 p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
            <div class="text-sm font-medium text-red-300">Local Offline Generator</div>
            <div class="text-[10px] text-gray-500">Keyword-matched smart responses. No API call needed.</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Phase 4: Agentic Planning -->
    <div class="doc-card p-6 bg-purple-500/5 border border-purple-500/20 rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-wand-magic-sparkles text-purple-400"></i>
        Phase 4: Agentic Planning Engine
      </h3>
      <div class="space-y-3">
        ${reportItem('Task Decomposition', 'completed',
          'Context-aware step generation for 5 task categories: presentations (6 steps), websites (6), automation (5), design (5), general (4).',
          'public/static/app.js - decomposeTask()')}
        ${reportItem('Thinking Process UI', 'completed',
          'Real-time step-by-step execution panel. Agent mode: task checklist with Running/Done badges. Chat mode: simple step list.',
          'public/static/app.js - renderThinkingIndicator()')}
        ${reportItem('Agent Mode Toggle', 'completed',
          'Sidebar toggle + header badge + body glow effects. Enables decomposition and task tracking.',
          'public/static/app.js - toggleAgentMode()')}
        ${reportItem('Step Animation', 'completed',
          'Steps advance at 1.2s intervals in agent mode, 0.8s in chat mode. Auto-complete on response receipt.',
          'public/static/app.js - stepInterval in sendMessage()')}
      </div>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4">Core AI Report</h3>
      <div class="space-y-4">
        ${reportItem('Streaming SSE', 'completed', 'Chat streams via SSE with delta content extraction.', 'src/index.tsx lines 618-668')}
        ${reportItem('Model Fallback', 'completed', 'X-Model-Used and X-Fallback headers inform client.', 'src/index.tsx lines 547-614')}
        ${reportItem('Smart Offline Generator', 'completed', 'Keyword-matched markdown for common queries.', 'src/index.tsx lines 549-565')}
        ${reportItem('General Boss AI System Prompt', 'completed', 'Step-by-step reasoning with task execution persona.', 'src/index.tsx line 601')}
      </div>
    </div>
    
    ${renderImplementationPlan('Layer 4', [
      { step: 1, title: 'OpenAI Proxy Route', status: 'done', desc: 'POST /api/chat with streaming.' },
      { step: 2, title: 'Fallback Chain', status: 'done', desc: 'Three-level model fallback.' },
      { step: 3, title: 'Offline Generator', status: 'done', desc: 'Keyword-based smart responses.' },
      { step: 4, title: 'Task Decomposition (Phase 4)', status: 'done', desc: 'decomposeTask() with 5 categories.' },
      { step: 5, title: 'Thinking UI (Phase 4)', status: 'done', desc: 'Agent execution panel + step animation.' },
      { step: 6, title: 'Agent Mode Toggle (Phase 4)', status: 'done', desc: 'Sidebar toggle + visual effects.' },
      { step: 7, title: 'Server-side Credit Check', status: 'pending', desc: 'Verify credits from DB, not client.' },
      { step: 8, title: 'Context Window Management', status: 'pending', desc: 'Truncate messages for model limits.' }
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
        Layer 5: Frontend & Multimodal Output
      </h1>
      <p class="text-gray-400">Dark-mode SPA with multimodal rendering, notifications, and General Boss UX</p>
      <div class="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] text-purple-300">
        <i class="fas fa-bolt text-[8px]"></i> Phase 4: + Slides, Web Preview, Notifications, General Boss UI
      </div>
    </div>
    
    <!-- UI Component Map -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-puzzle-piece text-cyan-400"></i>
        UI Component Architecture
      </h3>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        ${uiComponent('Sidebar', 'Conversations, new chat, Agent Mode toggle, sync status', 'fa-bars')}
        ${uiComponent('Landing Page', '"What can I do for you?" + quick-action cards', 'fa-rocket')}
        ${uiComponent('Chat Container', 'Messages, streaming, thinking panel, multimodal cards', 'fa-comments')}
        ${uiComponent('Input Area', 'Auto-resize textarea, file upload, send button', 'fa-keyboard')}
        ${uiComponent('Header', 'Model selector, credits, notifications bell, agent badge', 'fa-heading')}
        ${uiComponent('Settings Modal', 'Account, Usage, Billing, Tasks, General tabs', 'fa-gear')}
        ${uiComponent('Slide Preview Modal', 'Full-screen 16:9 slide viewer with keyboard nav', 'fa-file-powerpoint')}
        ${uiComponent('Web Preview Modal', 'Browser chrome + sandboxed iframe, device toggle', 'fa-globe')}
        ${uiComponent('Notification Panel', 'Bell icon + slide-out panel with categorized alerts', 'fa-bell')}
        ${uiComponent('Toast System', 'Corner notifications for info/success/warning/error', 'fa-message')}
        ${uiComponent('Error Overlays', 'Credits exhausted, API error, rate limited', 'fa-exclamation')}
        ${uiComponent('Thinking Indicator', 'Agent execution panel with task checklist', 'fa-spinner')}
      </div>
    </div>
    
    <!-- Phase 4: Multimodal Output -->
    <div class="doc-card p-6 bg-purple-500/5 border border-purple-500/20 rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-display text-cyan-400"></i>
        Phase 4: Multimodal Output Rendering
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 bg-[#141414] rounded-xl border border-[#2a2a2a]">
          <div class="flex items-center gap-2 mb-3">
            <i class="fas fa-file-powerpoint text-orange-400"></i>
            <span class="text-sm font-medium">Slides Generator</span>
            <span class="px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] rounded-full border border-green-500/20">Done</span>
          </div>
          <div class="space-y-1.5 text-[11px] text-gray-400">
            <div>- Detect "## Slide N:" patterns in AI output</div>
            <div>- Parse title, subtitle, bullets, content</div>
            <div>- In-chat slide cards with mini preview</div>
            <div>- Full-screen modal with 16:9 aspect ratio</div>
            <div>- Theme cycling: dark, accent, cool</div>
            <div>- Keyboard nav: Left/Right arrows</div>
          </div>
        </div>
        <div class="p-4 bg-[#141414] rounded-xl border border-[#2a2a2a]">
          <div class="flex items-center gap-2 mb-3">
            <i class="fas fa-globe text-blue-400"></i>
            <span class="text-sm font-medium">Web Designer Preview</span>
            <span class="px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] rounded-full border border-green-500/20">Done</span>
          </div>
          <div class="space-y-1.5 text-[11px] text-gray-400">
            <div>- Detect HTML code blocks in AI output</div>
            <div>- Miniature preview card with browser chrome</div>
            <div>- Full-screen modal with sandboxed iframe</div>
            <div>- Desktop/Mobile device toggle</div>
            <div>- Copy HTML code button</div>
            <div>- Mobile view: 375px width simulation</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4">Core Component Report</h3>
      <div class="space-y-4">
        ${reportItem('Conversation Management', 'completed', 'Create/load/delete with date grouping. Active state.', 'public/static/app.js')}
        ${reportItem('Markdown Rendering', 'completed', 'Marked.js + Highlight.js + code copy buttons.', 'public/static/style.css')}
        ${reportItem('Credit Dashboard', 'completed', 'Real-time balance, progress bar, usage history.', 'public/static/app.js')}
        ${reportItem('Mobile Responsiveness', 'completed', 'Sidebar toggle, responsive grids, 768px breakpoint.', 'public/static/style.css')}
        ${reportItem('Keyboard Shortcuts', 'completed', 'Ctrl+K new chat, Escape close, arrows for slides.', 'public/static/app.js')}
      </div>
    </div>
    
    ${renderImplementationPlan('Layer 5', [
      { step: 1, title: 'HTML Shell', status: 'done', desc: 'SPA shell with all Phase 4 components.' },
      { step: 2, title: 'Tailwind + Custom CSS', status: 'done', desc: 'General Boss theme + agent effects + multimodal styles.' },
      { step: 3, title: 'Landing Page (Phase 4)', status: 'done', desc: 'Greeting + quick-action cards + agent hint.' },
      { step: 4, title: 'Slides Generator (Phase 4)', status: 'done', desc: 'Detection, parsing, preview modal.' },
      { step: 5, title: 'Web Preview (Phase 4)', status: 'done', desc: 'Detection, iframe sandbox, device toggle.' },
      { step: 6, title: 'Notifications (Phase 4)', status: 'done', desc: 'Bell icon, panel, task alerts.' },
      { step: 7, title: 'File-to-Web Transform', status: 'pending', desc: 'Full file content reading + conversion.' },
      { step: 8, title: 'Accessibility', status: 'pending', desc: 'ARIA labels, focus management.' }
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
        ${reportItem('Vite Build System', 'completed', '@hono/vite-build outputs _worker.js + static assets.', 'vite.config.ts')}
        ${reportItem('Wrangler Configuration', 'completed', 'wrangler.jsonc with nodejs_compat flag.', 'wrangler.jsonc')}
        ${reportItem('PM2 Process Manager', 'completed', 'ecosystem.config.cjs on port 3000.', 'ecosystem.config.cjs')}
        ${reportItem('Cloudflare Pages Deploy', 'pending', 'Needs CLOUDFLARE_API_TOKEN.', 'package.json deploy script')}
      </div>
    </div>
    
    ${renderImplementationPlan('Layer 6', [
      { step: 1, title: 'Vite + Hono Setup', status: 'done', desc: 'Scaffolded for Cloudflare Pages.' },
      { step: 2, title: 'PM2 Configuration', status: 'done', desc: 'Dev server management.' },
      { step: 3, title: 'Build Pipeline', status: 'done', desc: 'npm run build -> dist/.' },
      { step: 4, title: 'Cloudflare API Key', status: 'pending', desc: 'Set up CLOUDFLARE_API_TOKEN.' },
      { step: 5, title: 'Production Deploy', status: 'pending', desc: 'Create Pages project.' },
      { step: 6, title: 'Secret Configuration', status: 'pending', desc: 'All env vars as secrets.' }
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
        Complete Request Lifecycle (Phase 4)
      </h3>
      <div class="space-y-2 text-sm">
        ${lifecycleStep(1, 'User types message or clicks quick-action card', 'fa-keyboard', 'cyan')}
        ${lifecycleStep(2, 'Check credits > 0', 'fa-coins', 'green')}
        ${lifecycleStep(3, 'Create conversation if new (save to Supabase)', 'fa-plus', 'blue')}
        ${lifecycleStep(4, 'If Agent Mode: decompose task into steps', 'fa-list-check', 'purple')}
        ${lifecycleStep(5, 'Render user message + thinking/execution panel', 'fa-spinner', 'purple')}
        ${lifecycleStep(6, 'POST /api/chat -> Security -> AI Engine', 'fa-paper-plane', 'amber')}
        ${lifecycleStep(7, 'Stream SSE response back to client', 'fa-stream', 'cyan')}
        ${lifecycleStep(8, 'Render streaming markdown', 'fa-file-lines', 'blue')}
        ${lifecycleStep(9, 'Detect multimodal output (slides/web code)', 'fa-display', 'purple')}
        ${lifecycleStep(10, 'Render slide cards or web preview cards', 'fa-file-powerpoint', 'cyan')}
        ${lifecycleStep(11, 'Save conversation + deduct credits', 'fa-floppy-disk', 'green')}
        ${lifecycleStep(12, 'Update task status + send notification', 'fa-bell', 'amber')}
      </div>
    </div>
    
    <!-- File Structure -->
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-folder-tree text-green-400"></i>
        Project File Structure (Phase 4)
      </h3>
      <pre class="text-xs text-gray-400 bg-[#0d0d0d] p-4 rounded-xl border border-[#2a2a2a] overflow-x-auto"><code>webapp/
&#9500;&#9472;&#9472; src/
&#9474;   &#9492;&#9472;&#9472; index.tsx          <span class="text-purple-400"># Hono backend + HTML shell (~1300 lines)</span>
&#9474;                          <span class="text-gray-600"># Includes: Agent Mode toggle, Notifications panel,</span>
&#9474;                          <span class="text-gray-600"># Slide/Web preview modals, quick-action cards</span>
&#9500;&#9472;&#9472; public/static/
&#9474;   &#9500;&#9472;&#9472; app.js             <span class="text-cyan-400"># Frontend JS (~1310 lines)</span>
&#9474;   &#9474;                      <span class="text-gray-600"># Agent Mode, task decomposition, slides generator,</span>
&#9474;   &#9474;                      <span class="text-gray-600"># web preview, notifications, async task tracking</span>
&#9474;   &#9500;&#9472;&#9472; style.css          <span class="text-blue-400"># CSS (~390 lines)</span>
&#9474;   &#9474;                      <span class="text-gray-600"># Agent glow effects, slide themes, multimodal cards,</span>
&#9474;   &#9474;                      <span class="text-gray-600"># task status badges, notification styles</span>
&#9474;   &#9492;&#9472;&#9472; docs.js            <span class="text-green-400"># Documentation system (Phase 4 updated)</span>
&#9500;&#9472;&#9472; supabase/
&#9474;   &#9492;&#9472;&#9472; schema.sql         <span class="text-amber-400"># Database schema</span>
&#9500;&#9472;&#9472; .dev.vars              <span class="text-red-400"># Environment variables (local)</span>
&#9500;&#9472;&#9472; ecosystem.config.cjs   <span class="text-gray-500"># PM2 configuration</span>
&#9500;&#9472;&#9472; wrangler.jsonc         <span class="text-gray-500"># Cloudflare config</span>
&#9500;&#9472;&#9472; package.json           <span class="text-gray-500"># Dependencies & scripts</span>
&#9492;&#9472;&#9472; README.md              <span class="text-gray-500"># Project documentation</span></code></pre>
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
            <th class="text-left pb-2 pr-3">Error Type</th><th class="text-left pb-2 pr-3">Code</th><th class="text-left pb-2 pr-3">UI Response</th><th class="text-left pb-2">Recovery</th>
          </tr>
        </thead>
        <tbody class="text-gray-300">
          <tr class="border-b border-[#1a1a1a]"><td class="py-2 pr-3">Credits Exhausted</td><td class="pr-3 text-amber-400">402</td><td class="pr-3">Overlay + upgrade</td><td>Upgrade plan</td></tr>
          <tr class="border-b border-[#1a1a1a]"><td class="py-2 pr-3">Rate Limited</td><td class="pr-3 text-blue-400">429</td><td class="pr-3">Error card</td><td>Retry button</td></tr>
          <tr class="border-b border-[#1a1a1a]"><td class="py-2 pr-3">Model Down</td><td class="pr-3 text-purple-400">-</td><td class="pr-3">Fallback badge</td><td>Auto-switch</td></tr>
          <tr class="border-b border-[#1a1a1a]"><td class="py-2 pr-3">All APIs Down</td><td class="pr-3 text-red-400">-</td><td class="pr-3">Offline overlay</td><td>Local gen</td></tr>
          <tr class="border-b border-[#1a1a1a]"><td class="py-2 pr-3">DB Offline</td><td class="pr-3 text-amber-400">500</td><td class="pr-3">Offline badge</td><td>Memory mode</td></tr>
          <tr><td class="py-2 pr-3">Agent Task Failed</td><td class="pr-3 text-red-400">-</td><td class="pr-3">Task status: failed</td><td>Notification + retry</td></tr>
        </tbody>
      </table>
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
        <i class="fas fa-circle-check text-green-400"></i>
        Phase 1: Foundation (Completed)
      </h3>
      <div class="space-y-3">
        ${phaseStep('1.1', 'Project Scaffolding', 'done', 'Hono + Vite + Cloudflare Pages template.')}
        ${phaseStep('1.2', 'Database Schema', 'done', 'PostgreSQL tables for profiles, conversations, messages, usage.')}
        ${phaseStep('1.3', 'Security Middleware', 'done', 'Rate limiting, CORS, input sanitization.')}
        ${phaseStep('1.4', 'Basic AI Proxy', 'done', 'POST /api/chat with streaming and fallback.')}
        ${phaseStep('1.5', 'Frontend SPA', 'done', 'Dark-mode UI with sidebar, chat, settings.')}
      </div>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-circle-check text-green-400"></i>
        Phase 2: Integration (Completed)
      </h3>
      <div class="space-y-3">
        ${phaseStep('2.1', 'Supabase REST Helper', 'done', 'Server-side authenticated API calls.')}
        ${phaseStep('2.2', 'Payment System', 'done', 'Stripe + LemonSqueezy + demo mode.')}
        ${phaseStep('2.3', 'Credit System', 'done', 'Per-model costs + usage tracking.')}
        ${phaseStep('2.4', 'Offline Fallback', 'done', 'Graceful degradation for all services.')}
      </div>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-circle-check text-green-400"></i>
        Phase 3: Polish (Completed)
      </h3>
      <div class="space-y-3">
        ${phaseStep('3.1', 'Error Handling', 'done', 'Credits exhausted, rate limited, API error overlays.')}
        ${phaseStep('3.2', 'Model Selector', 'done', 'Dropdown with cost display and auto-fallback.')}
        ${phaseStep('3.3', 'Settings Modal', 'done', 'Account, Usage, Billing, General tabs.')}
        ${phaseStep('3.4', 'Documentation', 'done', 'Interactive /docs with layer reports and diagrams.')}
      </div>
    </div>
    
    <div class="doc-card p-6 bg-purple-500/5 border border-purple-500/20 rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-wand-magic-sparkles text-purple-400"></i>
        Phase 4: Agentic Execution System (Current)
      </h3>
      <div class="space-y-3">
        ${phaseStep('4.1', 'General Boss Landing Page', 'done', '"What can I do for you?" + quick-action cards.')}
        ${phaseStep('4.2', 'Agent Mode Toggle', 'done', 'Sidebar switch + header badge + glow effects.')}
        ${phaseStep('4.3', 'Task Decomposition Engine', 'done', 'Context-aware step generation for 5 task types.')}
        ${phaseStep('4.4', 'Thinking Process UI', 'done', 'Real-time execution panel with step progression.')}
        ${phaseStep('4.5', 'Slides Generator', 'done', 'Detect, parse, preview with full-screen modal.')}
        ${phaseStep('4.6', 'Web Designer Preview', 'done', 'Sandboxed iframe with device toggle.')}
        ${phaseStep('4.7', 'Notification System', 'done', 'Bell + panel + task completion alerts.')}
        ${phaseStep('4.8', 'Tasks Tab in Settings', 'done', 'Agent task tracking with status badges.')}
        ${phaseStep('4.9', 'Documentation Update', 'done', 'Phase 4 details added to /docs.')}
        ${phaseStep('4.10', 'File-to-Web Transform', 'in-progress', 'Full file content reading + HTML generation.')}
        ${phaseStep('4.11', 'Supabase Task Persistence', 'done', 'task_executions table, API routes, and frontend sync for cross-session persistence.')}
        ${phaseStep('4.12', 'Background Execution', 'pending', 'Server-side task queue for browser-close resilience.')}
      </div>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-flag-checkered text-red-400"></i>
        Phase 5: Production Hardening (Active)
      </h3>
      <div class="space-y-3">
        ${phaseStep('5.1', 'Real Supabase Credentials', 'pending', 'Create project, run schema, replace placeholders.')}
        ${phaseStep('5.2', 'Row Level Security', 'pending', 'Enable RLS policies for data isolation.')}
        ${phaseStep('5.3', 'Webhook Signatures', 'pending', 'Verify Stripe/LS webhooks.')}
        ${phaseStep('5.4', 'Server-side Credit Check', 'pending', 'Verify from DB, not client.')}
        ${phaseStep('5.5', 'Cloudflare Deploy', 'pending', 'Production deployment with secrets.')}
        ${phaseStep('5.6', 'Custom Domain', 'pending', 'Configure domain + SSL.')}
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
          <div class="text-[11px] text-gray-400">App works without database. All features degrade gracefully.</div>
        </div>
        <div class="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
          <div class="text-xs font-bold text-blue-400 mb-1"><i class="fas fa-check mr-1"></i> Demo-First Payments</div>
          <div class="text-[11px] text-gray-400">Real keys are additive, not required.</div>
        </div>
        <div class="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl">
          <div class="text-xs font-bold text-purple-400 mb-1"><i class="fas fa-check mr-1"></i> Fallback AI</div>
          <div class="text-[11px] text-gray-400">Local smart response generator as ultimate fallback.</div>
        </div>
        <div class="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
          <div class="text-xs font-bold text-amber-400 mb-1"><i class="fas fa-check mr-1"></i> Agent Mode Optional</div>
          <div class="text-[11px] text-gray-400">Agent features are additive. Chat mode always works.</div>
        </div>
      </div>
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-stairs text-purple-400"></i>
        Incremental Deployment Steps
      </h3>
      <div class="space-y-4">
        ${executionStep(1, 'Verify Current State', 'green',
          'Health check, test endpoints, confirm UI loads.',
          'curl /api/health, check landing page loads',
          'Rebuild with npm run build.')}
        ${executionStep(2, 'Connect Supabase', 'blue',
          'Create project, run schema, add credentials.',
          'Check /api/health shows supabase:true',
          'Revert .dev.vars. Offline mode activates.')}
        ${executionStep(3, 'Test Agent Mode', 'purple',
          'Enable Agent Mode, send task, verify decomposition.',
          'Check thinking panel, step progression, task tracking.',
          'Toggle Agent Mode off. Chat mode unaffected.')}
        ${executionStep(4, 'Test Multimodal', 'cyan',
          'Request slides/website, verify preview modals.',
          'Slide preview opens, web preview renders.',
          'Multimodal is detection-based. No impact if removed.')}
        ${executionStep(5, 'Deploy to Cloudflare', 'amber',
          'Build and deploy to Cloudflare Pages.',
          'npm run build && wrangler pages deploy dist',
          'Redeploy previous commit.')}
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
    </div>
    
    <div class="doc-card p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl mb-6">
      <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
        <i class="fas fa-list-check text-purple-400"></i>
        Phase 4 Feature Checklist
      </h3>
      <div class="space-y-2">
        <div class="flex items-center gap-2 p-2 bg-green-500/5 rounded-lg"><i class="fas fa-circle-check text-green-400 text-sm"></i><span class="text-xs">Landing page: "What can I do for you?"</span></div>
        <div class="flex items-center gap-2 p-2 bg-green-500/5 rounded-lg"><i class="fas fa-circle-check text-green-400 text-sm"></i><span class="text-xs">Quick-action cards (4 primary + 4 secondary)</span></div>
        <div class="flex items-center gap-2 p-2 bg-green-500/5 rounded-lg"><i class="fas fa-circle-check text-green-400 text-sm"></i><span class="text-xs">Agent Mode toggle with visual effects</span></div>
        <div class="flex items-center gap-2 p-2 bg-green-500/5 rounded-lg"><i class="fas fa-circle-check text-green-400 text-sm"></i><span class="text-xs">Task decomposition engine</span></div>
        <div class="flex items-center gap-2 p-2 bg-green-500/5 rounded-lg"><i class="fas fa-circle-check text-green-400 text-sm"></i><span class="text-xs">Thinking Process UI panel</span></div>
        <div class="flex items-center gap-2 p-2 bg-green-500/5 rounded-lg"><i class="fas fa-circle-check text-green-400 text-sm"></i><span class="text-xs">Slides Generator with preview modal</span></div>
        <div class="flex items-center gap-2 p-2 bg-green-500/5 rounded-lg"><i class="fas fa-circle-check text-green-400 text-sm"></i><span class="text-xs">Web Designer with sandbox preview</span></div>
        <div class="flex items-center gap-2 p-2 bg-green-500/5 rounded-lg"><i class="fas fa-circle-check text-green-400 text-sm"></i><span class="text-xs">Notification system (bell + panel)</span></div>
        <div class="flex items-center gap-2 p-2 bg-green-500/5 rounded-lg"><i class="fas fa-circle-check text-green-400 text-sm"></i><span class="text-xs">Tasks tab in Settings</span></div>
        <div class="flex items-center gap-2 p-2 bg-green-500/5 rounded-lg"><i class="fas fa-circle-check text-green-400 text-sm"></i><span class="text-xs">Dark-mode General Boss aesthetic</span></div>
        <div class="flex items-center gap-2 p-2 bg-green-500/5 rounded-lg"><i class="fas fa-circle-check text-green-400 text-sm"></i><span class="text-xs">Mobile responsiveness</span></div>
        <div class="flex items-center gap-2 p-2 bg-green-500/5 rounded-lg"><i class="fas fa-circle-check text-green-400 text-sm"></i><span class="text-xs">Documentation updated (this page)</span></div>
        <div class="flex items-center gap-2 p-2 bg-amber-500/5 rounded-lg"><i class="fas fa-spinner fa-spin text-amber-400 text-sm"></i><span class="text-xs">File-to-Web transform</span></div>
        <div class="flex items-center gap-2 p-2 bg-green-500/5 rounded-lg"><i class="fas fa-circle-check text-green-400 text-sm"></i><span class="text-xs">Supabase task persistence</span></div>
        <div class="flex items-center gap-2 p-2 bg-[#1a1a1a] rounded-lg"><i class="fas fa-circle text-gray-600 text-sm"></i><span class="text-xs text-gray-500">Background execution</span></div>
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
  const badges = {
    'completed': '<span class="px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] rounded-full border border-green-500/20">Completed</span>',
    'in-progress': '<span class="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] rounded-full border border-amber-500/20">In Progress</span>',
    'pending': '<span class="px-2 py-0.5 bg-gray-500/10 text-gray-400 text-[10px] rounded-full border border-gray-500/20">Pending</span>'
  };
  return `
    <div class="p-4 bg-[#1a1a1a] rounded-xl border border-[#222]">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">${title}</span>
        ${badges[status] || badges.pending}
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
          const icon = s.status === 'done' ? 'fa-circle-check text-green-400' : s.status === 'in-progress' ? 'fa-spinner fa-spin text-amber-400' : 'fa-circle text-gray-600';
          const bg = s.status === 'done' ? 'bg-green-500/5' : s.status === 'in-progress' ? 'bg-amber-500/5' : 'bg-[#1a1a1a]';
          return `<div class="flex items-start gap-3 p-2 rounded-lg ${bg}">
            <div class="flex-shrink-0 mt-0.5"><i class="fas ${icon} text-sm"></i></div>
            <div>
              <div class="text-xs font-medium">${s.title}</div>
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
