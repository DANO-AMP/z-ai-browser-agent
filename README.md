# Z AI Browser Agent

AI-powered browser automation Chrome extension. Give it a task in natural language and it takes control of the browser to complete it.

Built for the **Z.AI GLM Coding Plan**.

## Features

- **Natural language browser control** — navigate, click, type, scroll, extract data, debug pages
- **30+ built-in tools** — screenshots, tab management, bookmarks, history, cookies, downloads, JS evaluation
- **Scheduled tasks** — cron-like recurring automation with configurable intervals (5min to 24hr)
- **AI prompt improver** — one-click optimization of task descriptions
- **Visual feedback** — pulsing indigo border overlay, "Z AI" tab group, and badge when agent is running
- **Human-in-the-loop** — agent asks for confirmation on sensitive actions (JS execution, cookie access, downloads)
- **Per-tab conversations** — separate chat history for each browser tab
- **Context menu integration** — right-click any page or selection to run with Z AI

## Tech Stack

- Chrome Extension Manifest V3
- Chrome DevTools Protocol (CDP) via `chrome.debugger`
- Z.AI Anthropic-compatible API (GLM models)
- Vanilla JS — zero dependencies

## Installation

### From source

```bash
git clone https://github.com/DANO-AMP/z-ai-browser-agent.git
```

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `z-ai-browser-agent` folder
5. Click the extension icon to open the sidepanel

### Configuration

1. Click the gear icon in the sidepanel header (or go to extension Settings)
2. Enter your **Z.AI API Key** from your GLM Coding Plan dashboard
3. Select your preferred model (GLM-5.1 recommended)
4. Click **Save**, then **Test connection**

## Models

| Model | Speed | Quality | Best for |
|-------|-------|---------|----------|
| GLM-5.1 | Medium | Highest | Complex multi-step tasks |
| GLM-5-Turbo | Fast | High | Quick tasks, general use |
| GLM-5 | Medium | High | Balanced performance |
| GLM-4.5 | Fast | Good | Simple tasks |
| GLM-4.5-Flash | Fastest | Good | Speed-critical tasks |
| GLM-4.5-Air | Fastest | Moderate | High-volume, simple tasks |

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

Create recurring automations from the sidepanel (clock icon) or Settings page:

1. Describe the task
2. (Optional) Click **Improve** to let AI optimize your prompt
3. Select interval (5min to 24hr)
4. Click **Add Task**
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
z-ai-browser-agent/
  background/
    service-worker.js    # Agent loop, tool execution, CDP, API client
  content/
    content.js           # Console log capture (injected into pages)
  sidepanel/
    sidepanel.html       # Chat UI
    sidepanel.js         # UI logic, per-tab conversations, scheduling
    sidepanel.css        # Stitch-inspired dark theme
  options/
    options.html         # Settings page
    options.js           # Config management, scheduled tasks
    options.css          # Settings styles
  shared/
    tokens.css           # Design system tokens (CSS variables)
  icons/
    icon16.png           # Extension icons
    icon48.png
    icon128.png
  manifest.json          # Chrome extension manifest (MV3)
```

## Development

```bash
# Clone
git clone https://github.com/DANO-AMP/z-ai-browser-agent.git
cd z-ai-browser-agent

# Load in Chrome
# 1. chrome://extensions/ → Developer mode → Load unpacked → select this folder

# After changes, click the refresh icon on chrome://extensions/
```

## License

MIT
