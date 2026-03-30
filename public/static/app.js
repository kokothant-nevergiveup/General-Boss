// ============================================================
// Manus AI - Phase 4: Agentic Execution System Frontend
// ============================================================
// Architecture:
// 1. Security: API keys NEVER in this file. All via /api/* proxy.
// 2. Persistence: Supabase PostgreSQL (primary) via server routes.
// 3. Credits: Stripe/LemonSqueezy + real credit deduction.
// 4. Agent Mode: Task decomposition, Thinking Process UI.
// 5. Multimodal: Slides Generator, Web Designer Preview.
// 6. Notifications: Task completion alerts.
// ============================================================

// --- State ---
let conversations = [];
let currentConversationId = null;
let currentMessages = [];
let isStreaming = false;
let selectedModel = 'gpt-5-mini';
let credits = 1000;
let totalCredits = 1000;
let usageHistory = [];
let userId = localStorage.getItem('manus_user_id') || generateUserId();
let dbAvailable = false;
let consecutiveAPIFailures = 0;
let dataLoaded = false;
const MAX_API_FAILURES_BEFORE_WARNING = 3;

// Agent Mode state
let agentModeEnabled = false;
let agentTasks = []; // { id, title, status, steps, createdAt }
let notifications = [];

// Slides state
let currentSlides = [];
let currentSlideIndex = 0;

// Web Preview state
let currentWebCode = '';

// Credit cost per model
const MODEL_COSTS = { 'gpt-5-mini': 15, 'gpt-5': 45, 'gpt-5-nano': 8 };

function generateUserId() {
  const id = 'user_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  localStorage.setItem('manus_user_id', id);
  return id;
}

// Configure marked
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value;
    return hljs.highlightAuto(code).value;
  },
  breaks: true, gfm: true
});

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  const icons = {
    info: 'fa-sparkles',
    success: 'fa-circle-check',
    warning: 'fa-triangle-exclamation',
    error: 'fa-circle-xmark'
  };
  const toastType = ['info', 'success', 'warning', 'error'].includes(type) ? type : 'info';
  toast.className = `toast-item toast-${toastType}`;
  toast.innerHTML = `<div class="toast-icon-wrap"><i class="fas ${icons[toastType]} text-sm"></i></div>
    <div class="toast-copy"><div class="toast-label">${toastType === 'success' ? 'Completed' : toastType === 'warning' ? 'Heads up' : toastType === 'error' ? 'Issue detected' : 'General Boss'}</div><div class="toast-message">${escapeHtml(message)}</div></div>
    <button onclick="this.parentElement.remove()" class="toast-close-btn" aria-label="Dismiss notification"><i class="fas fa-xmark text-xs"></i></button>`;
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentElement) toast.remove(); }, duration);
}

function updateAgentModeHint() {
  const hintText = document.querySelector('#landing-page .mt-8 span');
  if (!hintText) return;
  hintText.innerHTML = agentModeEnabled
    ? 'Agent Mode is <span class="text-manus-accent">active</span> for deep autonomous execution'
    : 'Enable <button onclick="document.getElementById(\'agent-mode-toggle\').click()" class="text-manus-accent hover:underline">Agent Mode</button> for deep autonomous execution';
}

function updateThinkingProgress(current, total) {
  const fill = document.getElementById('thinking-progress-fill');
  const meta = document.getElementById('thinking-progress-meta');
  const safeTotal = Math.max(total || 1, 1);
  const clampedCurrent = Math.min(Math.max(current || 0, 0), safeTotal);
  if (fill) fill.style.width = `${Math.max((clampedCurrent / safeTotal) * 100, 8)}%`;
  if (meta) meta.textContent = `${clampedCurrent}/${safeTotal}`;
}

function setThinkingIndicatorState(state, statusText = '') {
  const indicator = document.getElementById('thinking-indicator');
  if (!indicator) return;
  indicator.dataset.phase = state;
  const status = document.getElementById('thinking-status');
  if (statusText && status) status.textContent = statusText;
}

function finalizeThinkingIndicator() {
  const indicator = document.getElementById('thinking-indicator');
  if (!indicator) return;
  indicator.classList.add('is-complete');
  setThinkingIndicatorState('complete', agentModeEnabled ? 'Task plan completed' : 'Execution trace completed');
}

function updateAgentModeUI() {
  const badge = document.getElementById('agent-badge');
  const body = document.body;
  if (agentModeEnabled) {
    if (badge) { badge.classList.remove('hidden'); badge.classList.add('flex'); }
    body.classList.add('agent-mode-active');
  } else {
    if (badge) { badge.classList.add('hidden'); badge.classList.remove('flex'); }
    body.classList.remove('agent-mode-active');
  }
  updateAgentModeHint();
}

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  updateAllCreditDisplays();
  setupInputListener();
  checkPaymentReturn();
  updateAccountInfo();
  updateAgentModeUI();
  await initializeFromDatabase();
  checkPaymentAvailability();

  // Close dropdowns on outside click
  document.addEventListener('click', (e) => {
    const modelSelector = document.getElementById('model-selector');
    if (modelSelector && !modelSelector.contains(e.target)) {
      document.getElementById('model-dropdown').classList.add('hidden');
    }
    const notifPanel = document.getElementById('notification-panel');
    const notifBell = document.getElementById('notification-bell');
    if (notifPanel && !notifPanel.contains(e.target) && notifBell && !notifBell.contains(e.target)) {
      notifPanel.classList.add('hidden');
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
// AGENT MODE
// ============================================================
function toggleAgentMode(enabled) {
  agentModeEnabled = enabled;
  updateAgentModeUI();
  if (enabled) showToast('Agent Mode enabled. Tasks will be decomposed and executed autonomously.', 'info', 3000);
}

function decomposeTask(userMessage) {
  const msg = userMessage.toLowerCase();
  const steps = [];

  if (msg.includes('slide') || msg.includes('presentation') || msg.includes('deck')) {
    steps.push(
      { id: 1, text: 'Analyzing presentation requirements', status: 'pending' },
      { id: 2, text: 'Researching topic and key points', status: 'pending' },
      { id: 3, text: 'Creating slide structure and outline', status: 'pending' },
      { id: 4, text: 'Generating slide content', status: 'pending' },
      { id: 5, text: 'Applying design and formatting', status: 'pending' },
      { id: 6, text: 'Rendering interactive preview', status: 'pending' }
    );
  } else if (msg.includes('website') || msg.includes('landing') || msg.includes('web app') || msg.includes('web page')) {
    steps.push(
      { id: 1, text: 'Analyzing website requirements', status: 'pending' },
      { id: 2, text: 'Designing layout and component structure', status: 'pending' },
      { id: 3, text: 'Building HTML structure', status: 'pending' },
      { id: 4, text: 'Styling with Tailwind CSS', status: 'pending' },
      { id: 5, text: 'Adding interactive JavaScript', status: 'pending' },
      { id: 6, text: 'Rendering live preview', status: 'pending' }
    );
  } else if (msg.includes('automat') || msg.includes('workflow') || msg.includes('script')) {
    steps.push(
      { id: 1, text: 'Understanding automation requirements', status: 'pending' },
      { id: 2, text: 'Mapping workflow steps', status: 'pending' },
      { id: 3, text: 'Designing data flow', status: 'pending' },
      { id: 4, text: 'Generating implementation code', status: 'pending' },
      { id: 5, text: 'Creating deployment instructions', status: 'pending' }
    );
  } else if (msg.includes('design') || msg.includes('brand') || msg.includes('logo') || msg.includes('ui') || msg.includes('ux')) {
    steps.push(
      { id: 1, text: 'Analyzing design brief', status: 'pending' },
      { id: 2, text: 'Researching design trends', status: 'pending' },
      { id: 3, text: 'Creating color palette & typography', status: 'pending' },
      { id: 4, text: 'Generating design concepts', status: 'pending' },
      { id: 5, text: 'Compiling brand guidelines', status: 'pending' }
    );
  } else {
    steps.push(
      { id: 1, text: 'Understanding your request', status: 'pending' },
      { id: 2, text: 'Researching and analyzing', status: 'pending' },
      { id: 3, text: 'Formulating comprehensive response', status: 'pending' },
      { id: 4, text: 'Refining and formatting output', status: 'pending' }
    );
  }
  return steps;
}

// ============================================================
// NOTIFICATIONS
// ============================================================
function addNotification(title, body, type = 'info') {
  const notif = {
    id: Date.now().toString(),
    title, body, type,
    createdAt: new Date().toISOString(),
    read: false
  };
  notifications.unshift(notif);
  updateNotificationBadge();
  renderNotifications();
}

function updateNotificationBadge() {
  const countEl = document.getElementById('notif-count');
  const unread = notifications.filter(n => !n.read).length;
  if (!countEl) return;
  if (unread > 0) {
    countEl.textContent = unread > 9 ? '9+' : unread;
    countEl.classList.remove('hidden');
    countEl.classList.add('flex');
  } else {
    countEl.classList.add('hidden');
    countEl.classList.remove('flex');
  }
}

function toggleNotifications() {
  const panel = document.getElementById('notification-panel');
  if (!panel) return;
  panel.classList.toggle('hidden');
  // Mark all as read
  notifications.forEach(n => n.read = true);
  updateNotificationBadge();
}

function clearNotifications() {
  notifications = [];
  updateNotificationBadge();
  renderNotifications();
}

function renderNotifications() {
  const list = document.getElementById('notification-list');
  if (!list) return;
  if (notifications.length === 0) {
    list.innerHTML = '<div class="px-3 py-6 text-center text-manus-text-dim text-xs"><i class="fas fa-check-circle text-lg mb-2 block opacity-30"></i>No new notifications</div>';
    return;
  }
  list.innerHTML = notifications.slice(0, 20).map(n => {
    const icons = { info: 'fa-circle-info text-blue-400', success: 'fa-circle-check text-green-400', warning: 'fa-triangle-exclamation text-amber-400', error: 'fa-circle-xmark text-red-400' };
    const timeAgo = getTimeAgo(n.createdAt);
    return `<div class="notif-item ${n.read ? '' : 'unread'}">
      <div class="flex items-start gap-3">
        <div class="notif-icon-wrap"><i class="fas ${icons[n.type] || icons.info} text-sm mt-0.5"></i></div>
        <div class="flex-1 min-w-0">
          <div class="text-xs font-medium text-manus-text">${escapeHtml(n.title)}</div>
          <div class="text-[11px] text-manus-text-muted mt-1 leading-5">${escapeHtml(n.body)}</div>
          <div class="text-[10px] text-manus-text-dim mt-2">${timeAgo}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
}

// ============================================================
// PERSISTENCE - Supabase PostgreSQL
// ============================================================
async function initializeFromDatabase() {
  updateSyncStatus('Connecting to Supabase...');
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    dbAvailable = data.services?.supabase === true || data.services?.database === true;
  } catch { dbAvailable = false; }

  updateDBBadge();
  updateStorageInfo();

  if (dbAvailable) {
    await loadAllFromDatabase();
  } else {
    updateSyncStatus('Database offline');
    showToast('Supabase database unavailable. Running in offline mode.', 'warning');
  }
}

async function loadAllFromDatabase() {
  if (!dbAvailable) return;
  try {
    updateSyncStatus('Loading data...');
    const [convRes, profileRes] = await Promise.all([
      fetch(`/api/db/conversations/${encodeURIComponent(userId)}`),
      fetch(`/api/db/profile/${encodeURIComponent(userId)}`)
    ]);
    const convData = await convRes.json();
    const profileData = await profileRes.json();
    if (convData.success && convData.data) conversations = convData.data;
    if (profileData.success && profileData.data) {
      credits = profileData.data.credits ?? 1000;
      totalCredits = profileData.data.totalCredits ?? 1000;
      if (profileData.data.usageHistory) usageHistory = profileData.data.usageHistory;
    }
    dataLoaded = true;
    renderConversationList();
    updateAllCreditDisplays();
    checkCreditsStatus();
    updateSyncStatus('Synced');
  } catch (err) {
    console.error('Failed to load from database:', err);
    updateSyncStatus('Sync failed');
    showToast('Failed to load data from cloud. Try refreshing.', 'error');
  }
}

function updateDBBadge() {
  const badge = document.getElementById('db-badge');
  if (!badge) return;
  badge.classList.remove('hidden');
  if (dbAvailable) {
    badge.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-green-500/10 border border-green-500/20 text-green-400';
    document.getElementById('db-badge-text').textContent = 'Supabase';
  } else {
    badge.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400';
    document.getElementById('db-badge-text').textContent = 'Offline';
  }
}

function updateStorageInfo() {
  const typeLabel = document.getElementById('storage-type-label');
  const detail = document.getElementById('storage-detail');
  if (!typeLabel) return;
  if (dbAvailable) {
    typeLabel.textContent = 'Supabase PostgreSQL';
    if (detail) detail.textContent = 'Cloud synced';
    const dot = typeLabel.parentElement?.querySelector('.rounded-full');
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-green-400';
  } else {
    typeLabel.textContent = 'Offline (no persistence)';
    if (detail) detail.textContent = 'Data lost on refresh';
    const dot = typeLabel.parentElement?.querySelector('.rounded-full');
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-red-400';
  }
}

function updateSyncStatus(text) {
  const textEl = document.getElementById('sync-status-text');
  if (textEl) textEl.textContent = text;
}

async function saveConversationsToDB() {
  if (!dbAvailable) return;
  try {
    updateSyncStatus('Saving...');
    await fetch('/api/db/conversations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, conversations })
    });
    updateSyncStatus('Synced');
  } catch (err) {
    console.warn('Failed to save conversations:', err.message);
    updateSyncStatus('Save failed');
  }
}

async function updateProfileInDB(extra = {}) {
  if (!dbAvailable) return;
  try {
    await fetch('/api/db/profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, credits, totalCredits, ...extra })
    });
  } catch (err) { console.warn('Failed to update profile:', err.message); }
}

// ============================================================
// PAYMENT INTEGRATION
// ============================================================
let paymentAvailable = false;

async function checkPaymentAvailability() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    paymentAvailable = data.services?.stripe === true || data.services?.lemonsqueezy === true;
    updatePaymentStatus();
  } catch { paymentAvailable = false; updatePaymentStatus(); }
}

function updatePaymentStatus() {
  const statusEl = document.getElementById('payment-status');
  if (!statusEl) return;
  if (paymentAvailable) {
    statusEl.className = 'mb-4 p-3 rounded-xl text-xs flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400';
    statusEl.innerHTML = '<i class="fas fa-check-circle"></i><span>Payment gateway connected</span>';
  } else {
    statusEl.className = 'mb-4 p-3 rounded-xl text-xs flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-300';
    statusEl.innerHTML = '<i class="fas fa-info-circle"></i><span>Demo mode - Configure Stripe or LemonSqueezy for real payments</span>';
  }
}

async function handlePurchase(plan) {
  showToast('Preparing checkout...', 'info');
  try {
    const res = await fetch('/api/payment/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, userId, returnUrl: window.location.origin })
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else if (data.code === 'PAYMENT_NOT_CONFIGURED' || data.demoMode) showPurchaseDemo(plan);
    else showToast(data.error || 'Payment error', 'error');
  } catch { showToast('Payment service unavailable. Running in demo mode.', 'warning'); showPurchaseDemo(plan); }
}

function showPurchaseDemo(plan) {
  const creditsMap = { starter: 5000, pro: 20000 };
  const priceMap = { starter: '$9.99', pro: '$29.99' };
  const addCredits = creditsMap[plan] || 0;
  if (confirm(`DEMO MODE\n\nPurchase ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan for ${priceMap[plan]}?\nThis will add ${addCredits.toLocaleString()} credits.`)) {
    credits += addCredits;
    totalCredits += addCredits;
    usageHistory.unshift({ detail: `Purchased ${plan} plan (demo)`, date: new Date().toISOString().split('T')[0], change: `+${addCredits}`, type: 'purchase' });
    updateAllCreditDisplays();
    checkCreditsStatus();
    updateProfileInDB({ detail: `Purchased ${plan} plan (demo)`, change: addCredits, type: 'purchase' });
    closeSettings();
    showToast(`${addCredits.toLocaleString()} credits added successfully!`, 'success');
    addNotification('Purchase Complete', `${addCredits.toLocaleString()} credits added to your account.`, 'success');
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
      usageHistory.unshift({ detail: `Purchased ${plan} plan via ${provider}`, date: new Date().toISOString().split('T')[0], change: `+${addCredits}`, type: 'purchase' });
      updateAllCreditDisplays();
      updateProfileInDB({ detail: `Purchased ${plan} plan via ${provider}`, change: addCredits, type: 'purchase' });
      showToast(`Payment successful! ${addCredits.toLocaleString()} credits added.`, 'success', 6000);
    }
    window.history.replaceState({}, '', '/');
  } else if (params.get('payment') === 'cancelled') {
    showToast('Payment was cancelled.', 'warning');
    window.history.replaceState({}, '', '/');
  }
}

// ============================================================
// CREDIT SYSTEM
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
  const historyEntry = { detail: taskDescription.substring(0, 50), date: new Date().toISOString().split('T')[0], change: `-${cost}`, type: 'usage' };
  usageHistory.unshift(historyEntry);
  updateAllCreditDisplays();
  checkCreditsStatus();
  updateProfileInDB({ detail: historyEntry.detail, change: -cost, type: 'usage' });
}

// ============================================================
// SIDEBAR & CONVERSATIONS
// ============================================================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768) sidebar.classList.toggle('mobile-open');
  else sidebar.classList.toggle('sidebar-collapsed');
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
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('mobile-open');
}

function createConversation(title) {
  const id = Date.now().toString();
  const conv = { id, title: title.substring(0, 60), messages: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  conversations.unshift(conv);
  saveConversationsToDB();
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
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('mobile-open');
}

async function deleteConversation(id, e) {
  e.stopPropagation();
  if (!confirm('Delete this conversation?')) return;
  conversations = conversations.filter(c => c.id !== id);
  renderConversationList();
  if (currentConversationId === id) newChat();
  if (dbAvailable) {
    try { await fetch(`/api/db/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' }); } catch {}
  }
}

async function clearAllConversations() {
  if (confirm('Are you sure you want to delete ALL conversations? This cannot be undone.')) {
    if (dbAvailable) {
      for (const c of conversations) {
        try { await fetch(`/api/db/conversations/${encodeURIComponent(c.id)}`, { method: 'DELETE' }); } catch {}
      }
    }
    conversations = [];
    renderConversationList();
    newChat();
    showToast('All conversations deleted', 'info');
  }
}

function saveConversations() { saveConversationsToDB(); }

function updateActiveConversation() {
  document.querySelectorAll('.conv-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === currentConversationId);
  });
}

function renderConversationList() {
  const container = document.getElementById('conversations-list');
  if (!container) return;
  if (conversations.length === 0) {
    container.innerHTML = '<div class="px-4 py-8 text-center text-manus-text-dim text-xs"><i class="fas fa-message text-2xl mb-2 block opacity-30"></i>No conversations yet</div>';
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
    html += '<div class="px-3 py-2 text-xs font-medium text-manus-text-dim uppercase tracking-wider">Today</div>';
    groups.today.forEach(c => html += convItemHTML(c));
  }
  if (groups.yesterday.length) {
    html += '<div class="px-3 py-2 mt-2 text-xs font-medium text-manus-text-dim uppercase tracking-wider">Yesterday</div>';
    groups.yesterday.forEach(c => html += convItemHTML(c));
  }
  if (groups.older.length) {
    html += '<div class="px-3 py-2 mt-2 text-xs font-medium text-manus-text-dim uppercase tracking-wider">Previous</div>';
    groups.older.forEach(c => html += convItemHTML(c));
  }
  container.innerHTML = html;
  updateActiveConversation();
}

function convItemHTML(conv) {
  return `<div class="conv-item flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer group border border-transparent" data-id="${conv.id}" onclick="loadConversation('${conv.id}')">
    <i class="fas fa-message text-xs text-manus-text-dim"></i>
    <span class="flex-1 text-sm truncate">${escapeHtml(conv.title)}</span>
    <button onclick="deleteConversation('${conv.id}', event)" class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-manus-surface3 text-manus-text-dim transition-all"><i class="fas fa-trash text-[10px]"></i></button>
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

  // Detect and render multimodal outputs
  if (role === 'assistant') {
    detectAndRenderSlides(content, div);
    detectAndRenderWebPreview(content, div);
  }
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

// ============================================================
// AGENT MODE: THINKING PROCESS UI
// ============================================================
function renderThinkingIndicator(taskSteps) {
  const area = document.getElementById('messages-area');
  if (!area) return null;
  const div = document.createElement('div');
  div.id = 'thinking-indicator';
  div.className = 'mb-6 message-bubble thinking-indicator-wrap';

  const isAgent = agentModeEnabled && taskSteps && taskSteps.length > 0;
  const panelClass = isAgent ? 'agent-execution-panel' : 'execution-panel';
  const totalSteps = isAgent ? taskSteps.length : 4;
  const initialProgress = isAgent ? 1 : 1;

  let stepsHtml = '';
  if (isAgent && taskSteps) {
    stepsHtml = `<div class="task-checklist" id="task-checklist">
      ${taskSteps.map((s, i) => `<div class="task-checklist-item ${i === 0 ? 'active' : ''}" data-step="${s.id}">
        <div class="task-check">${i === 0 ? '<i class="fas fa-spinner fa-spin text-[8px]"></i>' : '<span class="text-[8px]">${s.id}</span>'}</div>
        <span class="text-manus-text-muted flex-1">${s.text}</span>
        <span class="task-status ${i === 0 ? 'executing' : 'pending'} text-[10px]">${i === 0 ? 'Running' : 'Pending'}</span>
      </div>`).join('')}
    </div>`;
  } else {
    stepsHtml = `<div class="execution-steps" id="execution-steps">
      <div class="step-item agent-step"><div class="step-icon active"><i class="fas fa-circle text-[6px]"></i></div><span class="text-manus-text-muted">Analyzing your request...</span></div>
    </div>`;
  }

  div.innerHTML = `<div class="flex gap-3">
    <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-manus-accent to-purple-600 flex items-center justify-center mt-1">
      <i class="fas fa-robot text-white text-xs"></i></div>
    <div class="flex-1">
      <div class="text-xs text-manus-text-dim mb-1.5 font-medium">Manus ${isAgent ? '<span class="text-manus-accent ml-1">Agent</span>' : ''}</div>
      <div class="${panelClass}">
        <div class="execution-header">
          <div class="execution-header-main">
            <div class="execution-label-row">
              <span class="thinking-kicker">${isAgent ? 'Thinking Process' : 'Execution Trace'}</span>
              <span class="thinking-progress-meta" id="thinking-progress-meta">${initialProgress}/${totalSteps}</span>
            </div>
            <div class="execution-status-row">
              <div class="agent-spinner w-4 h-4 border-2 border-manus-accent/30 border-t-manus-accent rounded-full"></div>
              <span class="text-xs font-medium text-manus-text-muted" id="thinking-status">${isAgent ? 'Executing task plan...' : 'Working on your task...'}</span>
            </div>
          </div>
        </div>
        <div class="thinking-progress-track"><div class="thinking-progress-fill" id="thinking-progress-fill" style="width:${Math.max((initialProgress / totalSteps) * 100, 8)}%"></div></div>
        ${stepsHtml}
      </div>
    </div></div>`;
  area.appendChild(div);
  div.dataset.phase = 'executing';
  div.dataset.totalSteps = totalSteps;
  scrollToBottom();
  return div;
}

function advanceAgentStep(stepId) {
  const checklist = document.getElementById('task-checklist');
  if (!checklist) return;
  const items = checklist.querySelectorAll('.task-checklist-item');
  items.forEach(item => {
    const sid = parseInt(item.dataset.step);
    const check = item.querySelector('.task-check');
    const status = item.querySelector('.task-status');
    if (sid < stepId) {
      item.className = 'task-checklist-item completed';
      check.innerHTML = '<i class="fas fa-check text-[8px]"></i>';
      status.textContent = 'Done';
      status.className = 'task-status success text-[10px]';
    } else if (sid === stepId) {
      item.className = 'task-checklist-item active';
      check.innerHTML = '<i class="fas fa-spinner fa-spin text-[8px]"></i>';
      status.textContent = 'Running';
      status.className = 'task-status executing text-[10px]';
    }
  });
  updateThinkingProgress(stepId, items.length);
  scrollToBottom();
}

function completeAllAgentSteps() {
  const checklist = document.getElementById('task-checklist');
  if (!checklist) return;
  checklist.querySelectorAll('.task-checklist-item').forEach(item => {
    item.className = 'task-checklist-item completed';
    const check = item.querySelector('.task-check');
    const status = item.querySelector('.task-status');
    check.innerHTML = '<i class="fas fa-check text-[8px]"></i>';
    status.textContent = 'Done';
    status.className = 'task-status success text-[10px]';
  });
  updateThinkingProgress(checklist.querySelectorAll('.task-checklist-item').length, checklist.querySelectorAll('.task-checklist-item').length);
  setThinkingIndicatorState('responding', 'All steps completed. Drafting final response...');
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
  updateThinkingProgress(steps.children.length, parseInt(document.getElementById('thinking-indicator')?.dataset.totalSteps || '4', 10));
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
    // Detect multimodal
    detectAndRenderSlides(text, parent);
    detectAndRenderWebPreview(text, parent);
  }
}

// ============================================================
// MULTIMODAL: SLIDES GENERATOR
// ============================================================
function detectAndRenderSlides(content, container) {
  // Look for slide-like markdown patterns
  const slidePattern = /## Slide \d+[:\s]/gi;
  const hasSlides = slidePattern.test(content);
  if (!hasSlides) return;

  const slides = parseSlides(content);
  if (slides.length < 2) return;

  currentSlides = slides;
  currentSlideIndex = 0;

  const slideCard = document.createElement('div');
  slideCard.className = 'mt-4';
  slideCard.innerHTML = `
    <div class="slide-card" onclick="openSlidePreview()">
      <div class="slide-card-header">
        <div class="flex items-center gap-2">
          <i class="fas fa-file-powerpoint text-orange-400 text-xs"></i>
          <span class="text-xs font-medium text-white/80">Presentation (${slides.length} slides)</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] text-white/40">Click to preview</span>
          <i class="fas fa-expand text-white/40 text-[10px]"></i>
        </div>
      </div>
      <div class="slide-card-body slide-theme-dark">
        <div class="slide-mini">
          <h3>${escapeHtml(slides[0].title)}</h3>
          <p class="text-white/60 text-xs">${escapeHtml(slides[0].subtitle || slides[0].content.substring(0, 80))}</p>
        </div>
      </div>
    </div>`;

  // Insert after the markdown body
  const mdBody = container.querySelector('.markdown-body');
  if (mdBody) mdBody.after(slideCard);
  else container.appendChild(slideCard);
}

function parseSlides(content) {
  const sections = content.split(/(?=## Slide \d+)/gi);
  const slides = [];
  sections.forEach(section => {
    const titleMatch = section.match(/## Slide \d+[:\s]*(.+)/i);
    if (!titleMatch) return;
    const title = titleMatch[1].trim();
    const bodyText = section.replace(/## Slide \d+[:\s]*.+/i, '').trim();
    const subtitleMatch = bodyText.match(/\*\*(.+?)\*\*/);
    slides.push({
      title,
      subtitle: subtitleMatch ? subtitleMatch[1] : '',
      content: bodyText,
      bullets: bodyText.match(/^[-*]\s+.+/gm)?.map(b => b.replace(/^[-*]\s+/, '')) || []
    });
  });
  return slides;
}

function openSlidePreview() {
  if (currentSlides.length === 0) return;
  document.getElementById('slide-preview-modal').classList.remove('hidden');
  currentSlideIndex = 0;
  renderCurrentSlide();
}

function closeSlidePreview() {
  document.getElementById('slide-preview-modal').classList.add('hidden');
}

function prevSlide() {
  if (currentSlideIndex > 0) { currentSlideIndex--; renderCurrentSlide(); }
}

function nextSlide() {
  if (currentSlideIndex < currentSlides.length - 1) { currentSlideIndex++; renderCurrentSlide(); }
}

function renderCurrentSlide() {
  const slide = currentSlides[currentSlideIndex];
  if (!slide) return;
  const counter = document.getElementById('slide-counter');
  if (counter) counter.textContent = `Slide ${currentSlideIndex + 1} / ${currentSlides.length}`;
  const titleEl = document.getElementById('slide-preview-title');
  if (titleEl) titleEl.textContent = slide.title;

  const content = document.getElementById('slide-content');
  if (!content) return;

  const themes = ['slide-theme-dark', 'slide-theme-accent', 'slide-theme-cool'];
  content.className = `w-full max-w-[960px] aspect-[16/9] ${themes[currentSlideIndex % themes.length]} rounded-xl shadow-2xl overflow-hidden`;

  const isTitle = currentSlideIndex === 0;
  let html = `<div class="slide-render ${isTitle ? 'title-slide' : ''}">`;

  if (isTitle) {
    html += `<h1>${escapeHtml(slide.title)}</h1>`;
    if (slide.subtitle) html += `<p class="subtitle">${escapeHtml(slide.subtitle)}</p>`;
  } else {
    html += `<h2>${escapeHtml(slide.title)}</h2>`;
    if (slide.bullets.length > 0) {
      html += '<ul>';
      slide.bullets.forEach(b => { html += `<li>${escapeHtml(b)}</li>`; });
      html += '</ul>';
    } else if (slide.content) {
      const lines = slide.content.split('\n').filter(l => l.trim());
      lines.slice(0, 6).forEach(line => {
        const cleanLine = line.replace(/\*\*/g, '').replace(/^#+\s*/, '');
        if (cleanLine.trim()) html += `<p>${escapeHtml(cleanLine)}</p>`;
      });
    }
  }
  html += '</div>';
  content.innerHTML = html;
}

// ============================================================
// MULTIMODAL: WEB PREVIEW
// ============================================================
function detectAndRenderWebPreview(content, container) {
  // Look for HTML code blocks
  const htmlMatch = content.match(/```html\s*\n([\s\S]*?)```/);
  if (!htmlMatch) return;

  const htmlCode = htmlMatch[1].trim();
  if (htmlCode.length < 50 || !htmlCode.includes('<')) return;
  currentWebCode = htmlCode;

  const previewCard = document.createElement('div');
  previewCard.className = 'mt-4';
  previewCard.innerHTML = `
    <div class="web-preview-card" onclick="openWebPreview()">
      <div class="web-preview-card-header">
        <div class="browser-dots">
          <span style="background:#ef4444cc"></span><span style="background:#f59e0bcc"></span><span style="background:#22c55ecc"></span>
        </div>
        <div class="flex-1 px-2 py-0.5 rounded bg-manus-surface2 text-[10px] text-manus-text-dim">preview://generated-page</div>
      </div>
      <div class="web-preview-card-body" id="web-card-preview-${Date.now()}"></div>
      <div class="web-preview-card-footer">
        <span class="text-xs text-manus-text-dim"><i class="fas fa-globe text-blue-400 mr-1"></i>Live Preview</span>
        <span class="text-[10px] text-manus-text-dim">Click to open</span>
      </div>
    </div>`;

  const mdBody = container.querySelector('.markdown-body');
  if (mdBody) mdBody.after(previewCard);
  else container.appendChild(previewCard);

  // Render mini preview in card
  const previewContainer = previewCard.querySelector('.web-preview-card-body');
  if (previewContainer) {
    const iframe = document.createElement('iframe');
    iframe.sandbox = 'allow-scripts';
    iframe.srcdoc = htmlCode;
    previewContainer.appendChild(iframe);
  }
}

function openWebPreview() {
  if (!currentWebCode) return;
  document.getElementById('web-preview-modal').classList.remove('hidden');
  const frame = document.getElementById('web-preview-frame');
  if (frame) frame.srcdoc = currentWebCode;
  document.getElementById('web-preview-url').textContent = 'preview://generated-page';
  // Reset to desktop
  const container = document.getElementById('web-preview-container');
  if (container) container.classList.remove('mobile-view');
}

function closeWebPreview() {
  document.getElementById('web-preview-modal').classList.add('hidden');
}

function toggleWebPreviewDevice(device) {
  const container = document.getElementById('web-preview-container');
  if (!container) return;
  if (device === 'mobile') container.classList.add('mobile-view');
  else container.classList.remove('mobile-view');
}

function copyWebPreviewCode() {
  if (currentWebCode) {
    navigator.clipboard.writeText(currentWebCode).then(() => showToast('HTML code copied to clipboard!', 'success', 2000));
  }
}

// ============================================================
// SEND MESSAGE
// ============================================================
async function sendMessage() {
  const input = document.getElementById('message-input');
  const text = input.value.trim();
  if (!text || isStreaming) return;

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
  if (conv) { conv.messages = [...currentMessages]; conv.updatedAt = new Date().toISOString(); saveConversations(); }

  // Agent mode: decompose task into steps
  let taskSteps = null;
  if (agentModeEnabled) {
    taskSteps = decomposeTask(text);
    // Track in agentTasks
    const task = {
      id: Date.now().toString(),
      title: text.substring(0, 60),
      status: 'executing',
      steps: taskSteps,
      createdAt: new Date().toISOString()
    };
    agentTasks.unshift(task);
  }

  const thinkingEl = renderThinkingIndicator(taskSteps);

  // Step animation
  let stepIndex = 0;
  let stepInterval;
  if (agentModeEnabled && taskSteps) {
    stepInterval = setInterval(() => {
      stepIndex++;
      if (stepIndex < taskSteps.length) advanceAgentStep(taskSteps[stepIndex].id);
      else clearInterval(stepInterval);
    }, 1200);
  } else {
    const defaultSteps = ['Understanding task context...', 'Planning execution steps...', 'Generating response...'];
    stepInterval = setInterval(() => {
      if (stepIndex < defaultSteps.length) { addExecutionStep(defaultSteps[stepIndex]); stepIndex++; }
    }, 800);
  }

  try {
    const response = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: currentMessages.map(m => ({ role: m.role, content: m.content })), model: selectedModel, credits })
    });

    clearInterval(stepInterval);

    if (!response.ok) {
      let errorData = {};
      try { errorData = await response.json(); } catch {}
      if (response.status === 402 || errorData.code === 'CREDITS_EXHAUSTED') { removeThinkingIndicator(); renderErrorMessage('credits_exhausted'); isStreaming = false; return; }
      if (response.status === 429) { removeThinkingIndicator(); renderErrorMessage('rate_limited'); isStreaming = false; return; }
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const modelUsed = response.headers.get('X-Model-Used') || selectedModel;
    const wasFallback = response.headers.get('X-Fallback') === 'true';

    if (wasFallback) {
      consecutiveAPIFailures++;
      const badge = document.getElementById('fallback-badge');
      if (badge) { badge.classList.remove('hidden'); badge.classList.add('flex'); }
      if (modelUsed === 'local-fallback') {
        document.getElementById('fallback-badge-text').textContent = 'Local AI';
        setThinkingIndicatorState('fallback', 'Primary AI unavailable. Continuing with local intelligence...');
        showToast('Primary AI unavailable. Continuing with local intelligence.', 'warning');
        if (consecutiveAPIFailures >= MAX_API_FAILURES_BEFORE_WARNING) document.getElementById('api-error-overlay').classList.remove('hidden');
      } else {
        document.getElementById('fallback-badge-text').textContent = `Switched to ${modelUsed === 'gpt-5-nano' ? 'Lite' : modelUsed}`;
        showToast('Primary model unavailable. Switched to fallback.', 'warning');
      }
    } else {
      consecutiveAPIFailures = 0;
      const badge = document.getElementById('fallback-badge');
      if (badge) { badge.classList.add('hidden'); badge.classList.remove('flex'); }
    }

    if (agentModeEnabled && taskSteps) completeAllAgentSteps();
    else {
      addExecutionStep('Drafting final response...', 'completed');
      setThinkingIndicatorState('responding', 'Drafting final response...');
    }

    await sleep(320);
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
    finalizeThinkingIndicator();
    currentMessages.push({ role: 'assistant', content: fullContent });
    if (conv) { conv.messages = [...currentMessages]; conv.updatedAt = new Date().toISOString(); saveConversations(); }
    deductCredits(modelUsed === 'local-fallback' ? 'gpt-5-nano' : modelUsed, text);

    // Agent mode: update task status and notify
    if (agentModeEnabled && agentTasks.length > 0) {
      agentTasks[0].status = 'success';
      addNotification('Task Completed', `"${text.substring(0, 40)}..." finished successfully.`, 'success');
    }

  } catch (error) {
    clearInterval(stepInterval);
    removeThinkingIndicator();
    consecutiveAPIFailures++;
    renderErrorMessage('generic', error.message);
    if (agentModeEnabled && agentTasks.length > 0) {
      agentTasks[0].status = 'failed';
      addNotification('Task Failed', `"${text.substring(0, 40)}..." encountered an error.`, 'error');
    }
    if (consecutiveAPIFailures >= MAX_API_FAILURES_BEFORE_WARNING) document.getElementById('api-error-overlay').classList.remove('hidden');
  }

  isStreaming = false;
  document.getElementById('send-btn').disabled = input.value.trim().length === 0;
}

// ============================================================
// ERROR UI
// ============================================================
function renderErrorMessage(type, details = '') {
  const area = document.getElementById('messages-area');
  if (!area) return;
  const div = document.createElement('div');
  div.className = 'mb-6 message-bubble';
  const errors = {
    credits_exhausted: { icon: 'fa-coins', bgColor: 'bg-amber-500/5', borderColor: 'border-amber-500/20', titleColor: 'text-amber-300', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-400', title: 'Credits Exhausted', message: 'You\'ve used all credits. Upgrade to continue.', action: `<div class="flex gap-2 mt-3"><button onclick="openSettings(); showSettingsTab('billing')" class="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm font-medium transition-colors border border-amber-500/20"><i class="fas fa-arrow-up-right mr-1.5"></i>Upgrade Plan</button></div>` },
    rate_limited: { icon: 'fa-clock', bgColor: 'bg-blue-500/5', borderColor: 'border-blue-500/20', titleColor: 'text-blue-300', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400', title: 'Rate Limited', message: 'Too many requests. Wait a moment.', action: `<button onclick="retryLastMessage()" class="mt-3 px-4 py-2 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-300 text-sm hover:bg-blue-500/20 transition-colors"><i class="fas fa-rotate-right mr-1.5"></i>Retry</button>` },
    generic: { icon: 'fa-circle-exclamation', bgColor: 'bg-red-500/5', borderColor: 'border-red-500/20', titleColor: 'text-red-300', iconBg: 'bg-red-500/10', iconColor: 'text-red-400', title: 'Something went wrong', message: details || 'An error occurred.', action: `<button onclick="retryLastMessage()" class="mt-3 px-4 py-2 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm hover:bg-red-500/20 transition-colors"><i class="fas fa-rotate-right mr-1.5"></i>Retry</button>` }
  };
  const err = errors[type] || errors.generic;
  div.innerHTML = `<div class="flex gap-3"><div class="flex-shrink-0 w-8 h-8 rounded-lg ${err.iconBg} flex items-center justify-center mt-1"><i class="fas ${err.icon} ${err.iconColor} text-sm"></i></div><div class="flex-1"><div class="text-xs text-manus-text-dim mb-1.5 font-medium">System</div><div class="p-4 ${err.bgColor} border ${err.borderColor} rounded-xl"><div class="font-medium text-sm ${err.titleColor} mb-1">${err.title}</div><div class="text-sm text-manus-text-muted">${err.message}</div>${err.action}</div></div></div>`;
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
// MODEL SELECTOR & SETTINGS
// ============================================================
function toggleModelDropdown() { document.getElementById('model-dropdown').classList.toggle('hidden'); }
function selectModel(id, name, icon) {
  selectedModel = id;
  document.getElementById('selected-model-name').textContent = name;
  document.getElementById('selected-model-icon').textContent = icon;
  document.getElementById('model-dropdown').classList.add('hidden');
  showToast(`Model: ${name} (${MODEL_COSTS[id]} credits/msg)`, 'info', 2000);
}

function openSettings() {
  document.getElementById('settings-modal').classList.remove('hidden');
  updateAllCreditDisplays();
  renderUsageHistory();
  renderTasksList();
  updateAccountInfo();
  updateStorageInfo();
  checkPaymentAvailability();
}
function closeSettings() { document.getElementById('settings-modal').classList.add('hidden'); }
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
  if (usageHistory.length === 0) { container.innerHTML = '<div class="py-4 text-center text-manus-text-dim text-xs">No usage history yet</div>'; return; }
  container.innerHTML = usageHistory.slice(0, 50).map(item => {
    const isPositive = String(item.change).startsWith('+');
    const typeIcon = item.type === 'purchase' ? '<i class="fas fa-credit-card text-green-400 mr-1"></i>' :
                     item.type === 'bonus' ? '<i class="fas fa-gift text-purple-400 mr-1"></i>' :
                     '<i class="fas fa-message text-manus-text-dim mr-1"></i>';
    return `<div class="grid grid-cols-3 py-3 text-sm"><span class="truncate pr-4">${typeIcon}${escapeHtml(item.detail)}</span><span class="text-manus-text-muted">${item.date}</span><span class="text-right font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}">${item.change}</span></div>`;
  }).join('');
}

function renderTasksList() {
  const container = document.getElementById('tasks-list');
  if (!container) return;
  if (agentTasks.length === 0) {
    container.innerHTML = '<div class="px-4 py-8 text-center text-manus-text-dim text-xs"><i class="fas fa-list-check text-2xl mb-2 block opacity-30"></i>No tasks yet. Enable Agent Mode and send a request to start.</div>';
    return;
  }
  container.innerHTML = agentTasks.slice(0, 20).map(task => {
    const statusColors = { pending: 'bg-gray-500/10 text-gray-400 border-gray-500/20', executing: 'bg-manus-accent/10 text-manus-accent border-manus-accent/20', success: 'bg-green-500/10 text-green-400 border-green-500/20', failed: 'bg-red-500/10 text-red-400 border-red-500/20' };
    const statusIcons = { pending: 'fa-clock', executing: 'fa-spinner fa-spin', success: 'fa-check-circle', failed: 'fa-times-circle' };
    const sc = statusColors[task.status] || statusColors.pending;
    const si = statusIcons[task.status] || statusIcons.pending;
    return `<div class="task-log-card p-4 bg-manus-surface2 rounded-xl border border-manus-border">
      <div class="flex items-start justify-between gap-3 mb-2">
        <div class="text-sm font-medium flex-1">${escapeHtml(task.title)}</div>
        <span class="task-status ${task.status} flex-shrink-0"><i class="fas ${si} text-[9px] mr-1"></i>${task.status.charAt(0).toUpperCase() + task.status.slice(1)}</span>
      </div>
      <div class="text-[11px] text-manus-text-dim">${new Date(task.createdAt).toLocaleString()}</div>
      ${task.steps ? `<div class="mt-2 space-y-1">${task.steps.map(s => `<div class="flex items-center gap-2 text-[11px]"><i class="fas ${task.status === 'success' ? 'fa-check text-green-400' : task.status === 'failed' ? 'fa-times text-red-400' : 'fa-circle text-manus-text-dim'} text-[7px]"></i><span class="text-manus-text-muted">${escapeHtml(s.text)}</span></div>`).join('')}</div>` : ''}
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
  if (e.key === 'Escape') {
    closeSettings();
    closeSlidePreview();
    closeWebPreview();
  }
  // Slide navigation
  if (document.getElementById('slide-preview-modal') && !document.getElementById('slide-preview-modal').classList.contains('hidden')) {
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === 'ArrowRight') nextSlide();
  }
});
