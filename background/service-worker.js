// Z AI Browser Agent - Background Service Worker
// Uses Z.AI's Anthropic-compatible API + Chrome DevTools Protocol (CDP)

const TOOLS = [
  // --- Navigation & Page ---
  {"type":"function","name":"navigate","description":"Go to a URL","input_schema":{"type":"object","properties":{"url":{"type":"string"}},"required":["url"]},"function":{"name":"navigate","description":"Go to a URL","parameters":{"type":"object","properties":{"url":{"type":"string"}},"required":["url"]}}},
  {"type":"function","name":"go_back","description":"Go back in browser history","input_schema":{"type":"object","properties":{}},"function":{"name":"go_back","description":"Go back in browser history","parameters":{"type":"object","properties":{}}}},
  {"type":"function","name":"go_forward","description":"Go forward in browser history","input_schema":{"type":"object","properties":{}},"function":{"name":"go_forward","description":"Go forward in browser history","parameters":{"type":"object","properties":{}}}},
  {"type":"function","name":"url","description":"Get current page URL","input_schema":{"type":"object","properties":{}},"function":{"name":"url","description":"Get current URL","parameters":{"type":"object","properties":{}}}},
  {"type":"function","name":"get_page","description":"Read visible text of the page or a specific element","input_schema":{"type":"object","properties":{"selector":{"type":"string"}}},"function":{"name":"get_page","description":"Read visible text","parameters":{"type":"object","properties":{"selector":{"type":"string"}}}}},
  {"type":"function","name":"get_html","description":"Get the HTML source of a specific element or the whole page body","input_schema":{"type":"object","properties":{"selector":{"type":"string"}}},"function":{"name":"get_html","description":"Get HTML source of element","parameters":{"type":"object","properties":{"selector":{"type":"string"}}}}},
  {"type":"function","name":"get_page_title","description":"Get the current page title","input_schema":{"type":"object","properties":{}},"function":{"name":"get_page_title","description":"Get page title","parameters":{"type":"object","properties":{}}}},
  {"type":"function","name":"screenshot","description":"Take a screenshot of the current page to see it visually","input_schema":{"type":"object","properties":{}},"function":{"name":"screenshot","description":"Take a screenshot","parameters":{"type":"object","properties":{}}}},
  {"type":"function","name":"find","description":"Find elements by CSS selector, returns list with text and attributes","input_schema":{"type":"object","properties":{"selector":{"type":"string"}},"required":["selector"]},"function":{"name":"find","description":"Find elements","parameters":{"type":"object","properties":{"selector":{"type":"string"}},"required":["selector"]}}},

  // --- Console & Debugging ---
  {"type":"function","name":"get_console","description":"Read browser console logs (errors, warnings, info). Useful for debugging web pages.","input_schema":{"type":"object","properties":{"level":{"type":"string","enum":["all","error","warning","info"],"description":"Filter by log level"}}},"function":{"name":"get_console","description":"Read console logs","parameters":{"type":"object","properties":{"level":{"type":"string","enum":["all","error","warning","info"]}}}}},

  // --- Interaction ---
  {"type":"function","name":"click","description":"Click element by CSS selector","input_schema":{"type":"object","properties":{"selector":{"type":"string"}},"required":["selector"]},"function":{"name":"click","description":"Click element by CSS selector","parameters":{"type":"object","properties":{"selector":{"type":"string"}},"required":["selector"]}}},
  {"type":"function","name":"type_text","description":"Type text into input field","input_schema":{"type":"object","properties":{"selector":{"type":"string"},"text":{"type":"string"}},"required":["selector","text"]},"function":{"name":"type_text","description":"Type text into input field","parameters":{"type":"object","properties":{"selector":{"type":"string"},"text":{"type":"string"}},"required":["selector","text"]}}},
  {"type":"function","name":"press_key","description":"Press a key (Enter, Tab, Escape, Backspace, etc)","input_schema":{"type":"object","properties":{"key":{"type":"string"}},"required":["key"]},"function":{"name":"press_key","description":"Press a key","parameters":{"type":"object","properties":{"key":{"type":"string"}},"required":["key"]}}},
  {"type":"function","name":"hover","description":"Hover over an element by CSS selector","input_schema":{"type":"object","properties":{"selector":{"type":"string"}},"required":["selector"]},"function":{"name":"hover","description":"Hover over element","parameters":{"type":"object","properties":{"selector":{"type":"string"}},"required":["selector"]}}},
  {"type":"function","name":"select_option","description":"Select an option in a dropdown/select element by its visible text","input_schema":{"type":"object","properties":{"selector":{"type":"string"},"text":{"type":"string"}},"required":["selector","text"]},"function":{"name":"select_option","description":"Select dropdown option","parameters":{"type":"object","properties":{"selector":{"type":"string"},"text":{"type":"string"}},"required":["selector","text"]}}},
  {"type":"function","name":"scroll","description":"Scroll page up or down","input_schema":{"type":"object","properties":{"dir":{"type":"string","enum":["up","down"]}},"required":["dir"]},"function":{"name":"scroll","description":"Scroll page","parameters":{"type":"object","properties":{"dir":{"type":"string","enum":["up","down"]}},"required":["dir"]}}},
  {"type":"function","name":"drag","description":"Drag an element from one position to another","input_schema":{"type":"object","properties":{"from_selector":{"type":"string"},"to_selector":{"type":"string"}},"required":["from_selector","to_selector"]},"function":{"name":"drag","description":"Drag element","parameters":{"type":"object","properties":{"from_selector":{"type":"string"},"to_selector":{"type":"string"}},"required":["from_selector","to_selector"]}}},

  // --- Advanced ---
  {"type":"function","name":"evaluate_js","description":"Execute custom JavaScript code on the page and return the result. Use for complex interactions.","input_schema":{"type":"object","properties":{"code":{"type":"string"}},"required":["code"]},"function":{"name":"evaluate_js","description":"Run JavaScript","parameters":{"type":"object","properties":{"code":{"type":"string"}},"required":["code"]}}},
  {"type":"function","name":"set_viewport","description":"Change the page viewport size for responsive testing","input_schema":{"type":"object","properties":{"width":{"type":"number"},"height":{"type":"number"}},"required":["width","height"]},"function":{"name":"set_viewport","description":"Set viewport size","parameters":{"type":"object","properties":{"width":{"type":"number"},"height":{"type":"number"}},"required":["width","height"]}}},

  // --- Wait ---
  {"type":"function","name":"wait","description":"Wait milliseconds for page to load or animation to complete","input_schema":{"type":"object","properties":{"ms":{"type":"number"}},"required":["ms"]},"function":{"name":"wait","description":"Wait","parameters":{"type":"object","properties":{"ms":{"type":"number"}},"required":["ms"]}}},
  {"type":"function","name":"ask_user","description":"Ask the user a question and wait for their response. ALWAYS provide an options array with 2-4 clickable choices. Only use when truly blocked (login, CAPTCHA, sensitive action).","input_schema":{"type":"object","properties":{"question":{"type":"string"},"options":{"type":"array","items":{"type":"string"},"description":"2-4 quick reply options for the user to choose from"}},"required":["question"]},"function":{"name":"ask_user","description":"Ask user with options","parameters":{"type":"object","properties":{"question":{"type":"string"},"options":{"type":"array","items":{"type":"string"}}},"required":["question"]}}},

  // --- Tab Management ---
  {"type":"function","name":"tab_list","description":"List all open tabs with their titles and URLs","input_schema":{"type":"object","properties":{}},"function":{"name":"tab_list","description":"List all open tabs","parameters":{"type":"object","properties":{}}}},
  {"type":"function","name":"tab_switch","description":"Switch to a different tab by its index (0-based)","input_schema":{"type":"object","properties":{"index":{"type":"number"}},"required":["index"]},"function":{"name":"tab_switch","description":"Switch to tab by index","parameters":{"type":"object","properties":{"index":{"type":"number"}},"required":["index"]}}},
  {"type":"function","name":"tab_new","description":"Open a new tab with an optional URL","input_schema":{"type":"object","properties":{"url":{"type":"string"}}},"function":{"name":"tab_new","description":"Open new tab","parameters":{"type":"object","properties":{"url":{"type":"string"}}}}},
  {"type":"function","name":"tab_close","description":"Close a tab by its index (0-based)","input_schema":{"type":"object","properties":{"index":{"type":"number"}},"required":["index"]},"function":{"name":"tab_close","description":"Close tab by index","parameters":{"type":"object","properties":{"index":{"type":"number"}},"required":["index"]}}},

  // --- Bookmarks ---
  {"type":"function","name":"bookmark_search","description":"Search bookmarks by query string","input_schema":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]},"function":{"name":"bookmark_search","description":"Search bookmarks","parameters":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}}},
  {"type":"function","name":"bookmark_create","description":"Bookmark the current page or a specific URL","input_schema":{"type":"object","properties":{"title":{"type":"string"},"url":{"type":"string"}}},"function":{"name":"bookmark_create","description":"Create bookmark","parameters":{"type":"object","properties":{"title":{"type":"string"},"url":{"type":"string"}}}}},

  // --- History ---
  {"type":"function","name":"history_search","description":"Search browser history by text query. Returns recent matching visits.","input_schema":{"type":"object","properties":{"query":{"type":"string"},"max_results":{"type":"number"}},"required":["query"]},"function":{"name":"history_search","description":"Search browser history","parameters":{"type":"object","properties":{"query":{"type":"string"},"max_results":{"type":"number"}},"required":["query"]}}},

  // --- Downloads ---
  {"type":"function","name":"download","description":"Download a file from a URL","input_schema":{"type":"object","properties":{"url":{"type":"string"},"filename":{"type":"string"}},"required":["url"]},"function":{"name":"download","description":"Download file","parameters":{"type":"object","properties":{"url":{"type":"string"},"filename":{"type":"string"}},"required":["url"]}}},

  // --- Cookies ---
  {"type":"function","name":"get_cookies","description":"Get cookies for the current page or a specific domain","input_schema":{"type":"object","properties":{"domain":{"type":"string"}}},"function":{"name":"get_cookies","description":"Get cookies","parameters":{"type":"object","properties":{"domain":{"type":"string"}}}}},

  // --- Recording ---
  {"type":"function","name":"record_start","description":"Start recording browser interactions (captures periodic screenshots)","input_schema":{"type":"object","properties":{}},"function":{"name":"record_start","description":"Start recording","parameters":{"type":"object","properties":{}}}},
  {"type":"function","name":"record_stop","description":"Stop recording and get all captured frames as a summary","input_schema":{"type":"object","properties":{}},"function":{"name":"record_stop","description":"Stop recording","parameters":{"type":"object","properties":{}}}}
];

const SYSTEM_PROMPT = `You control a web browser via DevTools Protocol. Use tools to complete tasks.

IMPORTANT RULES:
- Be AUTONOMOUS. Complete tasks without asking the user unless absolutely necessary.
- Take a screenshot first to see the page visually, then act.
- Use CSS selectors to interact with elements.
- Wait after navigation for pages to load.
- You can manage tabs, bookmarks, history, downloads and cookies.
- Use get_console to debug web pages and read browser errors.
- If something fails, try an alternative approach before asking the user.
- If you detect a LOGIN PAGE, CAPTCHA, or AUTHENTICATION WALL: use ask_user with options like ["Log in manually", "Skip this step", "Try another approach"].
- If a task involves SENSITIVE ACTIONS (purchases, deleting data): use ask_user with clear options like ["Proceed", "Cancel", "Modify"].
- When using ask_user, ALWAYS provide an "options" array with 2-4 suggested actions so the user can tap instead of typing.
- Reply in the same language the user writes.`;

let running = false;
let shouldStop = false;
let debugTabId = null;
let currentTaskTabId = null;
let consoleLogs = [];
let recording = false;
let recordFrames = [];
let recordInterval = null;
let userResponse = null;
let userResponseResolve = null;
let taskTabGroupId = null;

// --- CONTEXT MENU ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'z-ai-task',
    title: 'Run with Z AI',
    contexts: ['selection', 'link', 'page']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const task = info.selectionText || `Analyze this page: ${tab?.url || 'current'}`;
  chrome.sidePanel.open({ tabId: tab.id });
  setTimeout(() => {
    broadcast({ type: 'incoming_task', text: task, tabId: tab.id });
  }, 500);
});

// --- MESSAGE HANDLING ---

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'run_task') {
    runTask(msg.task, msg.taskId, msg.model, msg.images);
    sendResponse({ success: true });
  }
  else if (msg.type === 'stop_task') { shouldStop = true; sendResponse({ success: true }); }
  else if (msg.type === 'get_status') { sendResponse({ running }); }
  else if (msg.type === 'user_response') {
    userResponse = msg.text;
    if (userResponseResolve) { userResponseResolve(msg.text); userResponseResolve = null; }
    sendResponse({ success: true });
  }
  else if (msg.type === 'schedule_task') {
    scheduleTask(msg.task, msg.cronMinutes);
    sendResponse({ success: true });
  }
  else if (msg.type === 'get_scheduled') {
    chrome.storage.local.get(['scheduledTasks'], (data) => {
      sendResponse({ tasks: data.scheduledTasks || [] });
    });
    return true;
  }
  else if (msg.type === 'remove_scheduled') {
    removeScheduledTask(msg.index);
    sendResponse({ success: true });
  }
  return true;
});

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Detach debugger if tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === debugTabId) { debugTabId = null; }
});

// --- SCHEDULED TASKS (chrome.alarms) ---

function scheduleTask(task, intervalMinutes) {
  chrome.storage.local.get(['scheduledTasks'], (data) => {
    const tasks = data.scheduledTasks || [];
    const id = `z-ai-task-${Date.now()}`;
    tasks.push({ task, intervalMinutes, alarmName: id, createdAt: Date.now() });
    chrome.storage.local.set({ scheduledTasks: tasks });
    chrome.alarms.create(id, { periodInMinutes: intervalMinutes });
  });
}

function removeScheduledTask(index) {
  chrome.storage.local.get(['scheduledTasks'], (data) => {
    const tasks = data.scheduledTasks || [];
    if (tasks[index]) {
      chrome.alarms.clear(tasks[index].alarmName);
      tasks.splice(index, 1);
      chrome.storage.local.set({ scheduledTasks: tasks });
    }
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('z-ai-task-')) {
    chrome.storage.local.get(['scheduledTasks'], (data) => {
      const tasks = data.scheduledTasks || [];
      const scheduled = tasks.find(t => t.alarmName === alarm.name);
      if (scheduled && !running) {
        runTask(scheduled.task, Date.now(), null, null);
      }
    });
  }
});

// Restore alarms on service worker restart
chrome.storage.local.get(['scheduledTasks'], (data) => {
  const tasks = data.scheduledTasks || [];
  for (const t of tasks) {
    chrome.alarms.create(t.alarmName, { periodInMinutes: t.intervalMinutes });
  }
});

// --- DEBUGGER LIFECYCLE ---

async function attachDebugger(tabId) {
  if (debugTabId === tabId) return;
  if (debugTabId) {
    try { await chrome.debugger.detach({ tabId: debugTabId }); } catch {}
  }
  await chrome.debugger.attach({ tabId }, "1.3");
  await chrome.debugger.sendCommand({ tabId }, "Page.enable");
  await chrome.debugger.sendCommand({ tabId }, "Runtime.enable");
  await chrome.debugger.sendCommand({ tabId }, "Log.enable");
  debugTabId = tabId;
  consoleLogs = [];

  // Listen for console messages
  const logHandler = (source, method, params) => {
    if (source.tabId !== tabId) return;
    if (method === 'Runtime.consoleAPICalled') {
      const type = params.type; // log, warning, error, info
      const args = (params.args || []).map(a => a.value || a.description || '').join(' ');
      consoleLogs.push({ type, text: args, time: Date.now() });
      if (consoleLogs.length > 200) consoleLogs.shift();
    } else if (method === 'Runtime.exceptionThrown') {
      const desc = params.exceptionDetails?.text || params.exceptionDetails?.exception?.description || 'Exception';
      consoleLogs.push({ type: 'error', text: desc, time: Date.now() });
    }
  };
  chrome.debugger.onEvent.addListener(logHandler);

  // Store handler ref for cleanup
  debugTabId = tabId;
  debugLogHandler = logHandler;
}

let debugLogHandler = null;

async function detachDebugger() {
  if (debugLogHandler) {
    chrome.debugger.onEvent.removeListener(debugLogHandler);
    debugLogHandler = null;
  }
  if (debugTabId) {
    try { await chrome.debugger.detach({ tabId: debugTabId }); } catch {}
    debugTabId = null;
  }
}

async function cdp(tabId, method, params = {}) {
  return chrome.debugger.sendCommand({ tabId }, method, params);
}

// --- VISUAL EFFECTS ---

async function showTaskEffects(tabId) {
  // 1. Badge on extension icon
  chrome.action.setBadgeText({ text: 'AI' });
  chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });

  // 2. Tab group
  try {
    const groupId = await chrome.tabs.group({ tabIds: [tabId] });
    await chrome.tabGroups.update(groupId, { title: 'Z AI', color: 'purple', collapsed: false });
    taskTabGroupId = groupId;
  } catch {}

  // 3. Page overlay glow border + floating indicator (safe DOM construction, no innerHTML)
  try {
    await cdp(tabId, 'Runtime.evaluate', {
      expression: `(() => {
        if (document.getElementById('z-ai-overlay')) return;
        var s = document.createElement('style');
        s.id = 'z-ai-style';
        s.textContent = '#z-ai-border{position:fixed;inset:0;pointer-events:none;z-index:2147483646;border:2px solid rgba(99,102,241,0.5);box-shadow:inset 0 0 30px rgba(99,102,241,0.08),0 0 15px rgba(99,102,241,0.1);animation:z-ai-pulse 3s ease-in-out infinite}@keyframes z-ai-pulse{0%,100%{border-color:rgba(99,102,241,0.5);box-shadow:inset 0 0 30px rgba(99,102,241,0.08)}50%{border-color:rgba(99,102,241,0.25);box-shadow:inset 0 0 15px rgba(99,102,241,0.04)}}#z-ai-pill{position:fixed;top:10px;right:10px;z-index:2147483647;background:rgba(10,10,15,0.9);color:#c0c1ff;font:500 11px -apple-system,BlinkMacSystemFont,system-ui,sans-serif;padding:5px 12px 5px 8px;border-radius:20px;display:flex;align-items:center;gap:6px;border:1px solid rgba(99,102,241,0.3);box-shadow:0 4px 16px rgba(0,0,0,0.4);pointer-events:none}#z-ai-dot{width:6px;height:6px;border-radius:50%;background:#6366f1;animation:z-ai-dot-pulse 1.5s ease-in-out infinite}@keyframes z-ai-dot-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.7)}}';
        document.head.appendChild(s);
        var wrap = document.createElement('div');
        wrap.id = 'z-ai-overlay';
        var border = document.createElement('div');
        border.id = 'z-ai-border';
        wrap.appendChild(border);
        var pill = document.createElement('div');
        pill.id = 'z-ai-pill';
        var dot = document.createElement('span');
        dot.id = 'z-ai-dot';
        pill.appendChild(dot);
        pill.appendChild(document.createTextNode('Z AI running...'));
        wrap.appendChild(pill);
        document.body.appendChild(wrap);
      })()`
    });
  } catch {}
}

async function hideTaskEffects(tabId) {
  // 1. Clear badge
  chrome.action.setBadgeText({ text: '' });

  // 2. Ungroup tab
  if (taskTabGroupId !== null) {
    try { await chrome.tabs.ungroup([tabId]); } catch {}
    taskTabGroupId = null;
  }

  // 3. Remove page overlay
  try {
    await cdp(tabId, 'Runtime.evaluate', {
      expression: `(() => {
        var o = document.getElementById('z-ai-overlay');
        var s = document.getElementById('z-ai-style');
        if (o) o.remove();
        if (s) s.remove();
      })()`
    });
  } catch {}
}

// --- AGENT LOOP ---

async function runTask(task, taskId, modelOverride, images) {
  if (running) { broadcast({ type: 'error', text: 'A task is already running', taskId }); return; }
  running = true;
  shouldStop = false;
  consoleLogs = [];

  const { authToken, apiEndpoint, modelName, systemPrompt } = await getConfig();
  const endpoint = apiEndpoint || 'https://api.z.ai/api/anthropic/v1/messages';
  const model = modelOverride || modelName || 'glm-5.1';
  const sysPrompt = systemPrompt || SYSTEM_PROMPT;

  if (!authToken) {
    broadcast({ type: 'error', text: 'Z.AI API Key not configured. Go to Settings.', taskId });
    running = false; return;
  }

  // Get a usable tab (skip chrome:// and edge:// URLs)
  let tab;
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  tab = allTabs.find(t => t.active && /^https?:/.test(t.url));
  if (!tab) tab = allTabs.find(t => /^https?:/.test(t.url));
  if (!tab) {
    const newTab = await chrome.tabs.create({ url: 'about:blank' });
    await sleep(500);
    tab = newTab;
  }

  currentTaskTabId = tab.id;

  try { await attachDebugger(tab.id); }
  catch (e) {
    broadcast({ type: 'error', text: `Could not attach debugger: ${e.message}`, taskId });
    running = false; return;
  }

  // Build first message — text + optional images
  const userContent = [];
  if (images && images.length > 0) {
    for (const img of images) {
      userContent.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.base64 } });
    }
  }
  userContent.push({ type: 'text', text: task });
  const messages = [{ role: 'user', content: userContent }];
  broadcast({ type: 'task_start', text: task, taskId, tabId: tab.id });
  await showTaskEffects(tab.id);

  for (let i = 0; i < 40 && !shouldStop; i++) {
    broadcast({ type: 'thinking', taskId });
    try {
      const response = await callAPI(endpoint, authToken, model, sysPrompt, messages, TOOLS);
      if (shouldStop) break;

      const content = response.content;
      if (response.stop_reason === 'tool_use' && content) {
        messages.push({ role: 'assistant', content });
        const toolBlocks = content.filter(b => b.type === 'tool_use');
        const toolResults = [];

        for (const tb of toolBlocks) {
          if (shouldStop) break;
          broadcast({ type: 'tool_call', tool: tb.name, params: tb.input || {}, taskId });

          // Capture frame if recording
          if (recording && tab.id === currentTaskTabId) {
            try {
              const { data } = await cdp(tab.id, 'Page.captureScreenshot', { format: 'jpeg', quality: 30 });
              recordFrames.push(data);
            } catch {}
          }

          const result = await executeTool(tab.id, tb.name, tb.input || {});

          broadcast({ type: 'tool_result', tool: tb.name, result: result.text || result, taskId });

          // Build tool result - include screenshot as image if present
          const toolContent = [];
          if (result.image) {
            toolContent.push({
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: result.image }
            });
          }
          toolContent.push({
            type: "text",
            text: typeof result === 'string' ? result : (result.text || JSON.stringify(result))
          });

          toolResults.push({ type: 'tool_result', tool_use_id: tb.id, content: toolContent });
        }
        messages.push({ role: 'user', content: toolResults });
      } else {
        const text = content?.filter(b => b.type === 'text').map(b => b.text).join('\n') || '';
        if (text) broadcast({ type: 'final_response', text, taskId });
        break;
      }
    } catch (err) {
      broadcast({ type: 'error', text: `Error: ${err.message}`, taskId });
      break;
    }
  }

  // Stop recording if active
  if (recording) { recording = false; clearInterval(recordInterval); recordFrames = []; }

  await hideTaskEffects(tab.id);
  await detachDebugger();
  broadcast({ type: 'task_end', taskId });
  running = false;
  currentTaskTabId = null;
}

// --- TOOL EXECUTION ---

async function executeTool(tabId, tool, params) {
  try {
    switch (tool) {
      // === Navigation & Page ===
      case 'navigate': {
        if (!isUrlSafe(params.url)) return { text: `Blocked navigation to unsafe URL: ${params.url}` };
        await cdp(tabId, 'Page.navigate', { url: params.url });
        await new Promise(resolve => {
          const timeout = setTimeout(resolve, 8000);
          const handler = (source, method) => {
            if (source.tabId === tabId && method === 'Page.loadEventFired') {
              chrome.debugger.onEvent.removeListener(handler);
              clearTimeout(timeout);
              setTimeout(resolve, 500);
            }
          };
          chrome.debugger.onEvent.addListener(handler);
        });
        return { text: `Navigated to ${params.url}` };
      }

      case 'go_back': {
        await cdp(tabId, 'Runtime.evaluate', { expression: 'window.history.back()' });
        await sleep(1500);
        return { text: 'Navigated back' };
      }

      case 'go_forward': {
        await cdp(tabId, 'Runtime.evaluate', { expression: 'window.history.forward()' });
        await sleep(1500);
        return { text: 'Navigated forward' };
      }

      case 'url': {
        const { result } = await cdp(tabId, 'Runtime.evaluate', { expression: 'window.location.href', returnByValue: true });
        return { text: result?.value || 'unknown' };
      }

      case 'get_page': {
        const expr = params.selector
          ? `document.querySelector(${jsStr(params.selector)})?.innerText?.substring(0,8000) || 'Element not found'`
          : `document.body.innerText.substring(0, 12000)`;
        const { result } = await cdp(tabId, 'Runtime.evaluate', { expression: expr, returnByValue: true });
        return { text: result?.value || 'Empty page' };
      }

      case 'get_html': {
        const expr = params.selector
          ? `document.querySelector(${jsStr(params.selector)})?.outerHTML?.substring(0,10000) || 'Element not found'`
          : `document.body.innerHTML.substring(0, 15000)`;
        const { result } = await cdp(tabId, 'Runtime.evaluate', { expression: expr, returnByValue: true });
        return { text: result?.value || 'Empty' };
      }

      case 'get_page_title': {
        const { result } = await cdp(tabId, 'Runtime.evaluate', { expression: 'document.title', returnByValue: true });
        return { text: result?.value || 'No title' };
      }

      case 'screenshot': {
        const { data } = await cdp(tabId, 'Page.captureScreenshot', { format: 'jpeg', quality: 50 });
        return { text: 'Screenshot captured. The image is shown above.', image: data };
      }

      case 'find': {
        const { result } = await cdp(tabId, 'Runtime.evaluate', {
          expression: `JSON.stringify(Array.from(document.querySelectorAll(${jsStr(params.selector)})).slice(0,15).map((e,i) => ({
            i, tag: e.tagName.toLowerCase(),
            text: (e.textContent||'').substring(0,60).trim(),
            id: e.id||null, href: e.href||null, type: e.type||null,
            placeholder: e.placeholder||null,
            className: e.className||null, value: e.value||null
          })))`,
          returnByValue: true
        });
        return { text: result?.value || '[]' };
      }

      // === Console & Debugging ===
      case 'get_console': {
        const level = params.level || 'all';
        const filtered = level === 'all' ? consoleLogs : consoleLogs.filter(l => l.type === level);
        if (filtered.length === 0) return { text: 'No console logs found.' };
        const output = filtered.slice(-50).map(l => `[${l.type.toUpperCase()}] ${l.text}`).join('\n');
        return { text: output };
      }

      // === Interaction ===
      case 'click': {
        const { result } = await cdp(tabId, 'Runtime.evaluate', {
          expression: `((sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            el.scrollIntoView({behavior:'instant', block:'center'});
            const r = el.getBoundingClientRect();
            return {x: r.x + r.width/2, y: r.y + r.height/2, w: r.width, h: r.height};
          })(${jsStr(params.selector)})`,
          returnByValue: true
        });
        if (!result || !result.value) return { text: `Element not found: ${params.selector}` };
        const { x, y } = result.value;
        await cdp(tabId, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        await cdp(tabId, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        await cdp(tabId, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
        return { text: `Clicked at (${Math.round(x)}, ${Math.round(y)})` };
      }

      case 'type_text': {
        const { result: focusResult } = await cdp(tabId, 'Runtime.evaluate', {
          expression: `((sel, txt) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            el.focus();
            if (el.value !== undefined) { el.value = ''; el.dispatchEvent(new Event('input', {bubbles:true})); }
            const r = el.getBoundingClientRect();
            return {x: r.x + r.width/2, y: r.y + r.height/2};
          })(${jsStr(params.selector)})`,
          returnByValue: true
        });
        if (!focusResult || !focusResult.value) return { text: `Element not found: ${params.selector}` };
        const { x, y } = focusResult.value;
        await cdp(tabId, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        await cdp(tabId, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
        await cdp(tabId, 'Input.insertText', { text: params.text });
        return { text: `Typed: "${params.text}"` };
      }

      case 'press_key': {
        const key = params.key;
        const keyDefs = {
          'Enter': { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 },
          'Tab': { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 },
          'Escape': { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 },
          'Backspace': { key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 },
          'Delete': { key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46 },
          'ArrowDown': { key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 },
          'ArrowUp': { key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 },
          'ArrowLeft': { key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 },
          'ArrowRight': { key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 },
          'Space': { key: ' ', code: 'Space', windowsVirtualKeyCode: 32 },
        };
        const kd = keyDefs[key] || { key, code: key, windowsVirtualKeyCode: key.charCodeAt(0) };
        await cdp(tabId, 'Input.dispatchKeyEvent', { type: 'keyDown', ...kd });
        await cdp(tabId, 'Input.dispatchKeyEvent', { type: 'keyUp', ...kd });
        return { text: `Pressed: ${key}` };
      }

      case 'hover': {
        const { result } = await cdp(tabId, 'Runtime.evaluate', {
          expression: `((sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            el.scrollIntoView({behavior:'instant', block:'center'});
            const r = el.getBoundingClientRect();
            return {x: r.x + r.width/2, y: r.y + r.height/2};
          })(${jsStr(params.selector)})`,
          returnByValue: true
        });
        if (!result || !result.value) return { text: `Element not found: ${params.selector}` };
        const { x, y } = result.value;
        await cdp(tabId, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        return { text: `Hovered at (${Math.round(x)}, ${Math.round(y)})` };
      }

      case 'select_option': {
        const { result } = await cdp(tabId, 'Runtime.evaluate', {
          expression: `((s, t) => {
            const sel = document.querySelector(s);
            if (!sel) return 'Element not found';
            const opts = Array.from(sel.options);
            const idx = opts.findIndex(o => o.text.includes(t));
            if (idx === -1) return 'Option not found: ' + t;
            sel.selectedIndex = idx;
            sel.dispatchEvent(new Event('change', {bubbles:true}));
            return 'Selected: ' + opts[idx].text;
          })(${jsStr(params.selector)}, ${jsStr(params.text)})`,
          returnByValue: true
        });
        return { text: result?.value || 'Error' };
      }

      case 'scroll': {
        const amount = 400;
        const dir = params.dir === 'up' ? -amount : amount;
        await cdp(tabId, 'Runtime.evaluate', { expression: `window.scrollBy(0, ${dir})` });
        return { text: `Scrolled ${params.dir}` };
      }

      case 'drag': {
        // Get source position
        const { result: srcResult } = await cdp(tabId, 'Runtime.evaluate', {
          expression: `((sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return {x: r.x + r.width/2, y: r.y + r.height/2};
          })(${jsStr(params.from_selector)})`,
          returnByValue: true
        });
        // Get target position
        const { result: tgtResult } = await cdp(tabId, 'Runtime.evaluate', {
          expression: `((sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return {x: r.x + r.width/2, y: r.y + r.height/2};
          })(${jsStr(params.to_selector)})`,
          returnByValue: true
        });
        if (!srcResult?.value) return { text: `Source not found: ${params.from_selector}` };
        if (!tgtResult?.value) return { text: `Target not found: ${params.to_selector}` };
        const sx = srcResult.value.x, sy = srcResult.value.y;
        const tx = tgtResult.value.x, ty = tgtResult.value.y;
        // Drag sequence
        await cdp(tabId, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: sx, y: sy });
        await cdp(tabId, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: sx, y: sy, button: 'left', clickCount: 1 });
        await cdp(tabId, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: tx, y: ty });
        await cdp(tabId, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: tx, y: ty, button: 'left', clickCount: 1 });
        return { text: `Dragged from (${Math.round(sx)},${Math.round(sy)}) to (${Math.round(tx)},${Math.round(ty)})` };
      }

      // === Advanced ===
      case 'evaluate_js': {
        const codePreview = params.code.length > 200 ? params.code.substring(0, 200) + '...' : params.code;
        const approved = await confirmWithUser(`The agent wants to execute JavaScript on this page:\n\n${codePreview}\n\nAllow?`);
        if (!approved) return { text: 'User denied JavaScript execution.' };
        const { result } = await cdp(tabId, 'Runtime.evaluate', {
          expression: params.code,
          returnByValue: true,
          awaitPromise: true
        });
        if (result?.type === 'object' && result.subtype === 'error') {
          return { text: `Error: ${result.description}` };
        }
        const val = result?.value;
        return { text: typeof val === 'object' ? JSON.stringify(val, null, 2).substring(0, 5000) : String(val ?? 'undefined') };
      }

      case 'set_viewport': {
        await cdp(tabId, 'Emulation.setDeviceMetricsOverride', {
          width: params.width,
          height: params.height,
          deviceScaleFactor: 1,
          mobile: false
        });
        return { text: `Viewport set to ${params.width}x${params.height}` };
      }

      case 'wait': {
        await sleep(Math.min(params.ms || 1000, 5000));
        return { text: `Waited ${params.ms || 1000}ms` };
      }

      case 'ask_user': {
        // Send question + options to side panel and wait for response
        broadcast({ type: 'ask_user', question: params.question, options: params.options || [], taskId: currentTaskTabId });
        const response = await new Promise((resolve) => {
          userResponseResolve = resolve;
          // Timeout after 5 minutes
          setTimeout(() => resolve('Sin respuesta (timeout)'), 300000);
        });
        return { text: `User responded: ${response}` };
      }

      // === Tab Management ===
      case 'tab_list': {
        const tabs = await chrome.tabs.query({});
        const list = tabs.map((t, i) => `${i}: [${t.title?.substring(0,40)}] ${t.url?.substring(0,60)}`).join('\n');
        return { text: list || 'No tabs open' };
      }

      case 'tab_switch': {
        const allT = await chrome.tabs.query({ currentWindow: true });
        const target = allT[params.index];
        if (!target) return { text: `Tab index ${params.index} not found` };
        await chrome.tabs.update(target.id, { active: true });
        return { text: `Switched to tab ${params.index}: ${target.title}` };
      }

      case 'tab_new': {
        const newTab = await chrome.tabs.create({ url: params.url || 'about:blank' });
        if (params.url) await sleep(2000);
        return { text: `Opened new tab: ${params.url || 'blank'}` };
      }

      case 'tab_close': {
        const allT = await chrome.tabs.query({ currentWindow: true });
        const target = allT[params.index];
        if (!target) return { text: `Tab index ${params.index} not found` };
        await chrome.tabs.remove(target.id);
        return { text: `Closed tab ${params.index}` };
      }

      // === Bookmarks ===
      case 'bookmark_search': {
        const results = await chrome.bookmarks.search({ query: params.query });
        const list = results.slice(0, 15).map(b => `${b.title} - ${b.url}`).join('\n');
        return { text: list || 'No bookmarks found' };
      }

      case 'bookmark_create': {
        const currentUrl = params.url;
        const title = params.title;
        if (!currentUrl) {
          const { result } = await cdp(tabId, 'Runtime.evaluate', { expression: 'window.location.href', returnByValue: true });
          const url = result?.value || '';
          const { result: tResult } = await cdp(tabId, 'Runtime.evaluate', { expression: 'document.title', returnByValue: true });
          await chrome.bookmarks.create({ title: title || tResult?.value || url, url });
          return { text: `Bookmarked: ${tResult?.value || url}` };
        }
        await chrome.bookmarks.create({ title: title || currentUrl, url: currentUrl });
        return { text: `Bookmarked: ${title || currentUrl}` };
      }

      // === History ===
      case 'history_search': {
        const results = await chrome.history.search({
          text: params.query,
          maxResults: params.max_results || 10,
          startTime: Date.now() - 7 * 24 * 60 * 60 * 1000
        });
        const list = results.map(h => `${new Date(h.lastVisitTime).toLocaleString()} - ${h.title} (${h.url})`).join('\n');
        return { text: list || 'No history found' };
      }

      // === Downloads ===
      case 'download': {
        if (!isUrlSafe(params.url)) return { text: `Blocked download from unsafe URL: ${params.url}` };
        let filename = params.filename;
        if (filename) {
          filename = filename.replace(/[/\\:*?"<>|]/g, '_').split('/').pop().split('\\').pop();
          if (filename.startsWith('.')) filename = '_' + filename;
        }
        const approved = await confirmWithUser(`The agent wants to download:\n${params.url}${filename ? '\nAs: ' + filename : ''}\n\nAllow?`);
        if (!approved) return { text: 'User denied download.' };
        const id = await chrome.downloads.download({
          url: params.url,
          filename: filename || undefined
        });
        return { text: `Download started: ${params.url} (id: ${id})` };
      }

      // === Cookies ===
      case 'get_cookies': {
        const domain = params.domain;
        const cookieDomain = domain || (await cdp(tabId, 'Runtime.evaluate', { expression: 'window.location.hostname', returnByValue: true })).result?.value || '';
        const approved = await confirmWithUser(`The agent wants to read cookies for: ${cookieDomain}\n\nAllow?`);
        if (!approved) return { text: 'User denied cookie access.' };
        const cookies = await chrome.cookies.getAll({ domain: cookieDomain });
        const list = cookies.slice(0, 20).map(c => {
          const isSensitive = /session|token|auth|sid|csrf|jwt/i.test(c.name);
          return `${c.name}=${isSensitive ? '[REDACTED]' : c.value.substring(0, 50)}`;
        }).join('\n');
        return { text: list || 'No cookies found' };
      }

      // === Recording ===
      case 'record_start': {
        recording = true;
        recordFrames = [];
        // Take a frame every 2 seconds
        recordInterval = setInterval(async () => {
          if (!recording || !debugTabId) return;
          try {
            const { data } = await cdp(debugTabId, 'Page.captureScreenshot', { format: 'jpeg', quality: 20 });
            recordFrames.push(data);
            broadcast({ type: 'record_frame', count: recordFrames.length });
          } catch {}
        }, 2000);
        return { text: 'Recording started. Capturing a frame every 2 seconds.' };
      }

      case 'record_stop': {
        recording = false;
        if (recordInterval) clearInterval(recordInterval);
        const count = recordFrames.length;
        const summary = `Recording stopped. ${count} frames captured.`;
        // Send first frame as preview
        if (recordFrames.length > 0) {
          broadcast({ type: 'record_done', frames: count, preview: recordFrames[recordFrames.length - 1] });
        }
        const frames = recordFrames;
        recordFrames = [];
        return { text: summary, image: frames[frames.length - 1] };
      }

      default:
        return { text: `Unknown tool: ${tool}` };
    }
  } catch (e) {
    return { text: `Error: ${e.message}` };
  }
}

// --- API ---

async function callAPI(endpoint, authToken, model, systemPrompt, messages, tools) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': authToken, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 4096, system: systemPrompt, messages, tools })
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).substring(0, 300)}`);
  return await res.json();
}

// --- HELPERS ---

async function getConfig() { return await chrome.storage.local.get(['authToken', 'apiEndpoint', 'modelName', 'systemPrompt']); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function broadcast(msg) { chrome.runtime.sendMessage(msg).catch(() => {}); }

// Safe JS string encoding — prevents injection in Runtime.evaluate expressions
function jsStr(value) {
  return JSON.stringify(String(value));
}

// URL safety check — blocks dangerous protocols and internal IPs
function isUrlSafe(url) {
  try {
    const parsed = new URL(url);
    const blocked = ['javascript:', 'file:', 'chrome:', 'chrome-extension:', 'data:', 'blob:'];
    if (blocked.includes(parsed.protocol)) return false;
    const h = parsed.hostname;
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(h)) return false;
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(h)) return false;
    return true;
  } catch { return false; }
}

// User confirmation helper for sensitive operations
async function confirmWithUser(question) {
  broadcast({ type: 'ask_user', question, taskId: currentTaskTabId });
  const response = await new Promise((resolve) => {
    userResponseResolve = resolve;
    setTimeout(() => resolve('no'), 60000);
  });
  const r = response.toLowerCase().trim();
  return r.startsWith('s') || r.startsWith('y') || r === 'ok';
}
