// Z AI Browser Agent - Side Panel
// UI logic + message handling + per-tab conversations + model selector

const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const stopBtn = document.getElementById('stopBtn');
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
let lastTaskInput = ''; // Store last input for Arrow Up shortcut

// Sound notification base64 (short beep)
const completionSound = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU';

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
updateTabInfo();

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
    }
  } catch {}
}

function saveConversation(tabId) {
  if (!tabId) return;
  const clone = messagesEl.cloneNode(true);
  const welc = clone.querySelector('.welcome');
  if (welc) welc.remove();
  conversations[tabId] = { html: clone.innerHTML };
}

function loadConversation(tabId) {
  const conv = conversations[tabId];
  if (conv && conv.html) {
    messagesEl.innerHTML = conv.html;
    rebindExampleBtns();
    messagesEl.scrollTop = messagesEl.scrollHeight;
  } else {
    showWelcome();
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
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete conversations[tabId];
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
  if (e.key === 'Escape' && !sendBtn.classList.contains('hidden')) {
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
      audio.play().catch(() => {}); // Ignore errors (autoplay policy)
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
      removeWelcome();
      currentTaskText = msg.text;
      currentModel = msg.model || modelSelect.value;
      lastTaskInput = msg.text;
      addMsg('task', `<div class="label">Task</div>${escapeHtml(msg.text)}`);
      setStatus('running', 'Running...');
      toggleButtons(true);
      // Reset progress bar
      const progressBar = document.getElementById('progressBarFill');
      const progressContainer = document.getElementById('progressBarContainer');
      if (progressBar) progressBar.style.width = '0%';
      if (progressContainer) progressContainer.style.display = 'none';
      break;
    }

    case 'progress': {
      // Update status text and progress bar
      if (msg.text) setStatus('running', msg.text);
      if (msg.percent !== undefined) {
        const progressBar = document.getElementById('progressBarFill');
        const progressContainer = document.getElementById('progressBarContainer');
        if (progressBar && progressContainer) {
          progressContainer.style.display = 'block';
          progressBar.style.width = msg.percent + '%';
        }
      }
      break;
    }

    case 'thinking':
      removeThinking();
      addMsg('thinking', 'Thinking...');
      break;

    case 'tool_call': {
      removeThinking();
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
      addMsg('tool-call',
        `<span class="tool-icon">${icon}</span>
         <div><span class="tool-name">${escapeHtml(msg.tool)}</span>
         <div class="tool-params">${escapeHtml(params)}</div></div>`
      );
      break;
    }

    case 'tool_result': {
      const resultStr = typeof msg.result === 'string'
        ? msg.result
        : JSON.stringify(msg.result, null, 2);
      const isErr = resultStr.includes('"error"') || resultStr.includes('Error');
      const truncated = resultStr.substring(0, 1000) + (resultStr.length > 1000 ? '\n...' : '');
      addMsg(`tool-result ${isErr ? 'err' : 'ok'}`, escapeHtml(truncated));
      break;
    }

    case 'final_response': {
      removeThinking();
      const exportBtnHtml = '<button class="export-btn" title="Export result" data-text="' + escapeHtml(msg.text).replace(/"/g, '&quot;') + '" data-task="' + escapeHtml(currentTaskText).replace(/"/g, '&quot;') + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>';
      const renderedMarkdown = addCodeCopyButtons(renderMarkdown(msg.text));
      addMsg('response', `<div class="label">Result ${exportBtnHtml}</div>${renderedMarkdown}`);
      // Bind export button
      const exportBtn = messagesEl.querySelector('.export-btn:last-of-type');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => {
          const task = exportBtn.dataset.task;
          const result = exportBtn.dataset.text;
          const filename = `task-${Date.now()}.md`;
          const content = `# Task\n${task}\n\n# Model\n${currentModel}\n\n# Date\n${new Date().toLocaleString()}\n\n# Result\n${result}\n`;
          const blob = new Blob([content], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          chrome.downloads.download({ url, filename, saveAs: false }, () => URL.revokeObjectURL(url));
        });
      }
      break;
    }

    case 'error':
      removeThinking();
      addMsg('error', escapeHtml(msg.text));
      setStatus('error', 'Error');
      toggleButtons(false);
      break;

    case 'task_end': {
      addMsg('task-end', `Task completed`);
      setStatus('', 'Ready');
      toggleButtons(false);
      // Hide progress bar
      const progressContainer = document.getElementById('progressBarContainer');
      if (progressContainer) progressContainer.style.display = 'none';
      // Play completion sound
      playCompletionSound();
      break;
    }

    case 'incoming_task':
      inputEl.value = msg.text;
      startTask();
      break;

    // --- ask_user: Agent needs human input ---
    case 'ask_user': {
      removeThinking();
      // Build options buttons HTML (safe: options come from AI tool call, escaped)
      let optionsHtml = '';
      if (msg.options && msg.options.length > 0) {
        optionsHtml = '<div class="ask-user-options">' +
          msg.options.map(o => '<button class="ask-option-btn">' + escapeHtml(o) + '</button>').join('') +
          '</div>';
      }
      addMsg('ask-user',
        '<div class="label">Agent asks</div>' +
        '<p>' + escapeHtml(msg.question) + '</p>' +
        optionsHtml +
        '<div class="ask-user-input">' +
        '<input type="text" id="askUserInput" placeholder="Or type a custom response..." />' +
        '<button id="askUserBtn">Send</button>' +
        '</div>'
      );
      // Bind option buttons
      document.querySelectorAll('.ask-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.textContent;
          chrome.runtime.sendMessage({ type: 'user_response', text: val });
          addMsg('tool-result ok', escapeHtml(val));
          // Disable all options and input
          document.querySelectorAll('.ask-option-btn').forEach(b => { b.disabled = true; b.classList.add('selected-off'); });
          btn.classList.remove('selected-off');
          btn.classList.add('selected');
          const inp = document.getElementById('askUserInput');
          const btn2 = document.getElementById('askUserBtn');
          if (inp) inp.disabled = true;
          if (btn2) btn2.disabled = true;
        });
      });
      const askInput = document.getElementById('askUserInput');
      const askBtn = document.getElementById('askUserBtn');
      const sendResponse = () => {
        const val = askInput.value.trim();
        if (val) {
          chrome.runtime.sendMessage({ type: 'user_response', text: val });
          addMsg('tool-result ok', escapeHtml(val));
          askInput.disabled = true;
          askBtn.disabled = true;
          document.querySelectorAll('.ask-option-btn').forEach(b => { b.disabled = true; });
        }
      };
      askBtn.addEventListener('click', sendResponse);
      askInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendResponse();
      });
      break;
    }

    // --- Recording ---
    case 'record_frame':
      setStatus('running', `Grabando... (${msg.count} frames)`);
      break;

    case 'record_done':
      addMsg('tool-result ok', `Grabacion completada: ${msg.frames} frames capturados`);
      break;
  }
});

// --- Actions ---

function startTask() {
  const task = inputEl.value.trim();
  if (!task && pendingImages.length === 0) return;

  taskIdCounter++;
  const images = [...pendingImages];
  pendingImages = [];
  renderPreviews();
  inputEl.value = '';
  inputEl.style.height = 'auto';

  chrome.runtime.sendMessage({
    type: 'run_task',
    task: task || 'Analyze these images',
    taskId: taskIdCounter,
    model: modelSelect.value,
    images
  });
}

function stopTask() {
  chrome.runtime.sendMessage({ type: 'stop_task' });
  addMsg('task-end', 'Stopped by user');
  setStatus('', 'Stopped');
  toggleButtons(false);
}

function clearMessages() {
  showWelcome();
  if (currentTabId) conversations[currentTabId] = { html: '' };
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

// --- Code Copy Button Handler ---
function bindCodeCopyButtons() {
  messagesEl.querySelectorAll('.code-block-copy').forEach(btn => {
    if (btn.dataset.bound) return; // Skip already bound buttons
    btn.dataset.bound = 'true';

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

// Watch for new code blocks and bind copy buttons
const codeBlockObserver = new MutationObserver(() => {
  bindCodeCopyButtons();
  // Auto-scroll if enabled
  if (autoScrollEnabled) {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
});

codeBlockObserver.observe(messagesEl, { childList: true, subtree: true });

// --- Helpers ---

function addMsg(type, html) {
  const div = document.createElement('div');
  div.className = `msg ${type}`;
  div.innerHTML = html;
  messagesEl.appendChild(div);
  if (autoScrollEnabled) messagesEl.scrollTop = messagesEl.scrollHeight;
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
  inputEl.disabled = isRunning;
}

function showStatus(text) {
  const statusText = statusEl.querySelector('.status-text');
  if (statusText) statusText.textContent = text;
  setTimeout(() => { if (statusText) statusText.textContent = 'Ready'; }, 2000);
}

// escapeHtml and renderMarkdown now in shared/utils.js
