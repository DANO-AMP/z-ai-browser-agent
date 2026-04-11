# BrowserAgent AI

AI browser agent Chrome extension. Give it a task in natural language and it takes full control of the browser to complete it — using any AI provider you choose.

## Providers

| Provider | Models | Key required |
|----------|--------|-------------|
| **Z.AI (GLM)** | GLM-5.1, GLM-5-Turbo, GLM-4.5... | Yes |
| **Anthropic** | Claude Opus, Sonnet, Haiku | Yes |
| **OpenAI** | GPT-4o, GPT-4o-mini, o1, o3-mini | Yes |
| **OpenRouter** | 100+ models via single key | Yes |
| **Ollama** | Llama, Mistral, Qwen, Phi (local) | No |

## Features

- **Natural language browser control** — navigate, click, type, scroll, extract data, debug pages
- **30+ built-in tools** — screenshots, tab management, bookmarks, history, cookies, downloads, JS evaluation
- **Multi-provider** — switch between Z.AI, Anthropic, OpenAI, OpenRouter or Ollama from Settings
- **Scheduled tasks** — cron-like recurring automation (5min to 24hr intervals)
- **AI prompt improver** — one-click optimization of task descriptions
- **Visual feedback** — pulsing border overlay, "BrowserAgent" tab group, and pill badge when running
- **Human-in-the-loop** — asks for confirmation on sensitive actions (JS execution, cookies, downloads)
- **Per-tab conversations** — separate chat history for each browser tab
- **Context menu integration** — right-click any page or selection to run BrowserAgent AI

## Installation

```bash
git clone https://github.com/DANO-AMP/browser-agent-ai.git
```

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `browser-agent-ai` folder
5. Click the extension icon to open the sidepanel

## Configuration

1. Click the gear icon → **Settings**
2. Select your **Provider** (Z.AI recommended to start)
3. Enter your **API Key**
4. Pick a **Model** and verify the **API Endpoint**
5. Click **Save** → **Test connection**

### Ollama (local, no key needed)

Start Ollama with CORS enabled for the extension:

```bash
OLLAMA_ORIGINS="chrome-extension://*" ollama serve
```

Then in Settings: select **Ollama**, enable **Developer Mode**, choose a model, Save.

## Available Tools

| Category | Tools |
|----------|-------|
| **Navigation** | navigate, go_back, go_forward, url |
| **Page Reading** | get_page, get_html, get_page_title, screenshot, find |
| **Interaction** | click, type_text, press_key, hover, select_option, scroll, drag |
| **Tabs** | tab_list, tab_switch, tab_new, tab_close |
| **Browser Data** | bookmark_search, bookmark_create, history_search, get_cookies |
| **Advanced** | evaluate_js, set_viewport, download, get_console |
| **Agent** | ask_user, wait, record_start, record_stop |

## Scheduled Tasks

1. Describe the task in Settings → Scheduled Tasks
2. (Optional) Click **Improve** to AI-optimize your prompt
3. Select interval (5min to 24hr)
4. Click **Add Task** — runs automatically on schedule
5. Use **Run now** to execute immediately

## Security

- CSS selector injection prevention via `JSON.stringify` parameterization
- User confirmation required for `evaluate_js`, `get_cookies`, and `download`
- URL validation blocks `javascript:`, `file:`, `chrome:`, and internal IPs
- Sensitive cookie values auto-redacted before sending to API
- Content Security Policy restricts script and connection sources
- Download filenames sanitized against path traversal

## Project Structure

```
browser-agent-ai/
  background/
    service-worker.js    # Agent loop, 30+ CDP tools, multi-provider API client
  content/
    content.js           # Console log capture injected into pages
  sidepanel/
    sidepanel.html/js/css  # Chat UI, per-tab conversations
  options/
    options.html/js/css    # Settings: provider, key, model, endpoint, schedules
  shared/
    providers.js         # Provider adapter layer (Anthropic ↔ OpenAI format)
    api.js               # improvePrompt (provider-aware)
    utils.js             # Shared utilities
    tokens.css           # Design system tokens
  manifest.json          # Chrome MV3 manifest
```

## Tech Stack

- Chrome Extension Manifest V3
- Chrome DevTools Protocol (CDP) via `chrome.debugger`
- Vanilla JS — zero dependencies, no build step
- Provider-agnostic: Anthropic Messages API + OpenAI Chat Completions API

## License

MIT
