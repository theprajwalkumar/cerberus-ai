<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Cerberus.ai — AI GateKeeper

## Goal

AI GateKeeper for monitoring, policy-enforcement, and red-teaming of LLM agents via MCP protocol and browser-extension bridge logging across ChatGPT and Claude.

## Current Status: ✅ COMPLETE

## Features

### MCP Server Management
- Connect any OpenAI/Anthropic/Custom API endpoint
- Proxy requests through GateKeeper for logging and policy eval
- Test connections live

### LLM Bridge (Browser Extension)
- Captures ChatGPT & Claude conversations via browser extension
- SSE streaming capture with Delta V1 decoding
- Real-time log viewer with expandable payloads
- Request/response preview, timing, status codes

### AI Policies
- Custom rules: block keywords, max tokens, PII detection, prompt injection
- Per-server and global policy scopes
- Priority-based rule evaluation

### Red Teaming
- 10 OWASP Top 10 & MITRE ATLAS attack scenarios
- Automated attack execution against MCP servers
- Risk assessment and analysis

### Pages
- `/` - Redirects to AI GateKeeper
- `/ai-gatekeeper` - Dashboard with stats, stacked charts, recent logs
- `/ai-gatekeeper/mcp-servers` - MCP server CRUD
- `/ai-gatekeeper/logs` - MCP + Bridge log viewer (auto-refresh)
- `/ai-gatekeeper/policies` - AI usage policy management
- `/ai-gatekeeper/red-teaming` - Red teaming engine
- `/ai-gatekeeper/settings` - Configuration

## How to Run

```bash
cd /Users/prajwal/Desktop/cerberus-ai && npm run dev
```

## Browser Extension

- Location: `~/Desktop/cerberus-ai-bridge/`
- Must **Remove** + **Load unpacked** to pick up changes
- Uses `chrome.webRequest` for Claude (non-intrusive) + page hooks for ChatGPT

## Relevant Files

### Pages
- `src/app/page.tsx` - Root redirect
- `src/app/ai-gatekeeper/page.tsx` - Dashboard
- `src/app/ai-gatekeeper/mcp-servers/page.tsx` - MCP server CRUD
- `src/app/ai-gatekeeper/logs/page.tsx` - Real-time log viewer
- `src/app/ai-gatekeeper/policies/page.tsx` - AI policy management
- `src/app/ai-gatekeeper/red-teaming/page.tsx` - Red teaming UI
- `src/app/ai-gatekeeper/settings/page.tsx` - Settings

### API Routes (AI GateKeeper)
- `src/app/api/ai/mcp-servers/route.ts` - CRUD MCP servers
- `src/app/api/ai/mcp-servers/[id]/route.ts` - Single server operations
- `src/app/api/ai/mcp-servers/[id]/proxy/route.ts` - Proxy/log AI requests
- `src/app/api/ai/mcp-servers/[id]/test/route.ts` - Test connection
- `src/app/api/ai/mcp-logs/route.ts` - Fetch logs
- `src/app/api/ai/policies/route.ts` - CRUD policies
- `src/app/api/ai/red-team/route.ts` - Run red team attacks
- `src/app/api/ai/bridge-logs/route.ts` - Bridge log capture
- `src/app/api/ai/telemetry/route.ts` - Combined telemetry

### Components
- `src/components/ui.tsx` - Layout, Card, Table, Btn, Sidebar
- `src/components/ai-gatekeeper.tsx` - AI GateKeeper sub-navigation
- `src/components/gatekeeper/` - Badges, CodeBlock, StatCard, LightTheme
