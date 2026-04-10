// Z AI Browser Agent - Side Panel
// UI logic + message handling + per-tab conversations + model selector

const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const stopBtn = document.getElementById('stopBtn');
const pauseBtn = document.getElementById('pauseBtn');
const clearBtn = document.getElementById('clearBtn');
const settingsBtn = document.getElementById('settingsBtn');
const statusEl = document.getElementById('status');
const modelSelect = document.getElementById('modelSelect');
const tabLabel = document.getElementById('tabLabel');

let taskIdCounter = 0;
let currentTabId = null;
let conversations = {}; // tabId → { html: '' }
let pendingImages = []; // base64 images to send with next message
let currentTaskText = ''; // Store current task for export
let currentModel = ''; // Store current model for export
let autoScrollEnabled = true; // Auto-scroll toggle state
const MAX_CONVERSATIONS = 30;       // Max stored conversations
const MAX_CONV_HTML_SIZE = 200000;   // Max HTML size per conversation (~200KB)
let lastTaskInput = ''; // Store last input for Arrow Up shortcut
let runningTaskId = null;
let runningTaskTabId = null;
let taskIsPaused = false;
let queueCount = 0; // Number of pending tasks in the persistent queue
const taskTabMap = {};

// Sound notification base64 (short beep)
const completionSound = 'data:audio/wav;base64,UklGRtQEAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YbAEAAB/f4CBgnt6eXh3hoeIiXNzcnFwjo6PkGxra2pplZaWl2VkZGNinJ2dnl5dXFxbo6SlpVdWVVRUqqusra1PTk1MsbKztLRIR0ZFuLm6u7xBQD8/vr6+vr4/Pz8/vr6+vr4/Pz8/vr6+vr4/Pz8/P76+vr4/Pz8/P76+vr4/Pz8/P76+vr4/Pz8/P76+vr4/Pz8/P76+vr4/Pz8/P76+vr6+Pz8/P76+vr6+Pz8/P76+vr6+Pz8/P76+vr6+Pz8/P76+vr6+Pz8/P76+vr6+Pz8/Pz++vr6+Pz8/Pz++vr6+Pz8/Pz++vr6+Pz8/Pz++vr6+Pz8/Pz++vr6+Pz8/Pz++vr6+vj8/Pz++vr6+vj8/Pz++vr6+vj8/Pz++vr6+vj8/Pz++vr6+vj8/Pz++vr6+vj8/Pz8/vr6+vj8/Pz8/vr6+vj8/Pz8/vr6+vj8/Pz8/vr6+vj8/Pz8/vr6+vj8/Pz8/vr6+vr4/Pz8/vr6+vr4/Pz8/vr6+vr4/Pz8/vr6+vr4/Pz8/vr6+vr4/Pz8/vr6+vr4/Pz8/P76+vr4/Pz8/P76+vr4/Pz8/P76+vr4/Pz8/P76+vr4/Pz8/P76+vr4/Pz8/P76+vr6+Pz8/P76+vr6+Pz8/P76+vr6+Pz8/P76+vr6+Pz8/P76+vr6+Pz8/P76+vr6+Pz8/Pz++vr6+Pz8/Pz++vr6+Pz8/Pz++vr6+Pz8/Pz++vr6+Pz8/Pz++vr6+Pz8/Pz++vr6+vj8/Pz++vr6+vj8/Pz++vr6+vj8/Pz++vr6+vj8/Pz++vr6+vj8/Pz++vr6+vj8/Pz8/vr6+vj8/Pz8/vr6+vj8/Pz8/vr6+vj8/Pz8/vr6+vj8/Pz8/vr6+vj8/Pz8/vr6+vr4/Pz8/vr6+vr4/Pz8/vr6+vr4/Pz8/vr6+vr4/Pz8/vr6+vr4/Pz8/vr6+vr4/Pz8/P76+vr4/Pz8/P76+vr4/Pz8/P76+vr4/Pz8/P76+vr4/Pz8/P76+vr4/Pz8/P76+vr6+Pz8/P76+vr6+Pz8/P76+vr6+Pz8/P76+vr6+Pz8/P76+vr6+Pz8/P76+vr6+Pz8/Pz++vr6+Pz8/Pz++vr6+Pz8/Pz++vr6+Pz8/Pz++vr6+Pz8/Pz++vr6+Pz8/Pz++vr6+vj8/Pz++vr6+vj8/Pz++vr6+vj8/Pz++vr6+vj8/Pz++vr6+vj8/Pz++vr6+vj8/Pz8/vr6+vj8/Pz8/vr6+vj8/Pz8/vr6+vj8/Pz8/vr6+vj8/Pz8/vr6+vj8/Pz8/vr6+vr4/Pz8/vr6+vr4/Pz8/vr6+vr4/Pz8/vr6+vr4/Pz8/vr6+vr4/Pz8/vr6+vr4/Pz8/P76+vr4/Pz8/P76+vr4/Pz8/P76+vr4/Pz8/P76+vr4/Pz8/P76+vr4/Pz8/P76+vr6+Pz8/P76+vr6+Pz8/P76+vr6+Pz8/P76+vr6+Pz8/P76+vr6+Pz8/P76+vr6+Pz8/Pz++vr6+Pz8/Pz++vr28QUJDREW4t7a1SUlKS0yxsK+uUFBRUlOpqainplhYWVqioaGgn19gYGGbmpmZmGZnZ2iUk5KSkW1ub2+NjIuKinR1dneGhYSDgnt8fX4=';

// --- Post-process markdown to add code copy buttons ---
function addCodeCopyButtons(html) {
  // Find all <pre><code> blocks and wrap them with copy button
  return html.replace(/<pre><code class="language-(\w*)">/g, (match, lang) => {
    return `<div class="code-block-wrapper"><div class="code-block-header"><span class="code-block-lang">${lang}</span><button class="code-block-copy" title="Copy code">Copy</button></div><pre><code class="language-${lang}">`;
  }).replace(/<\/code><\/pre>/g, '</code></pre></div>');
}

// --- Image Handling ---
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const inputPreviews = document.getElementById('inputPreviews');

attachBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  Array.from(fileInput.files).forEach(f => addImageFile(f));
  fileInput.value = '';
});

// Paste images from clipboard
document.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      addImageFile(item.getAsFile());
    }
  }
});

function addImageFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    const base64 = reader.result.split(',')[1];
    const mediaType = file.type;
    pendingImages.push({ base64, mediaType });
    renderPreviews();
  };
  reader.readAsDataURL(file);
}

function renderPreviews() {
  inputPreviews.textContent = '';
  pendingImages.forEach((img, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'img-preview';
    const el = document.createElement('img');
    el.src = 'data:' + img.mediaType + ';base64,' + img.base64;
    const rm = document.createElement('button');
    rm.className = 'img-preview-remove';
    rm.textContent = '\u00D7';
    rm.addEventListener('click', () => { pendingImages.splice(i, 1); renderPreviews(); });
    wrap.appendChild(el);
    wrap.appendChild(rm);
    inputPreviews.appendChild(wrap);
  });
}

// --- Init ---
// Store original welcome HTML for reset
const originalWelcomeHTML = document.querySelector('.welcome').outerHTML;
loadModel();

// Load persisted conversations FIRST, then init tab info (prevents race condition)
chrome.storage.local.get(['conversations'], (data) => {
  if (data.conversations && typeof data.conversations === 'object') {
    conversations = data.conversations;
  }
  updateTabInfo();
});

// --- Long-lived Port Connection (heartbeat) ---
let panelPort = null;

let heartbeatInterval = null;

function connectPort() {
  try {
    panelPort = chrome.runtime.connect({ name: 'z-ai-panel' });
    panelPort.onMessage.addListener(msg => {
      // heartbeat_ack is silent — just confirms SW is alive
      if (msg.type === 'heartbeat_ack') return;
    });
    panelPort.onDisconnect.addListener(() => {
      panelPort = null;
      if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
      // Reconnect after a short delay (SW may have restarted)
      setTimeout(connectPort, 1000);
    });
    // Send heartbeat every 20 seconds to keep SW alive and connection healthy
    heartbeatInterval = setInterval(() => { try { panelPort?.postMessage({ type: 'heartbeat' }); } catch { } }, 20000);
  } catch { }
}
connectPort();

// Show/hide a small badge on the status bar showing how many tasks are queued
function updateQueueBadge() {
  let badge = document.getElementById('queueBadge');
  if (queueCount > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'queueBadge';
      badge.className = 'queue-badge';
      badge.title = 'Tasks queued - click to clear';
      badge.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'clear_queue' }, () => {
          queueCount = 0;
          updateQueueBadge();
        });
      });
      const statusBar = document.querySelector('.status-bar');
      if (statusBar) statusBar.appendChild(badge);
    }
    badge.textContent = queueCount + " queued";
  } else {
    if (badge) badge.remove();
  }
}

// On startup, sync queue count from SW (survives SW restarts with pending tasks)
chrome.runtime.sendMessage({ type: 'get_queue' }, function(res) {
  if (chrome.runtime.lastError || !res || !res.queue) return;
  const pending = res.queue.filter(function(q) { return q.status === 'pending'; }).length;
  queueCount = pending;
  updateQueueBadge();
});

// --- Update Banner ---
const updateBanner = document.getElementById('updateBanner');
const updateText = document.getElementById('updateText');
const updateLink = document.getElementById('updateLink');
const updateDismiss = document.getElementById('updateDismiss');

function showUpdateBanner(info) {
  if (!info || !info.updateAvailable) return;
  if (info.dismissed && info.dismissedVersion === info.latestVersion) return;
  updateText.textContent = `v${info.latestVersion} available (you have v${info.currentVersion})`;
  updateLink.href = info.releaseUrl || '#';
  updateBanner.classList.remove('hidden');
}

updateDismiss.addEventListener('click', () => {
  updateBanner.classList.add('hidden');
  chrome.runtime.sendMessage({ type: 'dismiss_update' });
});

// Check for updates on panel open
chrome.runtime.sendMessage({ type: 'get_update_info' }, function(info) {
  if (chrome.runtime.lastError || !info) return;
  showUpdateBanner(info);
});

// --- Tab Tracking ---

async function updateTabInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      const newTabId = tab.id;
      if (currentTabId !== null && currentTabId !== newTabId) {
        saveConversation(currentTabId);
      }
      currentTabId = newTabId;
      const title = tab.title ? tab.title.substring(0, 50) : 'Untitled';
      const url = tab.url ? (() => { try { return new URL(tab.url).hostname; } catch { return ''; } })() : '';
      tabLabel.textContent = `${title} - ${url}`;
      loadConversation(newTabId);
      refreshTaskUiForCurrentTab();
    }
  } catch { }
}

function ensureConversation(tabId) {
  if (!tabId) return null;
  if (!conversations[tabId]) {
    conversations[tabId] = { html: '', currentTaskText: '', currentModel: '', lastTaskInput: '', lastAccess: Date.now() };
  }
  conversations[tabId].lastAccess = Date.now();
  return conversations[tabId];
}

let _saveTimeout = null;

function saveConversation(tabId, immediate = false) {
  if (!tabId) return;
  const clone = messagesEl.cloneNode(true);
  const welc = clone.querySelector('.welcome');
  if (welc) welc.remove();
  const conv = ensureConversation(tabId);
  if (!conv) return;
  conv.html = clone.innerHTML;
  conv.currentTaskText = currentTaskText;
  conv.currentModel = currentModel;
  conv.lastTaskInput = lastTaskInput;

  // Truncate oversized HTML to prevent storage bloat
  if (conv.html.length > MAX_CONV_HTML_SIZE) {
    conv.html = conv.html.substring(0, MAX_CONV_HTML_SIZE);
  }

  // Debounced persist to storage
  const doPersist = () => {
    // Prune oldest conversations if over limit
    const keys = Object.keys(conversations);
    if (keys.length > MAX_CONVERSATIONS) {
      // Keep current tab + most recent entries
      const sorted = keys
        .filter(k => k !== String(tabId))
        .sort((a, b) => {
          const aTime = conversations[a]?.lastAccess || 0;
          const bTime = conversations[b]?.lastAccess || 0;
          return bTime - aTime;
        });
      const toRemove = sorted.slice(MAX_CONVERSATIONS - 1);
      toRemove.forEach(k => delete conversations[k]);
    }
    chrome.storage.local.set({ conversations }).catch(() => {});
  };
  if (immediate) {
    clearTimeout(_saveTimeout);
    doPersist();
  } else {
    clearTimeout(_saveTimeout);
    _saveTimeout = setTimeout(doPersist, 500);
  }
}

function restoreConversationState(tabId) {
  const conv = ensureConversation(tabId);
  currentTaskText = conv?.currentTaskText || '';
  currentModel = conv?.currentModel || modelSelect.value;
  lastTaskInput = conv?.lastTaskInput || '';
}

function renderMessageNode(type, html) {
  const div = document.createElement('div');
  div.className = `msg ${type}`;
  div.innerHTML = html;
  return div;
}

function appendMessageToConversation(tabId, type, html) {
  const targetTabId = tabId || currentTabId;
  if (!targetTabId) return null;

  if (targetTabId === currentTabId) {
    removeWelcome();
    const el = addMsg(type, html);
    saveConversation(targetTabId);
    return el;
  }

  const conv = ensureConversation(targetTabId);
  if (!conv) return null;
  const temp = document.createElement('div');
  temp.innerHTML = conv.html || '';
  temp.appendChild(renderMessageNode(type, html));
  conv.html = temp.innerHTML;
  return null;
}

function resolveMessageTabId(msg) {
  if (msg?.tabId) return msg.tabId;
  if (msg?.taskId && taskTabMap[msg.taskId]) return taskTabMap[msg.taskId];
  return currentTabId;
}

function refreshTaskUiForCurrentTab() {
  const isCurrentTabRunning = Boolean(runningTaskId && runningTaskTabId === currentTabId);
  toggleButtons(isCurrentTabRunning);
  const progressContainer = document.getElementById('progressBarContainer');
  if (!isCurrentTabRunning && progressContainer) {
    progressContainer.style.display = 'none';
  }
  if (isCurrentTabRunning) {
    setStatus('running', 'Running...');
  } else {
    setStatus('', 'Ready');
  }
}

function loadConversation(tabId) {
  const conv = conversations[tabId];
  if (conv && conv.html) {
    messagesEl.innerHTML = conv.html;
    restoreConversationState(tabId);
    rebindExampleBtns();
    bindCodeCopyButtons();
    messagesEl.scrollTop = messagesEl.scrollHeight;
  } else {
    showWelcome();
    restoreConversationState(tabId);
  }
}

function showWelcome() {
  messagesEl.innerHTML = originalWelcomeHTML;
  rebindExampleBtns();
}

// Listen for tab activation changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (currentTabId !== null) saveConversation(currentTabId);
  currentTabId = activeInfo.tabId;
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    const title = tab.title ? tab.title.substring(0, 50) : 'Untitled';
    const url = tab.url ? (() => { try { return new URL(tab.url).hostname; } catch { return ''; } })() : '';
    tabLabel.textContent = `${title} - ${url}`;
    loadConversation(tab.id);
    refreshTaskUiForCurrentTab();
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete conversations[tabId];
  if (runningTaskTabId === tabId) {
    runningTaskTabId = null;
  }
  chrome.storage.local.set({ conversations }).catch(() => {});
});

// --- Model Selector ---

function loadModel() {
  chrome.storage.local.get(['modelName'], (data) => {
    if (data.modelName) modelSelect.value = data.modelName;
  });
}

modelSelect.addEventListener('change', () => {
  chrome.storage.local.set({ modelName: modelSelect.value });
});

// --- UI Events ---

sendBtn.addEventListener('click', startTask);
stopBtn.addEventListener('click', stopTask);
pauseBtn?.addEventListener('click', togglePause);
clearBtn.addEventListener('click', clearMessages);
settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    startTask();
  }
});

inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
});

// --- Keyboard Shortcuts ---
document.addEventListener('keydown', (e) => {
  // Escape = Stop task
  if (e.key === 'Escape' && !stopBtn.classList.contains('hidden')) {
    stopTask();
    return;
  }

  // Ctrl/Cmd+K = Clear conversation
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    clearMessages();
    return;
  }

  // Arrow Up = Edit last message (when input is empty and not focused)
  if (e.key === 'ArrowUp' && document.activeElement !== inputEl && lastTaskInput) {
    e.preventDefault();
    inputEl.value = lastTaskInput;
    inputEl.focus();
    inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
  }
});

// --- Sound Notification ---
function playCompletionSound() {
  chrome.storage.local.get(['soundEnabled'], (data) => {
    if (data.soundEnabled !== false) { // Default is enabled
      const audio = new Audio(completionSound);
      audio.volume = 0.3;
      audio.play().catch(() => { }); // Ignore errors (autoplay policy)
    }
  });
}

function rebindExampleBtns() {
  document.querySelectorAll('.example-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      inputEl.value = btn.dataset.task;
      startTask();
    });
  });
}

rebindExampleBtns();

// --- Listen for messages from background ---

chrome.runtime.onMessage.addListener((msg) => {
  switch (msg.type) {
    case 'task_start': {
      const targetTabId = msg.tabId || currentTabId;
      taskTabMap[msg.taskId] = targetTabId;
      runningTaskId = msg.taskId;
      runningTaskTabId = targetTabId;
      const conv = ensureConversation(targetTabId);
      if (conv) {
        conv.currentTaskText = msg.text;
        conv.currentModel = msg.model || modelSelect.value;
        conv.lastTaskInput = msg.text;
      }
      if (targetTabId === currentTabId) {
        currentTaskText = msg.text;
        currentModel = msg.model || modelSelect.value;
        lastTaskInput = msg.text;
        setStatus('running', 'Running...');
        toggleButtons(true);
      }
      appendMessageToConversation(targetTabId, 'task', `<div class="label">Task</div>${escapeHtml(msg.text)}`);
      // Reset progress bar
      const progressBar = document.getElementById('progressBarFill');
      const progressContainer = document.getElementById('progressBarContainer');
      if (progressBar) progressBar.style.width = '0%';
      if (progressContainer) progressContainer.style.display = targetTabId === currentTabId ? 'none' : progressContainer.style.display;
      break;
    }

    case 'progress': {
      const targetTabId = resolveMessageTabId(msg);
      if (targetTabId !== currentTabId) break;
      // Update status text and progress bar
      if (msg.text) setStatus('running', msg.text);
      const percent = msg.percent !== undefined
        ? msg.percent
        : (msg.step && msg.maxSteps ? Math.round((msg.step / msg.maxSteps) * 100) : undefined);
      if (percent !== undefined) {
        const progressBar = document.getElementById('progressBarFill');
        const progressContainer = document.getElementById('progressBarContainer');
        if (progressBar && progressContainer) {
          progressContainer.style.display = 'block';
          progressBar.style.width = percent + '%';
        }
      }
      break;
    }

    case 'thinking': {
      const targetTabId = resolveMessageTabId(msg);
      if (targetTabId !== currentTabId) break;
      removeThinking();
      addMsg('thinking', 'Thinking...');
      break;
    }

    case 'tool_call': {
      const targetTabId = resolveMessageTabId(msg);
      if (targetTabId === currentTabId) removeThinking();
      const icons = {
        navigate: '&#128279;', click: '&#128433;', type_text: '&#9000;',
        press_key: '&#9000;', scroll: '&#8595;', get_page: '&#128196;',
        get_html: '&#128196;', get_page_title: '&#128220;', find: '&#128269;', screenshot: '&#128247;',
        url: '&#127760;', wait: '&#9202;', go_back: '&#9664;', go_forward: '&#9654;',
        hover: '&#128170;', select_option: '&#128220;', drag: '&#128209;',
        evaluate_js: '&#128187;', set_viewport: '&#128248;',
        ask_user: '&#128100;',
        tab_list: '&#128194;', tab_switch: '&#128194;', tab_new: '&#128194;', tab_close: '&#128194;',
        bookmark_search: '&#11088;', bookmark_create: '&#11088;',
        history_search: '&#128337;', download: '&#128229;',
        get_cookies: '&#127850;', get_console: '&#128424;',
        record_start: '&#127909;', record_stop: '&#127909;'
      };
      const icon = icons[msg.tool] || '&#128295;';
      const params = Object.entries(msg.params || {})
        .map(([k, v]) => `${k}="${typeof v === 'string' && v.length > 60 ? v.substring(0, 60) + '...' : v}"`)
        .join(' ');
      appendMessageToConversation(targetTabId, 'tool-call',
        `<span class="tool-icon">${icon}</span>
         <div><span class="tool-name">${escapeHtml(msg.tool)}</span>
         <div class="tool-params">${escapeHtml(params)}</div></div>`
      );
      break;
    }

    case 'tool_result': {
      const targetTabId = resolveMessageTabId(msg);
      const resultStr = typeof msg.result === 'string'
        ? msg.result
        : JSON.stringify(msg.result, null, 2);
      // Prefer the structured ok field set by normalizeToolResult in the service worker;
      // fall back to checking for an 'Error:' prefix in the text (avoids false positives)
      const isErr = msg.result?.ok === false || (typeof msg.result?.ok !== 'boolean' && resultStr.startsWith('Error:'));
      const truncated = resultStr.substring(0, 1000) + (resultStr.length > 1000 ? '\n...' : '');
      appendMessageToConversation(targetTabId, `tool-result ${isErr ? 'err' : 'ok'}`, escapeHtml(truncated));
      break;
    }

    case 'final_response': {
      const targetTabId = resolveMessageTabId(msg);
      const conv = ensureConversation(targetTabId);
      const exportTask = conv?.currentTaskText || currentTaskText;
      const exportModel = conv?.currentModel || currentModel || modelSelect.value;
      if (targetTabId === currentTabId) removeThinking();
      const renderedMarkdown = addCodeCopyButtons(renderMarkdown(msg.text));
      appendMessageToConversation(targetTabId, 'response', '<div class="label">Result</div>' + renderedMarkdown);
      // Build export button via DOM (safe — no untrusted content in innerHTML)
      const labelEl = messagesEl.querySelector('.msg:last-child .label');
      if (labelEl) {
        const exportBtn = document.createElement('button');
        exportBtn.className = 'export-btn';
        exportBtn.title = 'Export result';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '12'); svg.setAttribute('height', '12');
        svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2');
        svg.textContent = ''; // placeholder — use path strings
        const pathD = 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4';
        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', pathD);
        svg.appendChild(pathEl);
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', '7 10 12 15 17 10');
        svg.appendChild(polyline);
        const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        lineEl.setAttribute('x1', '12'); lineEl.setAttribute('y1', '15');
        lineEl.setAttribute('x2', '12'); lineEl.setAttribute('y2', '3');
        svg.appendChild(lineEl);
        exportBtn.appendChild(svg);
        exportBtn.addEventListener('click', () => {
          const filename = `task-${Date.now()}.md`;
          const content = `# Task\n${exportTask}\n\n# Model\n${exportModel}\n\n# Date\n${new Date().toLocaleString()}\n\n# Result\n${msg.text}\n`;
          const blob = new Blob([content], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          chrome.downloads.download({ url, filename, saveAs: false }, () => URL.revokeObjectURL(url));
        });
        labelEl.appendChild(exportBtn);
      }
      break;
    }

    case 'error': {
      const targetTabId = resolveMessageTabId(msg);
      if (targetTabId === currentTabId) {
        removeThinking();
        setStatus('error', 'Error');
      }
      appendMessageToConversation(targetTabId, 'error', escapeHtml(msg.text));
      break;
    }

    case 'task_end': {
      const targetTabId = resolveMessageTabId(msg);
      let endText = 'Task completed';
      let endStatus = 'Ready';
      if (msg.reason === 'tab_closed') {
        endText = 'Task stopped because the controlled tab was closed';
        endStatus = 'Tab closed';
      } else if (msg.stopped) {
        endText = 'Stopped by user';
        endStatus = 'Stopped';
      }
      appendMessageToConversation(targetTabId, 'task-end', endText);
      if (targetTabId === currentTabId) {
        setStatus('', endStatus);
        toggleButtons(false);
      }
      if (msg.taskId) delete taskTabMap[msg.taskId];
      if (runningTaskId === msg.taskId) {
        runningTaskId = null;
        runningTaskTabId = null;
      }
      // Hide progress bar
      const progressContainer = document.getElementById('progressBarContainer');
      if (progressContainer && targetTabId === currentTabId) progressContainer.style.display = 'none';
      // Play completion sound
      if (!msg.stopped) playCompletionSound();
      break;
    }

    case 'task_paused': {
      taskIsPaused = true;
      if (resolveMessageTabId(msg) === currentTabId) {
        setStatus('running', 'Paused');
        if (pauseBtn) { pauseBtn.textContent = 'Resume'; pauseBtn.title = 'Resume task'; }
      }
      break;
    }

    case 'task_resumed': {
      taskIsPaused = false;
      if (resolveMessageTabId(msg) === currentTabId) {
        setStatus('running', 'Running...');
        if (pauseBtn) { pauseBtn.textContent = 'Pause'; pauseBtn.title = 'Pause task'; }
      }
      break;
    }

    case 'follow_up_queued': {
      const targetTabId = resolveMessageTabId(msg);
      queueCount = msg.position || queueCount;
      updateQueueBadge();
      appendMessageToConversation(targetTabId, 'task-end', `⏳ Queued (#${msg.position})`);
      break;
    }

    case 'queue_updated': {
      // Sync local queue count from the authoritative SW state
      const pending = (msg.queue || []).filter(q => q.status === 'pending').length;
      queueCount = pending;
      updateQueueBadge();
      break;
    }

    case 'update_available':
      showUpdateBanner(msg);
      break;

    case 'incoming_task':
      inputEl.value = msg.text;
      startTask(msg.tabId || currentTabId);
      break;

    // --- ask_user: Agent needs human input ---
    case 'ask_user': {
      const targetTabId = resolveMessageTabId(msg);
      const resolveId = msg.resolveId;
      if (targetTabId === currentTabId) {
        removeThinking();
        setStatus('running', 'Waiting for input...');
      }
      // Build options buttons HTML (safe: options come from AI tool call, escaped)
      let optionsHtml = '';
      if (msg.options && msg.options.length > 0) {
        optionsHtml = '<div class="ask-user-options">' +
          msg.options.map(o => '<button class="ask-option-btn">' + escapeHtml(o) + '</button>').join('') +
          '</div>';
      }
      appendMessageToConversation(targetTabId, 'ask-user',
        '<div class="label">Agent asks</div>' +
        '<div class="ask-user-body" data-confirm="' + String(Boolean(msg.confirm)) + '" data-tab-id="' + escapeHtml(String(targetTabId || '')) + '" data-task-id="' + escapeHtml(String(msg.taskId || '')) + '" data-resolve-id="' + escapeHtml(String(resolveId || '')) + '">' +
        '<p>' + escapeHtml(msg.question) + '</p>' +
        optionsHtml +
        '<div class="ask-user-input">' +
        '<input type="text" class="ask-user-input-field" placeholder="Or type a custom response..." />' +
        '<button class="ask-user-send-btn">Send</button>' +
        '</div>' +
        '</div>'
      );
      // All interaction handled via event delegation (messagesEl click/keydown handlers below)
      break;
    }

    // --- Recording ---
    case 'record_frame':
      if (resolveMessageTabId(msg) === currentTabId) {
        setStatus('running', `Grabando... (${msg.count} frames)`);
      }
      break;

    case 'record_done':
      appendMessageToConversation(resolveMessageTabId(msg), 'tool-result ok', `Grabacion completada: ${msg.frames} frames capturados`);
      break;
  }
});

// --- Actions ---

function startTask(targetTabId = currentTabId) {
  const task = inputEl.value.trim();
  if (!task && pendingImages.length === 0) return;

  const nextTaskId = ++taskIdCounter;
  const images = [...pendingImages];

  // If a task just completed (not running), use follow_up_task to continue in same tab context
  const msgType = (!runningTaskId) ? 'run_task' : 'follow_up_task';

  try {
    chrome.runtime.sendMessage({
      type: msgType,
      task: task || 'Analyze these images',
      taskId: nextTaskId,
      model: modelSelect.value,
      images,
      tabId: targetTabId
    }, (res) => {
      if (chrome.runtime.lastError || !res?.success) {
        setStatus('error', res?.error || chrome.runtime.lastError?.message || 'Could not start task');
        return;
      }
      pendingImages = [];
      renderPreviews();
      inputEl.value = '';
      inputEl.style.height = 'auto';
    });
  } catch (e) {
    setStatus('error', e.message || 'Could not start task');
  }
}

function stopTask() {
  try {
    chrome.runtime.sendMessage({ type: 'stop_task' }, (res) => {
      if (chrome.runtime.lastError || !res?.success) {
        setStatus('error', res?.error || chrome.runtime.lastError?.message || 'No active task');
        return;
      }
      setStatus('', 'Stopping...');
      stopBtn.disabled = true;
    });
  } catch (e) {
    setStatus('error', e.message || 'Could not stop task');
  }
}

function togglePause() {
  const type = taskIsPaused ? 'resume_task' : 'pause_task';
  chrome.runtime.sendMessage({ type }, (res) => {
    if (chrome.runtime.lastError || !res?.success) {
      setStatus('error', 'Could not pause/resume task');
    }
  });
}

function clearMessages() {
  showWelcome();
  if (currentTabId) {
    conversations[currentTabId] = { html: '', currentTaskText: '', currentModel: '', lastTaskInput: '' };
    chrome.storage.local.set({ conversations }).catch(() => {});
  }
  currentTaskText = '';
  currentModel = modelSelect.value;
  lastTaskInput = '';
  taskIsPaused = false;
  if (pauseBtn) { pauseBtn.textContent = 'Pause'; pauseBtn.title = 'Pause task'; }
}

// --- Auto-scroll Toggle ---
const autoScrollToggle = document.getElementById('autoScrollToggle');

// Initialize auto-scroll toggle state
chrome.storage.local.get(['autoScrollEnabled'], (data) => {
  autoScrollEnabled = data.autoScrollEnabled !== false; // Default is enabled
  autoScrollToggle.classList.toggle('active', autoScrollEnabled);
  autoScrollToggle.querySelector('span').textContent = autoScrollEnabled ? 'Auto' : 'Off';
});

autoScrollToggle.addEventListener('click', () => {
  autoScrollEnabled = !autoScrollEnabled;
  autoScrollToggle.classList.toggle('active', autoScrollEnabled);
  autoScrollToggle.querySelector('span').textContent = autoScrollEnabled ? 'Auto' : 'Off';
  chrome.storage.local.set({ autoScrollEnabled });
});

function lockAskUserMessage(askMsgEl, selectedBtn = null) {
  if (!askMsgEl || askMsgEl.dataset.answered === 'true') return;
  askMsgEl.dataset.answered = 'true';
  askMsgEl.querySelectorAll('.ask-option-btn').forEach(btn => {
    btn.disabled = true;
    if (btn === selectedBtn) {
      btn.classList.add('selected');
      btn.classList.remove('selected-off');
    } else {
      btn.classList.add('selected-off');
    }
  });
  const askInput = askMsgEl.querySelector('.ask-user-input-field');
  const askBtn = askMsgEl.querySelector('.ask-user-send-btn');
  if (askInput) askInput.disabled = true;
  if (askBtn) askBtn.disabled = true;
}

function submitAskUserResponse(askMsgEl, value, selectedBtn = null) {
  if (!askMsgEl || askMsgEl.dataset.answered === 'true') return;
  const text = String(value || '').trim();
  if (!text) return;

  const askBody = askMsgEl.querySelector('.ask-user-body');
  const confirm = askBody?.dataset.confirm === 'true';
  const resolveId = askBody?.dataset.resolveId ? parseInt(askBody.dataset.resolveId, 10) : undefined;
  const targetTabId = Number(askBody?.dataset.tabId) || currentTabId;
  chrome.runtime.sendMessage({ type: 'user_response', text, confirm, resolveId }, (res) => {
    if (chrome.runtime.lastError || !res?.success) {
      setStatus('error', res?.error || chrome.runtime.lastError?.message || 'Could not send response');
      return;
    }
    lockAskUserMessage(askMsgEl, selectedBtn);
    appendMessageToConversation(targetTabId, 'tool-result ok', escapeHtml(text));
  });
}

messagesEl.addEventListener('click', (e) => {
  // Export button handled by direct listener in final_response handler — skip delegation to avoid double download
  if (e.target.closest('.export-btn')) return;

  const askOptionBtn = e.target.closest('.ask-option-btn');
  if (askOptionBtn) {
    const askMsgEl = askOptionBtn.closest('.msg.ask-user');
    submitAskUserResponse(askMsgEl, askOptionBtn.textContent, askOptionBtn);
    return;
  }

  const askSendBtn = e.target.closest('.ask-user-send-btn');
  if (askSendBtn) {
    const askMsgEl = askSendBtn.closest('.msg.ask-user');
    const askInput = askMsgEl?.querySelector('.ask-user-input-field');
    submitAskUserResponse(askMsgEl, askInput?.value || '');
  }
});

messagesEl.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || !e.target.classList.contains('ask-user-input-field')) return;
  e.preventDefault();
  const askMsgEl = e.target.closest('.msg.ask-user');
  submitAskUserResponse(askMsgEl, e.target.value || '');
});

// --- Code Copy Button Handler ---
function bindCodeCopyButtons() {
  messagesEl.querySelectorAll('.code-block-copy').forEach(btn => {
    if (btn.__zAiBound) return;
    btn.__zAiBound = true;

    btn.addEventListener('click', () => {
      const codeBlock = btn.closest('.code-block-wrapper');
      const code = codeBlock?.querySelector('code');
      if (code) {
        navigator.clipboard.writeText(code.textContent).then(() => {
          const originalText = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = originalText; }, 2000);
        });
      }
    });
  });
}

// Watch for new code blocks and bind copy buttons (throttled via rAF to avoid excessive calls)
let _observerRafPending = false;
const codeBlockObserver = new MutationObserver(() => {
  if (_observerRafPending) return;
  _observerRafPending = true;
  requestAnimationFrame(() => {
    _observerRafPending = false;
    bindCodeCopyButtons();
    if (autoScrollEnabled) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  });
});

codeBlockObserver.observe(messagesEl, { childList: true, subtree: true });

// --- Helpers ---

function addMsg(type, html) {
  const div = document.createElement('div');
  div.className = `msg ${type}`;
  div.innerHTML = html;
  messagesEl.appendChild(div);
  if (autoScrollEnabled) messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function removeThinking() {
  const el = messagesEl.querySelector('.msg.thinking');
  if (el) el.remove();
}

function removeWelcome() {
  const el = messagesEl.querySelector('.welcome');
  if (el) el.remove();
}

function setStatus(cls, text) {
  statusEl.className = 'status ' + cls;
  statusEl.querySelector('.status-text').textContent = text;
}

function toggleButtons(isRunning) {
  sendBtn.classList.toggle('hidden', isRunning);
  stopBtn.classList.toggle('hidden', !isRunning);
  if (pauseBtn) pauseBtn.classList.toggle('hidden', !isRunning);
  stopBtn.disabled = false;
  inputEl.disabled = isRunning;
  if (!isRunning) {
    taskIsPaused = false;
    if (pauseBtn) { pauseBtn.textContent = 'Pause'; pauseBtn.title = 'Pause task'; }
  }
}

// escapeHtml, renderMarkdown, and sanitizeHTML now in shared/utils.js
