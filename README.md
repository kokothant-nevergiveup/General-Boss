# Manus AI Clone

## Project Overview
- **Name**: Manus AI Clone
- **Goal**: A full-featured AI chat application inspired by Manus AI
- **Tech Stack**: Hono + TypeScript + TailwindCSS + Cloudflare Pages

## Features

### Completed
- Dark mode UI matching Manus design language
- Chat interface with streaming responses
- "Thinking" animation with execution step panel
- Sidebar with conversation history (localStorage persistence)
- Model selector (Standard, Pro, Lite)
- Settings modal with tabs (Account, Usage, General, Contact)
- Credits system with usage tracking
- Quick action cards on landing page (Slides, Website, Apps, Design)
- Suggestion pills (Research, Data Analysis, Writing, Marketing, Explain)
- Markdown rendering with syntax highlighting
- Code block copy functionality
- OpenAI API integration with smart fallback when API unavailable
- Responsive design with mobile sidebar
- Keyboard shortcuts (Ctrl+K for new chat, Escape for close)
- File attachment UI

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main application page |
| `/api/chat` | POST | AI chat with streaming response |
| `/api/models` | GET | Available AI models list |
| `/static/*` | GET | Static assets (JS, CSS) |

### Chat API Usage
```bash
POST /api/chat
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "Build a website" }
  ],
  "model": "gpt-5-mini"
}
```

## Data Architecture
- **Conversations**: Stored in browser localStorage
- **Credits**: Tracked in browser localStorage
- **Usage History**: Tracked in browser localStorage
- **AI Backend**: OpenAI-compatible API with smart fallback

## Deployment

### Local Development
```bash
npm install
npm run build
npx wrangler pages dev dist --ip 0.0.0.0 --port 3000
```

### Production (Cloudflare Pages)
```bash
npm run build
npx wrangler pages deploy dist --project-name manus-ai-clone
```

### Environment Variables
Set in `.dev.vars` for local or Cloudflare secrets for production:
- `OPENAI_API_KEY` - OpenAI-compatible API key
- `OPENAI_BASE_URL` - API base URL

## User Guide
1. Open the app - you'll see the landing page with "What can I do for you?"
2. Click a quick action card or type your own task
3. The AI will "think" with execution steps, then stream its response
4. Conversations are saved in the sidebar for easy access
5. Use Ctrl+K to start a new conversation
6. Click the gear icon or your profile to access settings

## Status
- **Platform**: Cloudflare Pages
- **Status**: ✅ Active (Sandbox)
- **Last Updated**: 2026-03-23
