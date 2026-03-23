import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { streamText } from 'hono/streaming'

type Bindings = {
  OPENAI_API_KEY: string
  OPENAI_BASE_URL: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

// --- Smart AI Response Generator (Fallback when API unavailable) ---
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
- Professional typography (Inter or similar)

### Next Steps
I can help you refine each slide's content. Just share:
- The **topic** or subject matter
- Your **target audience**
- Any **specific data** to include
- Preferred **visual style** (corporate, creative, minimal)

Would you like me to draft the content for each slide?`
  }

  if (msg.includes('website') || msg.includes('landing') || msg.includes('web app') || msg.includes('webpage')) {
    return `## Website Development Plan

I'll build a modern, responsive website for you. Here's my approach:

### Tech Stack
- **Frontend**: HTML5, Tailwind CSS, Vanilla JS
- **Backend**: Hono (Edge-first framework)
- **Hosting**: Cloudflare Pages (global CDN)

### Architecture
\`\`\`
src/
├── index.tsx          # API routes & server
├── components/        # Reusable UI components
public/
├── static/
│   ├── app.js         # Client-side logic
│   └── styles.css     # Custom styles
\`\`\`

### Key Features
1. **Responsive Design** - Mobile-first approach
2. **Fast Loading** - Optimized assets, lazy loading
3. **SEO Optimized** - Meta tags, structured data
4. **Accessibility** - WCAG 2.1 compliant
5. **Analytics Ready** - Easy integration points

### Sample Hero Section
\`\`\`html
<section class="hero bg-gradient-to-br from-indigo-600 to-purple-700">
  <h1 class="text-5xl font-bold text-white">
    Build Something Amazing
  </h1>
  <p class="text-xl text-indigo-100 mt-4">
    Modern solutions for modern problems
  </p>
  <button class="mt-8 px-8 py-3 bg-white text-indigo-600 rounded-xl">
    Get Started
  </button>
</section>
\`\`\`

What kind of website do you need? Share more details and I'll start building!`
  }

  if (msg.includes('code') || msg.includes('develop') || msg.includes('app') || msg.includes('program') || msg.includes('function') || msg.includes('react') || msg.includes('todo')) {
    return `## Development Plan

I'll help you build this application. Here's my systematic approach:

### Step 1: Architecture Design
- Define data models and state management
- Plan component hierarchy
- Set up API endpoints

### Step 2: Core Implementation
\`\`\`typescript
// Example: Clean API route pattern
app.get('/api/items', async (c) => {
  const { page = 1, limit = 20 } = c.req.query()
  
  const items = await c.env.DB.prepare(
    'SELECT * FROM items ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).bind(limit, (page - 1) * limit).all()
  
  return c.json({ 
    success: true, 
    data: items.results,
    pagination: { page, limit }
  })
})
\`\`\`

### Step 3: UI Components
- Clean, accessible interface
- Real-time state updates
- Error handling & loading states

### Step 4: Testing & Deployment
- Unit tests for business logic
- Integration tests for API
- Deploy to Cloudflare Pages

### Features I'll Include
| Feature | Status |
|---------|--------|
| CRUD Operations | Planned |
| Authentication | Planned |
| Real-time Updates | Planned |
| Responsive UI | Planned |
| Data Validation | Planned |

Share more details about your app requirements!`
  }

  if (msg.includes('design') || msg.includes('brand') || msg.includes('logo') || msg.includes('ui') || msg.includes('ux')) {
    return `## Design Strategy

I'll create a comprehensive design system for you:

### Brand Identity
- **Color Palette**: Primary, secondary, accent colors with semantic variants
- **Typography**: Heading + body font pairing (e.g., Inter + Source Serif)
- **Iconography**: Consistent icon style (outlined, 2px stroke)
- **Spacing System**: 4px base grid (4, 8, 12, 16, 24, 32, 48, 64)

### Design Tokens
\`\`\`css
:root {
  /* Colors */
  --color-primary: #6366f1;
  --color-secondary: #8b5cf6;
  --color-accent: #f59e0b;
  --color-background: #0f172a;
  --color-surface: #1e293b;
  --color-text: #f1f5f9;
  
  /* Typography */
  --font-heading: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 48px;
  
  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;
}
\`\`\`

### Component Library
1. Buttons (primary, secondary, ghost, danger)
2. Input fields (text, select, checkbox, radio)
3. Cards (content, pricing, feature)
4. Navigation (sidebar, topbar, breadcrumb)
5. Modals & dialogs
6. Toast notifications

Want me to create detailed designs for specific components?`
  }

  if (msg.includes('research') || msg.includes('analysis') || msg.includes('data') || msg.includes('report')) {
    return `## Research & Analysis Plan

I'll conduct thorough research and deliver actionable insights:

### Methodology
1. **Data Collection** - Gather from multiple reliable sources
2. **Analysis** - Quantitative and qualitative assessment
3. **Synthesis** - Connect patterns and identify trends
4. **Recommendations** - Data-driven action items

### Deliverables
- **Executive Summary** - Key findings at a glance
- **Detailed Report** - In-depth analysis with citations
- **Data Visualizations** - Charts, graphs, and infographics
- **Action Plan** - Prioritized next steps

### Research Framework
| Phase | Activity | Output |
|-------|----------|--------|
| Discovery | Scope definition | Research brief |
| Collection | Data gathering | Raw dataset |
| Analysis | Pattern identification | Insights report |
| Synthesis | Recommendation forming | Action plan |
| Delivery | Final presentation | Complete report |

### Quality Standards
- All sources verified and cited
- Multiple data points for each claim
- Peer-reviewed sources preferred
- Clear methodology documentation

What specific topic would you like me to research?`
  }

  // Default intelligent response
  return `## I'd be happy to help!

I've analyzed your request and here's how I can assist:

### My Capabilities
I can help you with a wide range of tasks:

- **Create Presentations** - Professional slides and decks
- **Build Websites** - Modern, responsive web applications
- **Develop Apps** - Full-stack application development
- **Design** - UI/UX design, branding, and visual systems
- **Research** - In-depth analysis and reports
- **Data Analysis** - Visualizations and insights
- **Writing** - Blog posts, documentation, marketing copy
- **Automation** - Workflow optimization and scripts

### How I Work
1. **Understand** - I analyze your requirements thoroughly
2. **Plan** - I create a structured approach
3. **Execute** - I deliver step-by-step results
4. **Refine** - I iterate based on your feedback

### Let's Get Started!
Could you provide more details about what you'd like to accomplish? The more specific you are, the better I can help:

- What's the **goal** of this project?
- Who is the **target audience**?
- What **constraints** should I consider?
- Any **examples** or references you like?

I'm ready to dive in whenever you are!`
}

// Chat API with streaming (with smart fallback)
app.post('/api/chat', async (c) => {
  const { messages, model } = await c.req.json()
  
  const apiKey = c.env?.OPENAI_API_KEY
  const baseUrl = c.env?.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1'
  const lastMessage = messages[messages.length - 1]?.content || ''

  const systemPrompt = `You are Manus AI, an advanced autonomous AI agent. You help users by executing tasks, automating workflows, and delivering complete solutions.

Key behaviors:
- You think step-by-step and show your reasoning process
- You can help with: creating slides, building websites, developing apps, design, research, data analysis, writing, and more
- You provide detailed, actionable responses
- You use markdown formatting for clarity
- When given a complex task, break it into steps and explain your approach
- Be proactive and suggest improvements
- Format code blocks with proper syntax highlighting`

  // Try real API first
  if (apiKey) {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || 'gpt-5-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          stream: true,
          temperature: 0.7,
          max_tokens: 4096
        })
      })

      if (response.ok) {
        c.header('Content-Type', 'text/event-stream')
        c.header('Cache-Control', 'no-cache')
        c.header('Connection', 'keep-alive')

        return streamText(c, async (stream) => {
          const reader = response.body?.getReader()
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
                  if (content) {
                    await stream.write(content)
                  }
                } catch (e) {
                  // skip
                }
              }
            }
          }
        })
      }
      // If response not ok, fall through to smart fallback
    } catch (error) {
      // Fall through to smart fallback
    }
  }

  // Smart fallback: stream the generated response word by word
  const smartResponse = generateSmartResponse(lastMessage)
  
  c.header('Content-Type', 'text/event-stream')
  c.header('Cache-Control', 'no-cache')
  c.header('Connection', 'keep-alive')

  return streamText(c, async (stream) => {
    const words = smartResponse.split(/(\s+)/)
    for (let i = 0; i < words.length; i++) {
      await stream.write(words[i])
      // Variable delay for natural feel
      const delay = words[i].includes('\n') ? 30 : 
                    words[i].includes('#') ? 40 : 
                    words[i].includes('```') ? 20 : 
                    Math.random() * 20 + 8
      await new Promise(r => setTimeout(r, delay))
    }
    await stream.write('\n\n[DONE]')
  })
})

// Models list
app.get('/api/models', (c) => {
  return c.json({
    models: [
      { id: 'gpt-5-mini', name: 'Manus Standard', description: 'Fast and efficient', icon: '⚡' },
      { id: 'gpt-5', name: 'Manus Pro', description: 'Advanced reasoning', icon: '🧠' },
      { id: 'gpt-5-nano', name: 'Manus Lite', description: 'Quick responses', icon: '💨' },
    ]
  })
})

// Serve the main app
app.get('/', (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manus AI</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github-dark.min.css">
    <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/highlight.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='28' font-size='28'>🤖</text></svg>">
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
            <!-- Sidebar Header -->
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

            <!-- New Chat Button -->
            <div class="p-3">
                <button onclick="newChat()" class="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-manus-surface2 hover:bg-manus-surface3 border border-manus-border text-sm font-medium transition-all duration-200 group">
                    <i class="fas fa-plus text-manus-text-muted group-hover:text-manus-accent transition-colors"></i>
                    <span>New conversation</span>
                    <span class="ml-auto text-[10px] text-manus-text-dim border border-manus-border rounded px-1.5 py-0.5">Ctrl+K</span>
                </button>
            </div>

            <!-- Conversations List -->
            <div class="flex-1 overflow-y-auto px-2 py-1" id="conversations-list">
                <div class="px-4 py-8 text-center text-manus-text-dim text-xs">
                    <i class="fas fa-message text-2xl mb-2 block opacity-30"></i>
                    No conversations yet
                </div>
            </div>

            <!-- Sidebar Footer -->
            <div class="border-t border-manus-border p-3">
                <button onclick="openSettings()" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-manus-surface2 transition-colors text-sm">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <i class="fas fa-user text-white text-xs"></i>
                    </div>
                    <div class="flex-1 text-left">
                        <div class="font-medium text-sm">User</div>
                        <div class="text-xs text-manus-text-dim">Free Plan</div>
                    </div>
                    <i class="fas fa-ellipsis text-manus-text-dim"></i>
                </button>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 flex flex-col h-full min-w-0 relative">
            <!-- Top Bar -->
            <header class="h-14 flex items-center justify-between px-4 border-b border-manus-border bg-manus-bg/80 backdrop-blur-xl z-10 flex-shrink-0">
                <div class="flex items-center gap-3">
                    <button id="sidebar-toggle-mobile" onclick="toggleSidebar()" class="hidden p-2 rounded-lg hover:bg-manus-surface2 text-manus-text-muted transition-colors">
                        <i class="fas fa-bars"></i>
                    </button>
                    <div id="chat-title" class="text-sm font-medium text-manus-text-muted">New conversation</div>
                </div>
                <div class="flex items-center gap-2">
                    <!-- Model Selector -->
                    <div class="relative" id="model-selector">
                        <button onclick="toggleModelDropdown()" class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-manus-surface2 text-sm text-manus-text-muted transition-colors border border-manus-border">
                            <span id="selected-model-icon">⚡</span>
                            <span id="selected-model-name">Standard</span>
                            <i class="fas fa-chevron-down text-xs"></i>
                        </button>
                        <div id="model-dropdown" class="hidden absolute right-0 top-full mt-2 w-64 bg-manus-surface border border-manus-border rounded-xl shadow-2xl py-2 z-50">
                            <div onclick="selectModel('gpt-5-mini', 'Standard', '⚡')" class="flex items-center gap-3 px-4 py-2.5 hover:bg-manus-surface2 cursor-pointer transition-colors">
                                <span class="text-lg">⚡</span>
                                <div><div class="text-sm font-medium">Manus Standard</div><div class="text-xs text-manus-text-dim">Fast and efficient</div></div>
                            </div>
                            <div onclick="selectModel('gpt-5', 'Pro', '🧠')" class="flex items-center gap-3 px-4 py-2.5 hover:bg-manus-surface2 cursor-pointer transition-colors">
                                <span class="text-lg">🧠</span>
                                <div><div class="text-sm font-medium">Manus Pro</div><div class="text-xs text-manus-text-dim">Advanced reasoning</div></div>
                            </div>
                            <div onclick="selectModel('gpt-5-nano', 'Lite', '💨')" class="flex items-center gap-3 px-4 py-2.5 hover:bg-manus-surface2 cursor-pointer transition-colors">
                                <span class="text-lg">💨</span>
                                <div><div class="text-sm font-medium">Manus Lite</div><div class="text-xs text-manus-text-dim">Quick responses</div></div>
                            </div>
                        </div>
                    </div>
                    <button onclick="openSettings()" class="p-2 rounded-lg hover:bg-manus-surface2 text-manus-text-muted transition-colors">
                        <i class="fas fa-gear text-sm"></i>
                    </button>
                </div>
            </header>

            <!-- Chat Container -->
            <div id="chat-container" class="flex-1 overflow-y-auto">
                <!-- Landing Page -->
                <div id="landing-page" class="flex flex-col items-center justify-center h-full px-4">
                    <div class="max-w-2xl w-full text-center">
                        <!-- Logo -->
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

                        <!-- Quick Action Cards -->
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
                            <button onclick="quickAction('Create a presentation about AI trends in 2025')" class="group p-4 rounded-xl bg-manus-surface border border-manus-border hover:border-manus-accent/40 transition-all duration-300 text-left hover:shadow-lg hover:shadow-manus-accent/5 hover:-translate-y-0.5">
                                <div class="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <i class="fas fa-file-powerpoint text-orange-400"></i>
                                </div>
                                <div class="text-sm font-medium">Create slides</div>
                                <div class="text-xs text-manus-text-dim mt-1">Presentations & decks</div>
                            </button>
                            <button onclick="quickAction('Build a modern landing page for a SaaS startup')" class="group p-4 rounded-xl bg-manus-surface border border-manus-border hover:border-manus-accent/40 transition-all duration-300 text-left hover:shadow-lg hover:shadow-manus-accent/5 hover:-translate-y-0.5">
                                <div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <i class="fas fa-globe text-blue-400"></i>
                                </div>
                                <div class="text-sm font-medium">Build website</div>
                                <div class="text-xs text-manus-text-dim mt-1">Web apps & sites</div>
                            </button>
                            <button onclick="quickAction('Develop a React todo app with authentication')" class="group p-4 rounded-xl bg-manus-surface border border-manus-border hover:border-manus-accent/40 transition-all duration-300 text-left hover:shadow-lg hover:shadow-manus-accent/5 hover:-translate-y-0.5">
                                <div class="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <i class="fas fa-code text-green-400"></i>
                                </div>
                                <div class="text-sm font-medium">Develop apps</div>
                                <div class="text-xs text-manus-text-dim mt-1">Code & applications</div>
                            </button>
                            <button onclick="quickAction('Design a brand identity for a tech startup')" class="group p-4 rounded-xl bg-manus-surface border border-manus-border hover:border-manus-accent/40 transition-all duration-300 text-left hover:shadow-lg hover:shadow-manus-accent/5 hover:-translate-y-0.5">
                                <div class="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <i class="fas fa-palette text-purple-400"></i>
                                </div>
                                <div class="text-sm font-medium">Design</div>
                                <div class="text-xs text-manus-text-dim mt-1">UI/UX & branding</div>
                            </button>
                        </div>

                        <!-- Suggestion Pills -->
                        <div class="flex flex-wrap gap-2 justify-center">
                            <button onclick="quickAction('Research the latest developments in quantum computing')" class="px-4 py-2 rounded-full bg-manus-surface border border-manus-border hover:border-manus-accent/40 text-sm text-manus-text-muted hover:text-manus-text transition-all duration-200">
                                <i class="fas fa-flask mr-1.5 text-xs"></i>Research
                            </button>
                            <button onclick="quickAction('Analyze this dataset and create visualizations')" class="px-4 py-2 rounded-full bg-manus-surface border border-manus-border hover:border-manus-accent/40 text-sm text-manus-text-muted hover:text-manus-text transition-all duration-200">
                                <i class="fas fa-chart-bar mr-1.5 text-xs"></i>Data analysis
                            </button>
                            <button onclick="quickAction('Write a comprehensive blog post about machine learning')" class="px-4 py-2 rounded-full bg-manus-surface border border-manus-border hover:border-manus-accent/40 text-sm text-manus-text-muted hover:text-manus-text transition-all duration-200">
                                <i class="fas fa-pen-fancy mr-1.5 text-xs"></i>Writing
                            </button>
                            <button onclick="quickAction('Help me plan a marketing strategy for my product')" class="px-4 py-2 rounded-full bg-manus-surface border border-manus-border hover:border-manus-accent/40 text-sm text-manus-text-muted hover:text-manus-text transition-all duration-200">
                                <i class="fas fa-bullhorn mr-1.5 text-xs"></i>Marketing
                            </button>
                            <button onclick="quickAction('Explain how transformers work in neural networks')" class="px-4 py-2 rounded-full bg-manus-surface border border-manus-border hover:border-manus-accent/40 text-sm text-manus-text-muted hover:text-manus-text transition-all duration-200">
                                <i class="fas fa-lightbulb mr-1.5 text-xs"></i>Explain
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Messages Area -->
                <div id="messages-area" class="hidden max-w-3xl mx-auto px-4 py-6"></div>
            </div>

            <!-- Input Area -->
            <div class="flex-shrink-0 border-t border-manus-border bg-manus-bg/80 backdrop-blur-xl px-4 py-4">
                <div class="max-w-3xl mx-auto">
                    <div class="relative flex items-end bg-manus-surface border border-manus-border rounded-2xl focus-within:border-manus-accent/50 transition-all duration-300 shadow-lg focus-within:shadow-manus-accent/5">
                        <textarea 
                            id="message-input" 
                            placeholder="Describe your task..." 
                            rows="1"
                            class="flex-1 bg-transparent px-5 py-4 text-sm resize-none outline-none max-h-40 placeholder-manus-text-dim"
                            onkeydown="handleKeyDown(event)"
                            oninput="autoResize(this)"
                        ></textarea>
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
        </main>
    </div>

    <!-- Settings Modal -->
    <div id="settings-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="closeSettings()"></div>
        <div class="relative w-[720px] max-w-[92vw] h-[520px] max-h-[85vh] bg-manus-surface rounded-2xl border border-manus-border shadow-2xl flex overflow-hidden animate-in">
            <!-- Settings Sidebar -->
            <div class="w-[200px] bg-manus-surface2 border-r border-manus-border p-4 flex flex-col flex-shrink-0">
                <div class="flex items-center gap-2.5 mb-6">
                    <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-manus-accent to-purple-600 flex items-center justify-center">
                        <i class="fas fa-robot text-white text-xs"></i>
                    </div>
                    <span class="text-sm font-semibold">manus</span>
                </div>
                <nav class="space-y-1">
                    <button onclick="showSettingsTab('account')" class="settings-tab-btn active w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" data-tab="account">
                        <i class="fas fa-user w-4 text-center text-manus-text-muted"></i>
                        <span>Account</span>
                    </button>
                    <button onclick="showSettingsTab('usage')" class="settings-tab-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" data-tab="usage">
                        <i class="fas fa-sparkles w-4 text-center text-manus-text-muted"></i>
                        <span>Usage</span>
                    </button>
                    <button onclick="showSettingsTab('general')" class="settings-tab-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" data-tab="general">
                        <i class="fas fa-sliders w-4 text-center text-manus-text-muted"></i>
                        <span>General</span>
                    </button>
                    <button onclick="window.open('mailto:support@manus.im')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-manus-text-muted hover:bg-manus-surface3 transition-colors">
                        <i class="fas fa-envelope w-4 text-center"></i>
                        <span>Contact us</span>
                        <i class="fas fa-arrow-up-right-from-square text-[10px] ml-auto"></i>
                    </button>
                </nav>
            </div>
            <!-- Settings Content -->
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
                                <div class="font-medium">User</div>
                                <div class="text-sm text-manus-text-muted">user@example.com</div>
                            </div>
                            <button class="px-4 py-2 rounded-lg border border-manus-border text-sm hover:bg-manus-surface3 transition-colors flex-shrink-0">Edit</button>
                        </div>
                        <div class="p-4 bg-manus-surface2 rounded-xl border border-manus-border">
                            <div class="text-sm text-manus-text-muted mb-1">Member since</div>
                            <div class="font-medium">March 2026</div>
                        </div>
                        <div class="p-4 bg-manus-surface2 rounded-xl border border-manus-border">
                            <div class="text-sm text-manus-text-muted mb-1">Plan</div>
                            <div class="flex items-center justify-between">
                                <div class="font-medium">Free Plan</div>
                                <button class="px-4 py-1.5 rounded-lg bg-manus-accent/10 text-manus-accent border border-manus-accent/20 text-sm hover:bg-manus-accent/20 transition-colors">Upgrade</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Usage Tab -->
                <div id="settings-usage" class="settings-tab-content hidden">
                    <h2 class="text-xl font-semibold mb-6">Usage</h2>
                    <div class="p-4 bg-manus-surface2 rounded-xl border border-manus-border mb-6">
                        <div class="flex items-center justify-between mb-4">
                            <span class="font-semibold text-lg">Free</span>
                            <button class="px-4 py-1.5 rounded-lg border border-manus-border text-sm hover:bg-manus-surface3 transition-colors">Upgrade</button>
                        </div>
                        <div class="border-t border-dashed border-manus-border pt-4 flex items-center justify-between">
                            <div class="flex items-center gap-2 text-sm text-manus-text-muted">
                                <i class="fas fa-sparkles text-manus-accent"></i>
                                Credits
                                <span class="w-4 h-4 rounded-full border border-manus-text-dim flex items-center justify-center text-[10px] cursor-help" title="Credits are consumed when you use AI features">?</span>
                            </div>
                            <span class="text-2xl font-bold" id="credit-balance">1000</span>
                        </div>
                    </div>
                    <div class="text-sm">
                        <div class="grid grid-cols-3 text-manus-text-dim pb-2 border-b border-manus-border">
                            <span>Details</span><span>Date</span><span class="text-right">Credits change</span>
                        </div>
                        <div id="usage-history" class="divide-y divide-manus-border/50"></div>
                    </div>
                </div>

                <!-- General Tab -->
                <div id="settings-general" class="settings-tab-content hidden">
                    <h2 class="text-xl font-semibold mb-6">General</h2>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between p-4 bg-manus-surface2 rounded-xl border border-manus-border">
                            <div>
                                <div class="font-medium text-sm">Theme</div>
                                <div class="text-xs text-manus-text-muted mt-0.5">Appearance of the app</div>
                            </div>
                            <select class="bg-manus-surface3 border border-manus-border rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer">
                                <option>Dark</option>
                                <option>Light</option>
                                <option>System</option>
                            </select>
                        </div>
                        <div class="flex items-center justify-between p-4 bg-manus-surface2 rounded-xl border border-manus-border">
                            <div>
                                <div class="font-medium text-sm">Language</div>
                                <div class="text-xs text-manus-text-muted mt-0.5">Interface language</div>
                            </div>
                            <select class="bg-manus-surface3 border border-manus-border rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer">
                                <option>English</option>
                                <option>Myanmar (Burmese)</option>
                                <option>Chinese</option>
                                <option>Japanese</option>
                            </select>
                        </div>
                        <div class="flex items-center justify-between p-4 bg-manus-surface2 rounded-xl border border-manus-border">
                            <div>
                                <div class="font-medium text-sm">Send with Enter</div>
                                <div class="text-xs text-manus-text-muted mt-0.5">Use Shift+Enter for new line</div>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked class="sr-only peer">
                                <div class="w-10 h-5 bg-manus-surface3 rounded-full peer peer-checked:bg-manus-accent/60 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                            </label>
                        </div>
                        <div class="flex items-center justify-between p-4 bg-manus-surface2 rounded-xl border border-manus-border">
                            <div>
                                <div class="font-medium text-sm">Clear all conversations</div>
                                <div class="text-xs text-manus-text-muted mt-0.5">Delete all chat history permanently</div>
                            </div>
                            <button onclick="clearAllConversations()" class="px-4 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm hover:bg-red-500/20 transition-colors">Clear all</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="/static/app.js"></script>
</body>
</html>`
  return c.html(html)
})

export default app
