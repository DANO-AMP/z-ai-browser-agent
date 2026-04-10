# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered browser automation Chrome extension (MV3). Users describe tasks in natural language; the extension controls Chrome via CDP (Chrome DevTools Protocol) and calls Z.AI's Anthropic-compatible API to reason and act. Zero npm dependencies, no build step.

## Development

```bash
# Load in Chrome
# 1. chrome://extensions/ → Developer mode → Load unpacked → select this repo folder
# 2. After edits, click the refresh icon on chrome://extensions/

# Syntax check all JS files (same as CI)
for f in background/service-worker.js content/content.js sidepanel/sidepanel.js options/options.js shared/utils.js shared/api.js; do
  node --check "$f" && echo "$f: OK" || exit 1
done

# Validate manifest (same as CI)
python3 -c "import json,sys; m=json.load(open('manifest.json')); assert m['manifest_version']==3; print('OK')"
```

No tests exist yet. CI (`.github/workflows/ci.yml`) runs: JS syntax check, manifest validation, secret scanning, file structure verification, then auto-packages a zip and creates a GitHub release on master push.

## Architecture

### Message Flow

```
sidepanel.js (UI)  ←→  chrome.runtime messages / long-lived port  ←→  service-worker.js (brain)
                                                                          ↓
                                                                   Z.AI API (Anthropic-compatible)
                                                                          ↓
                                                                   CDP via chrome.debugger
```

- **sidepanel.js** sends `run_task`, `stop_task`, `pause_task`, `user_response` messages
- **service-worker.js** broadcasts `task_start`, `tool_call`, `tool_result`, `final_response`, `task_end`, `ask_user`, `progress` back to the panel via the long-lived port (`z-ai-panel`)
- **options.js** manages settings and scheduled tasks via the same message interface

### Key Modules

| File | Role |
|------|------|
| `background/service-worker.js` | Agent loop (max 40 steps), 30+ CDP tool implementations, task state machine, persistent queue, scheduled tasks, keep-alive alarm |
| `sidepanel/sidepanel.js` | Chat UI, per-tab conversations (persisted to `chrome.storage.local`), image attachments, keyboard shortcuts |
| `options/options.js` | Settings page, scheduled task CRUD, task templates, task history |
| `content/content.js` | Monkey-patches `console.*` to capture page logs for the agent's `get_console` tool |
| `shared/utils.js` | `escapeHtml`, `sanitizeHTML`, `renderMarkdown`, `jsStr`, `isUrlSafe`, `formatInterval` — loaded everywhere |
| `shared/api.js` | `improvePrompt` — AI-powered prompt optimizer for scheduled tasks |

### Service Worker Internals

- **Task state machine**: `IDLE → STARTING → RUNNING → (PAUSED / WAITING_USER) → COMPLETED / FAILED / STOPPING`
- **Persistent queue** (`chrome.storage.local` key `z_ai_task_queue`): survives SW restarts; keep-alive alarm fires every ~24s to process queued items
- **Checkpoint/watchdog**: saves checkpoint before each task; on SW restart, detects stale checkpoints and re-queues interrupted tasks (up to `maxRetries`)
- **Debugger lifecycle**: `attachDebugger` / `detachDebugger` manage CDP sessions with automatic re-attachment on unexpected detach
- **Tool timeouts**: per-tool (`TOOL_TIMEOUTS` map, default 15s); `ask_user` gets 5 min, `navigate` gets 20s
- **Sensitive tool guards**: `evaluate_js`, `get_cookies`, `cookie_set`, `cookie_delete`, `download` require user confirmation via `confirmWithUser()`

### Shared Code Loading

- Service worker loads shared files via `importScripts('../shared/utils.js')` at the top
- HTML pages load via `<script src="../shared/utils.js"></script>` before their own script
- Shared modules export to global scope (`window` or `self`) explicitly at file bottom

### Security Patterns

- CSS selectors injected into `Runtime.evaluate` are wrapped with `jsStr()` (= `JSON.stringify`) to prevent injection
- URL safety checks block `javascript:`, `file:`, `chrome:`, `data:`, `blob:` protocols and internal IPs (unless dev mode enabled)
- Sensitive cookie values are regex-redacted before sending to API
- Download filenames are sanitized against path traversal
- Content Security Policy restricts script/connect/font/style sources

### Design Tokens

All styling uses CSS variables from `shared/tokens.css` (dark theme, Outfit + Inter fonts, indigo accent `#8b5cf6`). Both `sidepanel.css` and `options.css` import these tokens.

## Important Conventions

- **API format**: Anthropic Messages API (`/v1/messages`) with `x-api-key` header and `anthropic-version: 2023-06-01`
- **Default model**: `glm-5.1` (Z.AI GLM family)
- **Conversations**: keyed by `tabId` in the sidepanel; auto-saved to `chrome.storage.local` with 500ms debounce
- **Tab groups**: active task tabs are grouped under a "Z AI" purple tab group
- **Visual feedback**: pulsing indigo border overlay + "Z AI running..." pill injected into the page via CDP `Runtime.evaluate`
