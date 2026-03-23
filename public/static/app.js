// ============================================================
// Manus AI Clone - Main Application
// ============================================================

// --- State ---
let conversations = JSON.parse(localStorage.getItem('manus_conversations') || '[]');
let currentConversationId = null;
let currentMessages = [];
let isStreaming = false;
let selectedModel = 'gpt-5-mini';
let credits = parseInt(localStorage.getItem('manus_credits') || '1000');
let usageHistory = JSON.parse(localStorage.getItem('manus_usage') || '[]');

// Initialize usage if first time
if (usageHistory.length === 0) {
  usageHistory.push({
    detail: 'Bonus for early adopters',
    date: new Date().toISOString().split('T')[0],
    change: '+1000'
  });
  localStorage.setItem('manus_usage', JSON.stringify(usageHistory));
}

// Configure marked
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true
});

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  renderConversationList();
  updateCreditDisplay();
  setupInputListener();
  
  // Close dropdowns on outside click
  document.addEventListener('click', (e) => {
    const modelSelector = document.getElementById('model-selector');
    if (!modelSelector.contains(e.target)) {
      document.getElementById('model-dropdown').classList.add('hidden');
    }
  });
});

function setupInputListener() {
  const input = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  input.addEventListener('input', () => {
    sendBtn.disabled = input.value.trim().length === 0 || isStreaming;
  });
}

// --- Sidebar ---
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebar.classList.toggle('sidebar-collapsed');
  }
}

// --- Conversations ---
function newChat() {
  currentConversationId = null;
  currentMessages = [];
  document.getElementById('landing-page').classList.remove('hidden');
  document.getElementById('messages-area').classList.add('hidden');
  document.getElementById('messages-area').innerHTML = '';
  document.getElementById('chat-title').textContent = 'New conversation';
  document.getElementById('message-input').value = '';
  document.getElementById('send-btn').disabled = true;
  updateActiveConversation();
  
  // Close mobile sidebar
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
  
  // Render existing messages
  currentMessages.forEach(msg => {
    renderMessage(msg.role, msg.content, false);
  });

  updateActiveConversation();
  scrollToBottom();
  
  // Close mobile sidebar
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('mobile-open');
  }
}

function deleteConversation(id, e) {
  e.stopPropagation();
  conversations = conversations.filter(c => c.id !== id);
  saveConversations();
  renderConversationList();
  if (currentConversationId === id) {
    newChat();
  }
}

function clearAllConversations() {
  if (confirm('Are you sure you want to delete all conversations?')) {
    conversations = [];
    saveConversations();
    renderConversationList();
    newChat();
  }
}

function saveConversations() {
  localStorage.setItem('manus_conversations', JSON.stringify(conversations));
}

function updateActiveConversation() {
  document.querySelectorAll('.conv-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === currentConversationId);
  });
}

function renderConversationList() {
  const container = document.getElementById('conversations-list');
  
  if (conversations.length === 0) {
    container.innerHTML = `
      <div class="px-4 py-8 text-center text-manus-text-dim text-xs">
        <i class="fas fa-message-lines text-2xl mb-2 block opacity-30"></i>
        No conversations yet
      </div>`;
    return;
  }

  // Group by date
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
    groups.today.forEach(c => { html += convItemHTML(c); });
  }
  if (groups.yesterday.length) {
    html += `<div class="px-3 py-2 mt-2 text-xs font-medium text-manus-text-dim uppercase tracking-wider">Yesterday</div>`;
    groups.yesterday.forEach(c => { html += convItemHTML(c); });
  }
  if (groups.older.length) {
    html += `<div class="px-3 py-2 mt-2 text-xs font-medium text-manus-text-dim uppercase tracking-wider">Previous</div>`;
    groups.older.forEach(c => { html += convItemHTML(c); });
  }

  container.innerHTML = html;
  updateActiveConversation();
}

function convItemHTML(conv) {
  return `
    <div class="conv-item flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer group border border-transparent" 
         data-id="${conv.id}" onclick="loadConversation('${conv.id}')">
      <i class="fas fa-message text-xs text-manus-text-dim"></i>
      <span class="flex-1 text-sm truncate">${escapeHtml(conv.title)}</span>
      <button onclick="deleteConversation('${conv.id}', event)" 
              class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-manus-surface3 text-manus-text-dim transition-all">
        <i class="fas fa-trash text-[10px]"></i>
      </button>
    </div>`;
}

// --- Messages ---
function renderMessage(role, content, animate = true) {
  const area = document.getElementById('messages-area');
  const div = document.createElement('div');
  div.className = `mb-6 ${animate ? 'message-bubble' : ''}`;

  if (role === 'user') {
    div.innerHTML = `
      <div class="flex justify-end">
        <div class="max-w-[80%] bg-manus-surface2 border border-manus-border rounded-2xl rounded-tr-md px-4 py-3">
          <div class="text-sm whitespace-pre-wrap">${escapeHtml(content)}</div>
        </div>
      </div>`;
  } else {
    div.innerHTML = `
      <div class="flex gap-3">
        <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-manus-accent to-purple-600 flex items-center justify-center mt-1">
          <i class="fas fa-robot text-white text-xs"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-xs text-manus-text-dim mb-1.5 font-medium">Manus</div>
          <div class="markdown-body text-sm">${renderMarkdown(content)}</div>
        </div>
      </div>`;
  }
  
  area.appendChild(div);
  
  // Highlight code blocks
  div.querySelectorAll('pre code').forEach(block => {
    hljs.highlightElement(block);
  });
  
  // Add copy buttons to code blocks
  div.querySelectorAll('pre').forEach(pre => {
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
  const div = document.createElement('div');
  div.id = 'thinking-indicator';
  div.className = 'mb-6 message-bubble';
  div.innerHTML = `
    <div class="flex gap-3">
      <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-manus-accent to-purple-600 flex items-center justify-center mt-1">
        <i class="fas fa-robot text-white text-xs"></i>
      </div>
      <div class="flex-1">
        <div class="text-xs text-manus-text-dim mb-1.5 font-medium">Manus</div>
        <div class="execution-panel">
          <div class="execution-header">
            <div class="agent-spinner w-4 h-4 border-2 border-manus-accent/30 border-t-manus-accent rounded-full"></div>
            <span class="text-xs font-medium text-manus-text-muted">Working on your task...</span>
          </div>
          <div class="execution-steps" id="execution-steps">
            <div class="step-item agent-step">
              <div class="step-icon active"><i class="fas fa-circle text-[6px]"></i></div>
              <span class="text-manus-text-muted">Analyzing your request...</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  area.appendChild(div);
  scrollToBottom();
  return div;
}

function addExecutionStep(text, status = 'active') {
  const steps = document.getElementById('execution-steps');
  if (!steps) return;
  
  // Mark previous active steps as completed
  steps.querySelectorAll('.step-icon.active').forEach(icon => {
    icon.className = 'step-icon completed';
    icon.innerHTML = '<i class="fas fa-check text-[8px]"></i>';
  });
  
  const step = document.createElement('div');
  step.className = 'step-item agent-step';
  
  const iconClass = status === 'completed' ? 'completed' : 'active';
  const iconContent = status === 'completed' 
    ? '<i class="fas fa-check text-[8px]"></i>' 
    : '<i class="fas fa-circle text-[6px]"></i>';
  
  step.innerHTML = `
    <div class="step-icon ${iconClass}">${iconContent}</div>
    <span class="text-manus-text-muted">${text}</span>`;
  
  steps.appendChild(step);
  steps.scrollTop = steps.scrollHeight;
}

function removeThinkingIndicator() {
  const el = document.getElementById('thinking-indicator');
  if (el) el.remove();
}

function renderStreamingMessage() {
  const area = document.getElementById('messages-area');
  const div = document.createElement('div');
  div.id = 'streaming-message';
  div.className = 'mb-6 message-bubble';
  div.innerHTML = `
    <div class="flex gap-3">
      <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-manus-accent to-purple-600 flex items-center justify-center mt-1">
        <i class="fas fa-robot text-white text-xs"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-xs text-manus-text-dim mb-1.5 font-medium">Manus</div>
        <div class="markdown-body text-sm" id="streaming-content"><span class="typing-cursor"></span></div>
      </div>
    </div>`;
  area.appendChild(div);
  scrollToBottom();
  return div;
}

function updateStreamingContent(text) {
  const el = document.getElementById('streaming-content');
  if (!el) return;
  el.innerHTML = renderMarkdown(text) + '<span class="typing-cursor"></span>';
  
  // Highlight code
  el.querySelectorAll('pre code').forEach(block => {
    hljs.highlightElement(block);
  });
  
  scrollToBottom();
}

function finalizeStreamingMessage(text) {
  const el = document.getElementById('streaming-content');
  if (!el) return;
  el.innerHTML = renderMarkdown(text);
  
  // Highlight and add copy buttons
  const parent = el.closest('#streaming-message');
  if (parent) {
    parent.id = '';
    parent.querySelectorAll('pre code').forEach(block => {
      hljs.highlightElement(block);
    });
    parent.querySelectorAll('pre').forEach(pre => {
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
}

// --- Send Message ---
async function sendMessage() {
  const input = document.getElementById('message-input');
  const text = input.value.trim();
  if (!text || isStreaming) return;

  isStreaming = true;
  input.value = '';
  input.style.height = 'auto';
  document.getElementById('send-btn').disabled = true;

  // Create conversation if needed
  if (!currentConversationId) {
    currentConversationId = createConversation(text);
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('messages-area').classList.remove('hidden');
    document.getElementById('chat-title').textContent = text.substring(0, 60);
  }

  // Add user message
  currentMessages.push({ role: 'user', content: text });
  renderMessage('user', text);
  scrollToBottom();

  // Save messages
  const conv = conversations.find(c => c.id === currentConversationId);
  if (conv) {
    conv.messages = [...currentMessages];
    conv.updatedAt = new Date().toISOString();
    saveConversations();
  }

  // Show thinking animation
  const thinkingEl = renderThinkingIndicator();
  
  // Simulated execution steps
  const steps = [
    'Understanding task context...',
    'Planning execution steps...',
    'Generating response...'
  ];
  
  let stepIndex = 0;
  const stepInterval = setInterval(() => {
    if (stepIndex < steps.length) {
      addExecutionStep(steps[stepIndex]);
      stepIndex++;
    }
  }, 800);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: currentMessages.map(m => ({ role: m.role, content: m.content })),
        model: selectedModel
      })
    });

    clearInterval(stepInterval);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    // Complete thinking steps
    addExecutionStep('Task completed', 'completed');
    
    // Wait a moment then remove thinking and start streaming
    await sleep(500);
    removeThinkingIndicator();
    
    // Start streaming content
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

    // Finalize
    finalizeStreamingMessage(fullContent);
    
    // Save assistant message
    currentMessages.push({ role: 'assistant', content: fullContent });
    if (conv) {
      conv.messages = [...currentMessages];
      conv.updatedAt = new Date().toISOString();
      saveConversations();
    }

    // Deduct credits
    const creditCost = Math.floor(Math.random() * 50) + 10;
    credits = Math.max(0, credits - creditCost);
    localStorage.setItem('manus_credits', credits.toString());
    usageHistory.unshift({
      detail: text.substring(0, 50),
      date: new Date().toISOString().split('T')[0],
      change: `-${creditCost}`
    });
    localStorage.setItem('manus_usage', JSON.stringify(usageHistory));
    updateCreditDisplay();

  } catch (error) {
    clearInterval(stepInterval);
    removeThinkingIndicator();
    renderMessage('assistant', `I encountered an error while processing your request. Please try again.\n\n\`Error: ${error.message}\``);
  }

  isStreaming = false;
  document.getElementById('send-btn').disabled = input.value.trim().length === 0;
}

function quickAction(text) {
  document.getElementById('message-input').value = text;
  document.getElementById('send-btn').disabled = false;
  sendMessage();
}

// --- Model Selector ---
function toggleModelDropdown() {
  document.getElementById('model-dropdown').classList.toggle('hidden');
}

function selectModel(id, name, icon) {
  selectedModel = id;
  document.getElementById('selected-model-name').textContent = name;
  document.getElementById('selected-model-icon').textContent = icon;
  document.getElementById('model-dropdown').classList.add('hidden');
}

// --- Settings ---
function openSettings() {
  document.getElementById('settings-modal').classList.remove('hidden');
  updateCreditDisplay();
  renderUsageHistory();
}

function closeSettings() {
  document.getElementById('settings-modal').classList.add('hidden');
}

function showSettingsTab(tab) {
  document.querySelectorAll('.settings-tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.settings-tab-btn').forEach(el => el.classList.remove('active'));
  
  document.getElementById(`settings-${tab}`).classList.remove('hidden');
  document.querySelector(`.settings-tab-btn[data-tab="${tab}"]`).classList.add('active');
}

function updateCreditDisplay() {
  const el = document.getElementById('credit-balance');
  if (el) el.textContent = credits.toString();
}

function renderUsageHistory() {
  const container = document.getElementById('usage-history');
  if (!container) return;
  
  container.innerHTML = usageHistory.map(item => `
    <div class="grid grid-cols-3 py-3 text-sm">
      <span class="truncate pr-4">${escapeHtml(item.detail)}</span>
      <span class="text-manus-text-muted">${item.date}</span>
      <span class="text-right ${item.change.startsWith('+') ? 'text-green-400' : 'text-manus-text-muted'}">${item.change}</span>
    </div>
  `).join('');
}

// --- File Upload ---
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const input = document.getElementById('message-input');
  input.value += `\n[Attached: ${file.name}]`;
  input.dispatchEvent(new Event('input'));
}

// --- Utility ---
function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

function scrollToBottom() {
  const container = document.getElementById('chat-container');
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderMarkdown(text) {
  try {
    return marked.parse(text);
  } catch (e) {
    return escapeHtml(text);
  }
}

function copyCode(btn) {
  const pre = btn.closest('pre');
  const code = pre.querySelector('code');
  navigator.clipboard.writeText(code.textContent).then(() => {
    btn.innerHTML = '<i class="fas fa-check mr-1"></i>Copied!';
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-copy mr-1"></i>Copy';
    }, 2000);
  });
}

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + K for new chat
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    newChat();
  }
  // Escape to close settings
  if (e.key === 'Escape') {
    closeSettings();
  }
});
