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

// --- Init ---
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
  // Static hardcoded welcome — no user input, safe for innerHTML
  const chev = '<svg class="example-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
  const icon = (d) => '<span class="example-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + d + '</svg></span>';
  const btn = (task, ico, label) => '<button class="example-btn" data-task="' + task + '">' + ico + '<span>' + label + '</span>' + chev + '</button>';
  const welcomeHTML = '<div class="welcome">'
    + '<div class="welcome-logo"><span class="welcome-letter">Z</span><div class="welcome-glow"></div></div>'
    + '<h2>What would you like me to do?</h2>'
    + '<p>Navigate, click, type, extract data, debug pages and more.</p>'
    + '<div class="examples">'
    + btn("Abre google.com y busca 'noticias de hoy'", icon('<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>'), 'Search on Google')
    + btn('Toma una captura de pantalla y dime que ves', icon('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>'), 'Analyze current page')
    + btn('Busca en mi historial la ultima pagina de YouTube que visite', icon('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'), 'Search browser history')
    + btn('Lee los errores de la consola de esta pagina y ayudame a corregirlos', icon('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'), 'Debug page errors')
    + btn('Lista todas las pestanas abiertas y dime el titulo de cada una', icon('<rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 7h20M9 3v4"/>'), 'List all open tabs')
    + '</div></div>';
  messagesEl.innerHTML = welcomeHTML; // safe: static content only
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
    case 'task_start':
      removeWelcome();
      addMsg('task', `<div class="label">Task</div>${escapeHtml(msg.text)}`);
      setStatus('running', 'Running...');
      toggleButtons(true);
      break;

    case 'thinking':
      removeThinking();
      addMsg('thinking', 'Thinking...');
      break;

    case 'tool_call':
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

    case 'tool_result':
      const resultStr = typeof msg.result === 'string'
        ? msg.result
        : JSON.stringify(msg.result, null, 2);
      const isErr = resultStr.includes('"error"') || resultStr.includes('Error');
      const truncated = resultStr.substring(0, 1000) + (resultStr.length > 1000 ? '\n...' : '');
      addMsg(`tool-result ${isErr ? 'err' : 'ok'}`, escapeHtml(truncated));
      break;

    case 'final_response':
      removeThinking();
      addMsg('response', `<div class="label">Result</div>${renderMarkdown(msg.text)}`);
      break;

    case 'error':
      removeThinking();
      addMsg('error', escapeHtml(msg.text));
      setStatus('error', 'Error');
      toggleButtons(false);
      break;

    case 'task_end':
      addMsg('task-end', `Task completed`);
      setStatus('', 'Ready');
      toggleButtons(false);
      break;

    case 'incoming_task':
      inputEl.value = msg.text;
      startTask();
      break;

    // --- ask_user: Agent needs human input ---
    case 'ask_user':
      removeThinking();
      addMsg('ask-user',
        `<div class="label">&#128100; Agent asks</div>
         <p>${escapeHtml(msg.question)}</p>
         <div class="ask-user-input">
           <input type="text" id="askUserInput" placeholder="Your response..." />
           <button id="askUserBtn">Send</button>
         </div>`
      );
      const askInput = document.getElementById('askUserInput');
      const askBtn = document.getElementById('askUserBtn');
      const sendResponse = () => {
        const val = askInput.value.trim();
        if (val) {
          chrome.runtime.sendMessage({ type: 'user_response', text: val });
          addMsg('tool-result ok', escapeHtml(val));
          askInput.disabled = true;
          askBtn.disabled = true;
        }
      };
      askBtn.addEventListener('click', sendResponse);
      askInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendResponse();
      });
      askInput.focus();
      break;

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
  if (!task) return;

  taskIdCounter++;
  inputEl.value = '';
  inputEl.style.height = 'auto';

  chrome.runtime.sendMessage({
    type: 'run_task',
    task,
    taskId: taskIdCounter,
    model: modelSelect.value
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

// --- Helpers ---

function addMsg(type, html) {
  const div = document.createElement('div');
  div.className = `msg ${type}`;
  div.innerHTML = html;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
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

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  return String(text).replace(/[&<>"]/g, c => map[c]);
}

function renderMarkdown(text) {
  let html = escapeHtml(text);

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code>${code.trim()}</code></pre>`);

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  return html;
}
