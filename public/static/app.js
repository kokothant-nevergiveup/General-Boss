// ============================================================
// Manus AI Clone - Production Frontend
// ============================================================
// 1. Security: API keys NEVER touch this file. All external API
//    calls go through server-side /api/* proxy routes.
// 2. Persistence: D1 Database (cloud) + localStorage (fallback)
// 3. Credits: Stripe/LemonSqueezy payment + real credit deduction
// 4. Error Handling: Fallback model + custom error UI + offline mode
// ============================================================

// --- State ---
let conversations = JSON.parse(localStorage.getItem('manus_conversations') || '[]');
let currentConversationId = null;
let currentMessages = [];
let isStreaming = false;
let selectedModel = 'gpt-5-mini';
let credits = parseInt(localStorage.getItem('manus_credits') || '1000');
let totalCredits = parseInt(localStorage.getItem('manus_total_credits') || '1000');
let usageHistory = JSON.parse(localStorage.getItem('manus_usage') || '[]');
let syncEnabled = localStorage.getItem('manus_sync') === 'true';
let userId = localStorage.getItem('manus_user_id') || generateUserId();
let dbAvailable = false; // tracks whether D1 backend is reachable
let consecutiveAPIFailures = 0; // tracks API failures for auto-fallback
const MAX_API_FAILURES_BEFORE_WARNING = 3;

// Credit cost per model (must match server)
const MODEL_COSTS = { 'gpt-5-mini': 15, 'gpt-5': 45, 'gpt-5-nano': 8 };

// Initialize usage history with welcome bonus if empty
if (usageHistory.length === 0) {
  usageHistory.push({
    detail: 'Welcome bonus for new users',
    date: new Date().toISOString().split('T')[0],
    change: '+1000',
    type: 'bonus'
  });
  localStorage.setItem('manus_usage', JSON.stringify(usageHistory));
}

function generateUserId() {
  const id = 'user_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  localStorage.setItem('manus_user_id', id);
  return id;
}

// Configure marked (markdown renderer)
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value;
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true
});

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  const colors = {
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    success: 'border-green-500/30 bg-green-500/10 text-green-300',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    error: 'border-red-500/30 bg-red-500/10 text-red-300'
  };
  const icons = { info: 'fa-circle-info', success: 'fa-circle-check', warning: 'fa-triangle-exclamation', error: 'fa-circle-xmark' };
  toast.className = `toast-item flex items-center gap-3 px-4 py-3 rounded-xl border ${colors[type]} backdrop-blur-xl shadow-lg min-w-[300px] max-w-[420px]`;
  toast.innerHTML = `
    <i class="fas ${icons[type]} text-sm flex-shrink-0"></i>
    <span class="text-sm flex-1">${escapeHtml(message)}</span>
    <button onclick="this.parentElement.remove()" class="p-1 hover:opacity-70 transition-opacity flex-shrink-0"><i class="fas fa-xmark text-xs"></i></button>`;
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentElement) toast.remove(); }, duration);
}

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  renderConversationList();
  updateAllCreditDisplays();
  setupInputListener();
  checkPaymentReturn();
  checkCreditsStatus();
  updateAccountInfo();

  // Check D1 database availability
  await checkDBAvailability();

  // Load from DB if sync enabled
  if (syncEnabled) {
    const toggle = document.getElementById('sync-toggle');
    if (toggle) toggle.checked = true;
    await loadFromDatabase();
  }

  // Check payment service availability
  checkPaymentAvailability();

  // Close dropdowns on outside click
  document.addEventListener('click', (e) => {
    const modelSelector = document.getElementById('model-selector');
    if (modelSelector && !modelSelector.contains(e.target)) {
      document.getElementById('model-dropdown').classList.add('hidden');
    }
  });
});

function setupInputListener() {
  const input = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  if (!input || !sendBtn) return;
  input.addEventListener('input', () => {
    sendBtn.disabled = input.value.trim().length === 0 || isStreaming;
  });
}

function updateAccountInfo() {
  const uidEl = document.getElementById('account-uid-display');
  if (uidEl) uidEl.textContent = userId;
  const idEl = document.getElementById('account-user-id');
  if (idEl) idEl.textContent = userId;
}

// ============================================================
// 2. PERSISTENCE - D1 Database + localStorage Fallback
// ============================================================
// Strategy:
// - Always save to localStorage (instant, offline-capable)
// - If sync enabled & DB available, also save to D1 via /api/db/*
// - On load: try DB first, fall back to localStorage
// ============================================================

async function checkDBAvailability() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    dbAvailable = data.services?.database === true;
    updateDBBadge();
    updateStorageInfo();
  } catch {
    dbAvailable = false;
    updateDBBadge();
  }
}

function updateDBBadge() {
  const badge = document.getElementById('db-badge');
  if (!badge) return;
  if (syncEnabled && dbAvailable) {
    badge.classList.remove('hidden');
    badge.classList.add('flex', 'bg-green-500/10', 'border', 'border-green-500/20', 'text-green-400');
    badge.classList.remove('bg-amber-500/10', 'border-amber-500/20', 'text-amber-400');
    document.getElementById('db-badge-text').textContent = 'DB synced';
  } else if (syncEnabled && !dbAvailable) {
    badge.classList.remove('hidden');
    badge.classList.add('flex', 'bg-amber-500/10', 'border', 'border-amber-500/20', 'text-amber-400');
    badge.classList.remove('bg-green-500/10', 'border-green-500/20', 'text-green-400');
    document.getElementById('db-badge-text').textContent = 'DB offline';
  } else {
    badge.classList.add('hidden');
    badge.classList.remove('flex');
  }
}

function updateStorageInfo() {
  const typeLabel = document.getElementById('storage-type-label');
  const detail = document.getElementById('storage-detail');
  if (!typeLabel) return;
  if (syncEnabled && dbAvailable) {
    typeLabel.textContent = 'Cloudflare D1 + localStorage';
    if (detail) detail.textContent = 'Cloud synced';
    const dot = typeLabel.parentElement?.querySelector('.rounded-full');
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-green-400';
  } else if (syncEnabled && !dbAvailable) {
    typeLabel.textContent = 'localStorage (D1 unavailable)';
    if (detail) detail.textContent = 'Fallback mode';
    const dot = typeLabel.parentElement?.querySelector('.rounded-full');
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-amber-400';
  } else {
    typeLabel.textContent = 'localStorage';
    if (detail) detail.textContent = 'Browser only';
  }
}

function updateSyncStatus(text) {
  const statusEl = document.getElementById('sync-status');
  const textEl = document.getElementById('sync-status-text');
  if (!statusEl || !textEl) return;
  if (syncEnabled) {
    statusEl.classList.remove('hidden');
    textEl.textContent = text;
    // Auto-hide after 3s
    setTimeout(() => { textEl.textContent = 'Synced'; }, 3000);
  }
}

async function saveToDatabase() {
  if (!syncEnabled || !dbAvailable) return;
  try {
    updateSyncStatus('Syncing...');
    await Promise.all([
      fetch('/api/db/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, conversations })
      }),
      fetch('/api/db/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, credits, totalCredits })
      })
    ]);
    updateSyncStatus('Synced');
  } catch (err) {
    console.warn('DB sync failed:', err.message);
    updateSyncStatus('Sync failed');
  }
}

async function loadFromDatabase() {
  if (!syncEnabled) return;
  if (!dbAvailable) {
    showToast('Cloud database unavailable. Using local data.', 'warning');
    return;
  }
  try {
    updateSyncStatus('Loading...');
    const [convRes, credRes] = await Promise.all([
      fetch(`/api/db/conversations/${encodeURIComponent(userId)}`),
      fetch(`/api/db/credits/${encodeURIComponent(userId)}`)
    ]);

    const convData = await convRes.json();
    const credData = await credRes.json();

    if (convData.success && convData.data && convData.data.length > 0) {
      conversations = convData.data;
      localStorage.setItem('manus_conversations', JSON.stringify(conversations));
      renderConversationList();
      showToast('Conversations synced from cloud', 'success');
    }
    if (credData.success && credData.data) {
      credits = credData.data.credits ?? credits;
      totalCredits = credData.data.totalCredits ?? totalCredits;
      if (credData.data.usageHistory) usageHistory = credData.data.usageHistory;
      localStorage.setItem('manus_credits', credits.toString());
      localStorage.setItem('manus_total_credits', totalCredits.toString());
      localStorage.setItem('manus_usage', JSON.stringify(usageHistory));
      updateAllCreditDisplays();
    }
    updateSyncStatus('Synced');
  } catch (err) {
    showToast('Cloud sync unavailable. Using local data.', 'warning');
    updateSyncStatus('Failed');
  }
}

function toggleSync(enabled) {
  syncEnabled = enabled;
  localStorage.setItem('manus_sync', enabled ? 'true' : 'false');
  updateDBBadge();
  updateStorageInfo();
  if (enabled) {
    if (dbAvailable) {
      saveToDatabase();
      showToast('Cloud sync enabled. Data will be saved to D1 database.', 'success');
    } else {
      showToast('Cloud sync enabled but D1 database is not available. Data saved locally.', 'warning');
    }
    document.getElementById('sync-status').classList.remove('hidden');
  } else {
    document.getElementById('sync-status').classList.add('hidden');
    showToast('Cloud sync disabled. Data stored locally only.', 'info');
  }
}

// ============================================================
// 3. PAYMENT INTEGRATION (Stripe / LemonSqueezy)
// ============================================================
// All payment calls go through server-side proxy at /api/payment/*
// No Stripe or LemonSqueezy keys are ever sent to the client
// ============================================================

let paymentAvailable = false;

async function checkPaymentAvailability() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    paymentAvailable = data.services?.stripe === true || data.services?.lemonsqueezy === true;
    updatePaymentStatus();
  } catch {
    paymentAvailable = false;
    updatePaymentStatus();
  }
}

function updatePaymentStatus() {
  const statusEl = document.getElementById('payment-status');
  if (!statusEl) return;
  if (paymentAvailable) {
    statusEl.className = 'mb-4 p-3 rounded-xl text-xs flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400';
    statusEl.innerHTML = '<i class="fas fa-check-circle"></i><span>Payment gateway connected</span>';
  } else {
    statusEl.className = 'mb-4 p-3 rounded-xl text-xs flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-300';
    statusEl.innerHTML = '<i class="fas fa-info-circle"></i><span>Demo mode - Configure Stripe or LemonSqueezy keys for real payments</span>';
  }
}

async function handlePurchase(plan) {
  showToast('Preparing checkout...', 'info');
  try {
    const res = await fetch('/api/payment/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, userId, returnUrl: window.location.origin })
    });
    const data = await res.json();

    if (data.url) {
      // Redirect to payment provider
      window.location.href = data.url;
    } else if (data.code === 'PAYMENT_NOT_CONFIGURED' || data.demoMode) {
      // Demo mode: simulate purchase
      showPurchaseDemo(plan);
    } else {
      showToast(data.error || 'Payment error', 'error');
    }
  } catch (err) {
    showToast('Payment service unavailable. Running in demo mode.', 'warning');
    showPurchaseDemo(plan);
  }
}

function showPurchaseDemo(plan) {
  const creditsMap = { starter: 5000, pro: 20000 };
  const priceMap = { starter: '$9.99', pro: '$29.99' };
  const addCredits = creditsMap[plan] || 0;

  if (confirm(`DEMO MODE\n\nPurchase ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan for ${priceMap[plan]}?\nThis will add ${addCredits.toLocaleString()} credits.\n\n(In production, Stripe/LemonSqueezy checkout will open)`)) {
    credits += addCredits;
    totalCredits += addCredits;
    localStorage.setItem('manus_credits', credits.toString());
    localStorage.setItem('manus_total_credits', totalCredits.toString());

    usageHistory.unshift({
      detail: `Purchased ${plan} plan (demo)`,
      date: new Date().toISOString().split('T')[0],
      change: `+${addCredits}`,
      type: 'purchase'
    });
    localStorage.setItem('manus_usage', JSON.stringify(usageHistory));

    updateAllCreditDisplays();
    checkCreditsStatus();
    saveToDatabase();
    // Also sync credits to DB
    if (syncEnabled && dbAvailable) {
      fetch('/api/db/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, credits, totalCredits,
          detail: `Purchased ${plan} plan (demo)`,
          change: addCredits, type: 'purchase'
        })
      }).catch(() => {});
    }
    closeSettings();
    showToast(`${addCredits.toLocaleString()} credits added successfully!`, 'success');
  }
}

function checkPaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'success') {
    const addCredits = parseInt(params.get('credits') || '0');
    const plan = params.get('plan');
    const provider = params.get('provider') || 'unknown';
    if (addCredits > 0) {
      credits += addCredits;
      totalCredits += addCredits;
      localStorage.setItem('manus_credits', credits.toString());
      localStorage.setItem('manus_total_credits', totalCredits.toString());
      usageHistory.unshift({
        detail: `Purchased ${plan} plan via ${provider}`,
        date: new Date().toISOString().split('T')[0],
        change: `+${addCredits}`,
        type: 'purchase'
      });
      localStorage.setItem('manus_usage', JSON.stringify(usageHistory));
      updateAllCreditDisplays();
      saveToDatabase();
      showToast(`Payment successful! ${addCredits.toLocaleString()} credits added.`, 'success', 6000);
    }
    window.history.replaceState({}, '', '/');
  } else if (params.get('payment') === 'cancelled') {
    showToast('Payment was cancelled.', 'warning');
    window.history.replaceState({}, '', '/');
  }
}

// ============================================================
// 4. CREDIT SYSTEM + ERROR HANDLING
// ============================================================

function updateAllCreditDisplays() {
  const headerEl = document.getElementById('header-credits');
  if (headerEl) headerEl.textContent = credits.toLocaleString();

  const balanceEl = document.getElementById('credit-balance');
  if (balanceEl) balanceEl.textContent = credits.toLocaleString();

  const progressBar = document.getElementById('credit-progress-bar');
  if (progressBar) {
    const pct = totalCredits > 0 ? Math.max(0, (credits / totalCredits) * 100) : 0;
    progressBar.style.width = pct + '%';
    if (pct < 10) progressBar.className = progressBar.className.replace(/from-\S+ to-\S+/, 'from-red-500 to-red-400');
    else if (pct < 25) progressBar.className = progressBar.className.replace(/from-\S+ to-\S+/, 'from-amber-500 to-amber-400');
    else progressBar.className = progressBar.className.replace(/from-\S+ to-\S+/, 'from-manus-accent to-purple-500');
  }

  const usedLabel = document.getElementById('credits-used-label');
  if (usedLabel) usedLabel.textContent = `${(totalCredits - credits).toLocaleString()} used`;

  const totalLabel = document.getElementById('credits-total-label');
  if (totalLabel) totalLabel.textContent = `${totalCredits.toLocaleString()} total`;

  if (headerEl) {
    headerEl.classList.remove('text-red-400', 'text-amber-400');
    if (credits <= 0) headerEl.classList.add('text-red-400');
    else if (credits < 100) headerEl.classList.add('text-amber-400');
  }
}

function checkCreditsStatus() {
  const overlay = document.getElementById('credits-exhausted-overlay');
  const inputArea = document.getElementById('input-area');
  if (credits <= 0) {
    if (overlay) overlay.classList.remove('hidden');
    if (inputArea) inputArea.classList.add('opacity-50', 'pointer-events-none');
  } else {
    if (overlay) overlay.classList.add('hidden');
    if (inputArea) inputArea.classList.remove('opacity-50', 'pointer-events-none');
  }
}

function dismissCreditsWarning() {
  document.getElementById('credits-exhausted-overlay').classList.add('hidden');
}

function deductCredits(model, taskDescription) {
  const cost = MODEL_COSTS[model] || 15;
  credits = Math.max(0, credits - cost);
  localStorage.setItem('manus_credits', credits.toString());

  const historyEntry = {
    detail: taskDescription.substring(0, 50),
    date: new Date().toISOString().split('T')[0],
    change: `-${cost}`,
    type: 'usage'
  };
  usageHistory.unshift(historyEntry);
  localStorage.setItem('manus_usage', JSON.stringify(usageHistory));

  updateAllCreditDisplays();
  checkCreditsStatus();

  // Sync to DB
  if (syncEnabled && dbAvailable) {
    fetch('/api/db/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId, credits, totalCredits,
        detail: historyEntry.detail,
        change: -cost, type: 'usage'
      })
    }).catch(() => {});
  }
}

// ============================================================
// SIDEBAR & CONVERSATIONS
// ============================================================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebar.classList.toggle('sidebar-collapsed');
  }
}

function newChat() {
  currentConversationId = null;
  currentMessages = [];
  document.getElementById('landing-page').classList.remove('hidden');
  document.getElementById('messages-area').classList.add('hidden');
  document.getElementById('messages-area').innerHTML = '';
  document.getElementById('chat-title').textContent = 'New conversation';
  const fb = document.getElementById('fallback-badge');
  if (fb) { fb.classList.add('hidden'); fb.classList.remove('flex'); }
  document.getElementById('message-input').value = '';
  document.getElementById('send-btn').disabled = true;
  updateActiveConversation();
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('mobile-open');
  }
}

function createConversation(title) {
  const id = Date.now().toString();
  const conv = {
    id,
    title: title.substring(0, 60),
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  conversations.unshift(conv);
  saveConversations();
  renderConversationList();
  return id;
}

function loadConversation(id) {
  const conv = conversations.find(c => c.id === id);
  if (!conv) return;
  currentConversationId = id;
  currentMessages = [...conv.messages];
  document.getElementById('landing-page').classList.add('hidden');
  document.getElementById('messages-area').classList.remove('hidden');
  document.getElementById('messages-area').innerHTML = '';
  document.getElementById('chat-title').textContent = conv.title;
  currentMessages.forEach(msg => renderMessage(msg.role, msg.content, false));
  updateActiveConversation();
  scrollToBottom();
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('mobile-open');
  }
}

function deleteConversation(id, e) {
  e.stopPropagation();
  if (!confirm('Delete this conversation?')) return;
  conversations = conversations.filter(c => c.id !== id);
  saveConversations();
  renderConversationList();
  if (currentConversationId === id) newChat();
  // Also delete from DB
  if (syncEnabled && dbAvailable) {
    fetch(`/api/db/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  }
}

function clearAllConversations() {
  if (confirm('Are you sure you want to delete ALL conversations? This cannot be undone.')) {
    // Delete each from DB
    if (syncEnabled && dbAvailable) {
      conversations.forEach(c => {
        fetch(`/api/db/conversations/${encodeURIComponent(c.id)}`, { method: 'DELETE' }).catch(() => {});
      });
    }
    conversations = [];
    saveConversations();
    renderConversationList();
    newChat();
    showToast('All conversations deleted', 'info');
  }
}

function saveConversations() {
  localStorage.setItem('manus_conversations', JSON.stringify(conversations));
  saveToDatabase();
}

function updateActiveConversation() {
  document.querySelectorAll('.conv-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === currentConversationId);
  });
}

function renderConversationList() {
  const container = document.getElementById('conversations-list');
  if (!container) return;
  if (conversations.length === 0) {
    container.innerHTML = `<div class="px-4 py-8 text-center text-manus-text-dim text-xs">
      <i class="fas fa-message text-2xl mb-2 block opacity-30"></i>No conversations yet</div>`;
    return;
  }
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups = { today: [], yesterday: [], older: [] };
  conversations.forEach(c => {
    const d = new Date(c.createdAt).toDateString();
    if (d === today) groups.today.push(c);
    else if (d === yesterday) groups.yesterday.push(c);
    else groups.older.push(c);
  });
  let html = '';
  if (groups.today.length) {
    html += `<div class="px-3 py-2 text-xs font-medium text-manus-text-dim uppercase tracking-wider">Today</div>`;
    groups.today.forEach(c => html += convItemHTML(c));
  }
  if (groups.yesterday.length) {
    html += `<div class="px-3 py-2 mt-2 text-xs font-medium text-manus-text-dim uppercase tracking-wider">Yesterday</div>`;
    groups.yesterday.forEach(c => html += convItemHTML(c));
  }
  if (groups.older.length) {
    html += `<div class="px-3 py-2 mt-2 text-xs font-medium text-manus-text-dim uppercase tracking-wider">Previous</div>`;
    groups.older.forEach(c => html += convItemHTML(c));
  }
  container.innerHTML = html;
  updateActiveConversation();
}

function convItemHTML(conv) {
  return `<div class="conv-item flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer group border border-transparent" 
    data-id="${conv.id}" onclick="loadConversation('${conv.id}')">
    <i class="fas fa-message text-xs text-manus-text-dim"></i>
    <span class="flex-1 text-sm truncate">${escapeHtml(conv.title)}</span>
    <button onclick="deleteConversation('${conv.id}', event)" 
      class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-manus-surface3 text-manus-text-dim transition-all">
      <i class="fas fa-trash text-[10px]"></i>
    </button>
  </div>`;
}

// ============================================================
// MESSAGES & STREAMING
// ============================================================
function renderMessage(role, content, animate = true) {
  const area = document.getElementById('messages-area');
  if (!area) return;
  const div = document.createElement('div');
  div.className = `mb-6 ${animate ? 'message-bubble' : ''}`;
  if (role === 'user') {
    div.innerHTML = `<div class="flex justify-end"><div class="max-w-[80%] bg-manus-surface2 border border-manus-border rounded-2xl rounded-tr-md px-4 py-3">
      <div class="text-sm whitespace-pre-wrap">${escapeHtml(content)}</div></div></div>`;
  } else {
    div.innerHTML = `<div class="flex gap-3">
      <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-manus-accent to-purple-600 flex items-center justify-center mt-1">
        <i class="fas fa-robot text-white text-xs"></i></div>
      <div class="flex-1 min-w-0">
        <div class="text-xs text-manus-text-dim mb-1.5 font-medium">Manus</div>
        <div class="markdown-body text-sm">${renderMarkdown(content)}</div></div></div>`;
  }
  area.appendChild(div);
  div.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
  addCopyButtons(div);
}

function addCopyButtons(container) {
  container.querySelectorAll('pre').forEach(pre => {
    if (!pre.querySelector('.code-block-header')) {
      const code = pre.querySelector('code');
      const lang = code?.className?.match(/language-(\w+)/)?.[1] || 'code';
      const header = document.createElement('div');
      header.className = 'code-block-header';
      header.innerHTML = `<span>${lang}</span><button onclick="copyCode(this)"><i class="fas fa-copy mr-1"></i>Copy</button>`;
      pre.insertBefore(header, pre.firstChild);
    }
  });
}

function renderThinkingIndicator() {
  const area = document.getElementById('messages-area');
  if (!area) return null;
  const div = document.createElement('div');
  div.id = 'thinking-indicator';
  div.className = 'mb-6 message-bubble';
  div.innerHTML = `<div class="flex gap-3">
    <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-manus-accent to-purple-600 flex items-center justify-center mt-1">
      <i class="fas fa-robot text-white text-xs"></i></div>
    <div class="flex-1">
      <div class="text-xs text-manus-text-dim mb-1.5 font-medium">Manus</div>
      <div class="execution-panel">
        <div class="execution-header">
          <div class="agent-spinner w-4 h-4 border-2 border-manus-accent/30 border-t-manus-accent rounded-full"></div>
          <span class="text-xs font-medium text-manus-text-muted" id="thinking-status">Working on your task...</span>
        </div>
        <div class="execution-steps" id="execution-steps">
          <div class="step-item agent-step">
            <div class="step-icon active"><i class="fas fa-circle text-[6px]"></i></div>
            <span class="text-manus-text-muted">Analyzing your request...</span>
          </div>
        </div>
      </div>
    </div></div>`;
  area.appendChild(div);
  scrollToBottom();
  return div;
}

function addExecutionStep(text, status = 'active') {
  const steps = document.getElementById('execution-steps');
  if (!steps) return;
  steps.querySelectorAll('.step-icon.active').forEach(icon => {
    icon.className = 'step-icon completed';
    icon.innerHTML = '<i class="fas fa-check text-[8px]"></i>';
  });
  const step = document.createElement('div');
  step.className = 'step-item agent-step';
  const iconClass = status === 'completed' ? 'completed' : 'active';
  const iconContent = status === 'completed' ? '<i class="fas fa-check text-[8px]"></i>' : '<i class="fas fa-circle text-[6px]"></i>';
  step.innerHTML = `<div class="step-icon ${iconClass}">${iconContent}</div><span class="text-manus-text-muted">${text}</span>`;
  steps.appendChild(step);
  steps.scrollTop = steps.scrollHeight;
}

function removeThinkingIndicator() {
  const el = document.getElementById('thinking-indicator');
  if (el) el.remove();
}

function renderStreamingMessage() {
  const area = document.getElementById('messages-area');
  if (!area) return;
  const div = document.createElement('div');
  div.id = 'streaming-message';
  div.className = 'mb-6 message-bubble';
  div.innerHTML = `<div class="flex gap-3">
    <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-manus-accent to-purple-600 flex items-center justify-center mt-1">
      <i class="fas fa-robot text-white text-xs"></i></div>
    <div class="flex-1 min-w-0">
      <div class="text-xs text-manus-text-dim mb-1.5 font-medium">Manus</div>
      <div class="markdown-body text-sm" id="streaming-content"><span class="typing-cursor"></span></div></div></div>`;
  area.appendChild(div);
  scrollToBottom();
}

function updateStreamingContent(text) {
  const el = document.getElementById('streaming-content');
  if (!el) return;
  el.innerHTML = renderMarkdown(text) + '<span class="typing-cursor"></span>';
  el.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
  scrollToBottom();
}

function finalizeStreamingMessage(text) {
  const el = document.getElementById('streaming-content');
  if (!el) return;
  el.innerHTML = renderMarkdown(text);
  const parent = el.closest('#streaming-message');
  if (parent) {
    parent.id = '';
    parent.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
    addCopyButtons(parent);
  }
}

// ============================================================
// SEND MESSAGE (with all 4 protections)
// ============================================================
async function sendMessage() {
  const input = document.getElementById('message-input');
  const text = input.value.trim();
  if (!text || isStreaming) return;

  // --- 4. Credit check BEFORE sending ---
  if (credits <= 0) {
    showToast('No credits remaining. Please upgrade your plan.', 'error');
    document.getElementById('credits-exhausted-overlay').classList.remove('hidden');
    return;
  }

  isStreaming = true;
  input.value = '';
  input.style.height = 'auto';
  document.getElementById('send-btn').disabled = true;

  if (!currentConversationId) {
    currentConversationId = createConversation(text);
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('messages-area').classList.remove('hidden');
    document.getElementById('chat-title').textContent = text.substring(0, 60);
  }

  currentMessages.push({ role: 'user', content: text });
  renderMessage('user', text);
  scrollToBottom();

  const conv = conversations.find(c => c.id === currentConversationId);
  if (conv) {
    conv.messages = [...currentMessages];
    conv.updatedAt = new Date().toISOString();
    saveConversations();
  }

  const thinkingEl = renderThinkingIndicator();
  const steps = ['Understanding task context...', 'Planning execution steps...', 'Generating response...'];
  let stepIndex = 0;
  const stepInterval = setInterval(() => {
    if (stepIndex < steps.length) { addExecutionStep(steps[stepIndex]); stepIndex++; }
  }, 800);

  try {
    // --- 1. Security: call server-side proxy (no API key on client) ---
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: currentMessages.map(m => ({ role: m.role, content: m.content })),
        model: selectedModel,
        credits: credits
      })
    });

    clearInterval(stepInterval);

    // --- 4. Error handling for specific HTTP status codes ---
    if (!response.ok) {
      let errorData = {};
      try { errorData = await response.json(); } catch {}

      if (response.status === 402 || errorData.code === 'CREDITS_EXHAUSTED') {
        removeThinkingIndicator();
        renderErrorMessage('credits_exhausted');
        isStreaming = false;
        return;
      }
      if (response.status === 429) {
        removeThinkingIndicator();
        renderErrorMessage('rate_limited');
        isStreaming = false;
        return;
      }
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    // --- 4. Check if fallback was used ---
    const modelUsed = response.headers.get('X-Model-Used') || selectedModel;
    const wasFallback = response.headers.get('X-Fallback') === 'true';

    if (wasFallback) {
      consecutiveAPIFailures++;
      const badge = document.getElementById('fallback-badge');
      if (badge) {
        badge.classList.remove('hidden');
        badge.classList.add('flex');
      }
      if (modelUsed === 'local-fallback') {
        document.getElementById('fallback-badge-text').textContent = 'Offline mode';
        const status = document.getElementById('thinking-status');
        if (status) status.textContent = 'Using offline intelligence...';
        showToast('AI service unavailable. Using offline mode with reduced capabilities.', 'warning');

        // Show API error overlay if consecutive failures exceed threshold
        if (consecutiveAPIFailures >= MAX_API_FAILURES_BEFORE_WARNING) {
          document.getElementById('api-error-overlay').classList.remove('hidden');
        }
      } else {
        document.getElementById('fallback-badge-text').textContent = `Switched to ${modelUsed === 'gpt-5-nano' ? 'Lite' : modelUsed}`;
        const status = document.getElementById('thinking-status');
        if (status) status.textContent = `Primary model unavailable. Switched to fallback...`;
        showToast(`Primary model unavailable. Automatically switched to Lite model.`, 'warning');
      }
    } else {
      // Reset consecutive failures on success
      consecutiveAPIFailures = 0;
      const badge = document.getElementById('fallback-badge');
      if (badge) { badge.classList.add('hidden'); badge.classList.remove('flex'); }
    }

    addExecutionStep('Task completed', 'completed');
    await sleep(500);
    removeThinkingIndicator();
    renderStreamingMessage();

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk.includes('[DONE]')) break;
      fullContent += chunk;
      updateStreamingContent(fullContent);
    }

    finalizeStreamingMessage(fullContent);

    currentMessages.push({ role: 'assistant', content: fullContent });
    if (conv) {
      conv.messages = [...currentMessages];
      conv.updatedAt = new Date().toISOString();
      saveConversations();
    }

    // --- 3. Deduct credits based on actual model used ---
    deductCredits(modelUsed === 'local-fallback' ? 'gpt-5-nano' : modelUsed, text);

  } catch (error) {
    clearInterval(stepInterval);
    removeThinkingIndicator();
    consecutiveAPIFailures++;
    renderErrorMessage('generic', error.message);

    if (consecutiveAPIFailures >= MAX_API_FAILURES_BEFORE_WARNING) {
      document.getElementById('api-error-overlay').classList.remove('hidden');
    }
  }

  isStreaming = false;
  document.getElementById('send-btn').disabled = input.value.trim().length === 0;
}

// ============================================================
// 4. CUSTOM ERROR UI
// ============================================================
function renderErrorMessage(type, details = '') {
  const area = document.getElementById('messages-area');
  if (!area) return;
  const div = document.createElement('div');
  div.className = 'mb-6 message-bubble';

  const errors = {
    credits_exhausted: {
      icon: 'fa-coins',
      bgColor: 'bg-amber-500/5',
      borderColor: 'border-amber-500/20',
      titleColor: 'text-amber-300',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-400',
      title: 'Credits Exhausted',
      message: 'You\'ve used all your available credits. Upgrade your plan to continue chatting with full AI capabilities.',
      action: `<div class="flex gap-2 mt-3">
        <button onclick="openSettings(); showSettingsTab('billing')" class="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm font-medium transition-colors border border-amber-500/20">
          <i class="fas fa-arrow-up-right mr-1.5"></i>Upgrade Plan
        </button>
      </div>`
    },
    rate_limited: {
      icon: 'fa-clock',
      bgColor: 'bg-blue-500/5',
      borderColor: 'border-blue-500/20',
      titleColor: 'text-blue-300',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
      title: 'Rate Limited',
      message: 'Too many requests in a short time. Please wait a moment before trying again.',
      action: `<button onclick="retryLastMessage()" class="mt-3 px-4 py-2 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-300 text-sm hover:bg-blue-500/20 transition-colors">
        <i class="fas fa-rotate-right mr-1.5"></i>Retry in 10s
      </button>`
    },
    api_down: {
      icon: 'fa-wifi',
      bgColor: 'bg-amber-500/5',
      borderColor: 'border-amber-500/20',
      titleColor: 'text-amber-300',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-400',
      title: 'AI Service Unavailable',
      message: 'The AI service is temporarily down. Your message was processed using our offline intelligence with reduced capabilities.',
      action: `<button onclick="retryLastMessage()" class="mt-3 px-4 py-2 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-300 text-sm hover:bg-amber-500/20 transition-colors">
        <i class="fas fa-rotate-right mr-1.5"></i>Retry with AI
      </button>`
    },
    generic: {
      icon: 'fa-circle-exclamation',
      bgColor: 'bg-red-500/5',
      borderColor: 'border-red-500/20',
      titleColor: 'text-red-300',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-400',
      title: 'Something went wrong',
      message: details || 'An unexpected error occurred. The AI service may be temporarily unavailable.',
      action: `<button onclick="retryLastMessage()" class="mt-3 px-4 py-2 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm hover:bg-red-500/20 transition-colors">
        <i class="fas fa-rotate-right mr-1.5"></i>Retry
      </button>`
    }
  };

  const err = errors[type] || errors.generic;

  div.innerHTML = `<div class="flex gap-3">
    <div class="flex-shrink-0 w-8 h-8 rounded-lg ${err.iconBg} flex items-center justify-center mt-1">
      <i class="fas ${err.icon} ${err.iconColor} text-sm"></i></div>
    <div class="flex-1">
      <div class="text-xs text-manus-text-dim mb-1.5 font-medium">System</div>
      <div class="p-4 ${err.bgColor} border ${err.borderColor} rounded-xl">
        <div class="font-medium text-sm ${err.titleColor} mb-1">${err.title}</div>
        <div class="text-sm text-manus-text-muted">${err.message}</div>
        ${err.action}
      </div>
    </div></div>`;

  area.appendChild(div);
  scrollToBottom();
}

function retryLastMessage() {
  if (currentMessages.length > 0 && currentMessages[currentMessages.length - 1].role === 'user') {
    const lastMsg = currentMessages.pop();
    const conv = conversations.find(c => c.id === currentConversationId);
    if (conv) conv.messages = [...currentMessages];
    document.getElementById('message-input').value = lastMsg.content;
    document.getElementById('send-btn').disabled = false;
    sendMessage();
  }
}

function quickAction(text) {
  document.getElementById('message-input').value = text;
  document.getElementById('send-btn').disabled = false;
  sendMessage();
}

// ============================================================
// MODEL SELECTOR
// ============================================================
function toggleModelDropdown() {
  document.getElementById('model-dropdown').classList.toggle('hidden');
}
function selectModel(id, name, icon) {
  selectedModel = id;
  document.getElementById('selected-model-name').textContent = name;
  document.getElementById('selected-model-icon').textContent = icon;
  document.getElementById('model-dropdown').classList.add('hidden');
  showToast(`Model: ${name} (${MODEL_COSTS[id]} credits/msg)`, 'info', 2000);
}

// ============================================================
// SETTINGS
// ============================================================
function openSettings() {
  document.getElementById('settings-modal').classList.remove('hidden');
  updateAllCreditDisplays();
  renderUsageHistory();
  updateAccountInfo();
  updateStorageInfo();
  checkPaymentAvailability();
}
function closeSettings() {
  document.getElementById('settings-modal').classList.add('hidden');
}
function showSettingsTab(tab) {
  document.querySelectorAll('.settings-tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.settings-tab-btn').forEach(el => el.classList.remove('active'));
  const tabEl = document.getElementById(`settings-${tab}`);
  const btnEl = document.querySelector(`.settings-tab-btn[data-tab="${tab}"]`);
  if (tabEl) tabEl.classList.remove('hidden');
  if (btnEl) btnEl.classList.add('active');
}
function renderUsageHistory() {
  const container = document.getElementById('usage-history');
  if (!container) return;
  if (usageHistory.length === 0) {
    container.innerHTML = '<div class="py-4 text-center text-manus-text-dim text-xs">No usage history yet</div>';
    return;
  }
  container.innerHTML = usageHistory.slice(0, 50).map(item => {
    const isPositive = item.change.startsWith('+');
    const typeIcon = item.type === 'purchase' ? '<i class="fas fa-credit-card text-green-400 mr-1"></i>' :
                     item.type === 'bonus' ? '<i class="fas fa-gift text-purple-400 mr-1"></i>' :
                     '<i class="fas fa-message text-manus-text-dim mr-1"></i>';
    return `<div class="grid grid-cols-3 py-3 text-sm">
      <span class="truncate pr-4">${typeIcon}${escapeHtml(item.detail)}</span>
      <span class="text-manus-text-muted">${item.date}</span>
      <span class="text-right font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}">${item.change}</span>
    </div>`;
  }).join('');
}

// ============================================================
// UTILITIES
// ============================================================
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const input = document.getElementById('message-input');
  input.value += `\n[Attached: ${file.name}]`;
  input.dispatchEvent(new Event('input'));
}
function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}
function scrollToBottom() {
  const container = document.getElementById('chat-container');
  if (container) requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
}
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
function renderMarkdown(text) {
  try { return marked.parse(text); } catch { return escapeHtml(text); }
}
function copyCode(btn) {
  const pre = btn.closest('pre');
  const code = pre.querySelector('code');
  navigator.clipboard.writeText(code.textContent).then(() => {
    btn.innerHTML = '<i class="fas fa-check mr-1"></i>Copied!';
    setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy mr-1"></i>Copy'; }, 2000);
  });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); newChat(); }
  if (e.key === 'Escape') closeSettings();
});
