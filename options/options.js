const authTokenInput = document.getElementById("authToken");
const apiEndpointInput = document.getElementById("apiEndpoint");
const modelNameSelect = document.getElementById("modelName");
const systemPromptInput = document.getElementById("systemPrompt");
const soundEnabledInput = document.getElementById("soundEnabled");
const devModeInput = document.getElementById("devMode");
const saveBtn = document.getElementById("saveBtn");
const testBtn = document.getElementById("testBtn");
const statusEl = document.getElementById("status");
const providerSelect = document.getElementById('providerSelect');

const DEFAULTS = {
  provider: 'zai',
  apiEndpoint: '',
  modelName: 'glm-5.1'
};

const PROVIDER_GUIDES = {
  zai:        { title: 'How to get your API Key', steps: ['Visit z.ai/dashboard', 'Open GLM Coding Plan', 'Copy your API Key', 'Paste above & Save'] },
  anthropic:  { title: 'How to get your API Key', steps: ['Visit console.anthropic.com', 'Go to API Keys', 'Click Create new key', 'Paste above & Save'] },
  openai:     { title: 'How to get your API Key', steps: ['Visit platform.openai.com', 'Go to API Keys', 'Click Create new key', 'Paste above & Save'] },
  openrouter: { title: 'How to get your API Key', steps: ['Visit openrouter.ai/keys', 'Click Create Key', 'Copy the key', 'Paste above & Save'] },
  ollama:     { title: 'How to set up Ollama', steps: ['Install from ollama.com', 'Launch: OLLAMA_ORIGINS="chrome-extension://*" ollama serve', 'Enable Developer Mode below', 'Select a model & Save'] }
};

function updateProviderUI(provider) {
  const cfg = (window.ZAIProviders?.PROVIDER_CONFIGS || {})[provider] || {};

  // Update model options
  const currentVal = modelNameSelect.value;
  const models = cfg.defaultModels || ['glm-5.1'];
  modelNameSelect.textContent = '';
  models.forEach((m, i) => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = i === 0 ? m + ' — Recommended' : m;
    modelNameSelect.appendChild(opt);
  });
  if (models.includes(currentVal)) modelNameSelect.value = currentVal;

  // Update API key label and hint
  const apiKeyLabel = document.getElementById('apiKeyLabel');
  if (apiKeyLabel) apiKeyLabel.textContent = cfg.requiresKey === false ? 'API Key (not required)' : 'API Key';
  const hintEl = document.getElementById('apiKeyHint');
  if (hintEl && cfg.hint) hintEl.textContent = cfg.hint;

  // Dim API key field for providers that don't need one
  const keyField = authTokenInput.closest('.field');
  if (keyField) keyField.style.opacity = cfg.requiresKey === false ? '0.5' : '1';

  // Hide alert banner if no key required
  if (cfg.requiresKey === false) alertBanner.style.display = 'none';

  // Auto-fill endpoint when switching providers (if empty or matches a known default)
  const currentEndpoint = apiEndpointInput.value.trim();
  const knownDefaults = Object.values(window.ZAIProviders?.PROVIDER_CONFIGS || {}).map(c => c.defaultEndpoint);
  if (!currentEndpoint || knownDefaults.includes(currentEndpoint)) {
    apiEndpointInput.value = cfg.defaultEndpoint || '';
  }

  // Update endpoint hint
  const endpointHintEl = document.getElementById('endpointHint');
  if (endpointHintEl) {
    endpointHintEl.textContent = cfg.defaultEndpoint
      ? 'Default for this provider. Edit to use a custom or self-hosted endpoint.'
      : 'Enter the endpoint URL for your self-hosted instance.';
  }

  // Update provider setup guide
  const guide = PROVIDER_GUIDES[provider] || PROVIDER_GUIDES.zai;
  const guideTitle = document.getElementById('guideCardTitle');
  if (guideTitle) guideTitle.textContent = guide.title;
  ['guideStep1', 'guideStep2', 'guideStep3', 'guideStep4'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.textContent = guide.steps[i] || '';
  });
}

const alertBanner = document.getElementById("alertBanner");

// Load saved settings
chrome.storage.local.get(["authToken", "apiEndpoint", "modelName", "systemPrompt", "soundEnabled", "devMode", "provider"], (data) => {
  authTokenInput.value = data.authToken || "";
  systemPromptInput.value = data.systemPrompt || "";
  soundEnabledInput.checked = data.soundEnabled !== false; // Default is enabled
  devModeInput.checked = data.devMode || false;
  const savedProvider = data.provider || DEFAULTS.provider;
  if (providerSelect) providerSelect.value = savedProvider;
  updateProviderUI(savedProvider);
  // Restore saved model and endpoint after updateProviderUI populates defaults
  if (data.modelName) modelNameSelect.value = data.modelName;
  if (data.apiEndpoint) apiEndpointInput.value = data.apiEndpoint;
  // Show warning if no API key
  if (!data.authToken) alertBanner.style.display = "flex";
});

// Hide banner as soon as user types a key
authTokenInput.addEventListener('input', () => {
  if (authTokenInput.value.trim()) alertBanner.style.display = "none";
});

if (providerSelect) {
  providerSelect.addEventListener('change', () => {
    updateProviderUI(providerSelect.value);
  });
}

function showStatus(msg, ok) {
  statusEl.textContent = msg;
  statusEl.className = "status " + (ok ? "ok" : "err");
  setTimeout(() => { statusEl.textContent = ""; statusEl.className = "status"; }, 4000);
}

saveBtn.addEventListener("click", () => {
  const currentProvider = providerSelect?.value || 'zai';
  const providerCfgSave = (window.ZAIProviders?.PROVIDER_CONFIGS || {})[currentProvider] || {};
  const rawEndpoint = apiEndpointInput.value.trim() || providerCfgSave.defaultEndpoint || '';
  try {
    const parsed = new URL(rawEndpoint);
    const isLocal = currentProvider === 'ollama' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (!isLocal && (parsed.protocol !== 'https:' || !isUrlSafe(rawEndpoint))) {
      showStatus('Invalid API endpoint: must be an https:// URL', false);
      return;
    }
  } catch {
    showStatus('Invalid API endpoint URL', false);
    return;
  }
  chrome.storage.local.set({
    provider: currentProvider,
    authToken: authTokenInput.value.trim(),
    apiEndpoint: rawEndpoint,
    modelName: modelNameSelect.value,
    systemPrompt: systemPromptInput.value.trim(),
    soundEnabled: soundEnabledInput.checked,
    devMode: devModeInput.checked
  }, () => {
    if (chrome.runtime.lastError) {
      showStatus('Save failed: ' + chrome.runtime.lastError.message, false);
      return;
    }
    showStatus('Saved!', true);
    if (authTokenInput.value.trim()) alertBanner.style.display = 'none';
  });
});

testBtn.addEventListener("click", async () => {
  const authToken = authTokenInput.value.trim();
  const provider = providerSelect?.value || 'zai';
  const providerCfg = (window.ZAIProviders?.PROVIDER_CONFIGS || {})[provider] || {};
  const endpoint = apiEndpointInput.value.trim() || providerCfg.defaultEndpoint || '';
  const model = modelNameSelect.value;

  if (!authToken && providerCfg.requiresKey !== false) {
    showStatus("Enter your API Key", false);
    return;
  }

  testBtn.disabled = true;
  testBtn.textContent = "Testing...";

  try {
    const parsed = new URL(endpoint);
    const isLocal = provider === 'ollama' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (!isLocal && (parsed.protocol !== 'https:' || !isUrlSafe(endpoint))) {
      showStatus('Invalid endpoint URL', false);
      testBtn.disabled = false;
      testBtn.textContent = 'Test connection';
      return;
    }
  } catch {
    showStatus('Invalid endpoint URL', false);
    testBtn.disabled = false;
    testBtn.textContent = 'Test connection';
    return;
  }

  const isOpenAIFormat = provider === 'openai' || provider === 'openrouter' || provider === 'ollama';
  const testHeaders = { 'Content-Type': 'application/json' };
  if (isOpenAIFormat) {
    testHeaders['Authorization'] = `Bearer ${authToken || 'ollama'}`;
  } else {
    testHeaders['x-api-key'] = authToken;
    testHeaders['anthropic-version'] = '2023-06-01';
  }
  const testBody = isOpenAIFormat
    ? { model, max_tokens: 1, messages: [{ role: 'system', content: 'ping' }] }
    : { model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: testHeaders,
      body: JSON.stringify(testBody)
    });

    if (res.ok) {
      showStatus("Connection successful!", true);
      alertBanner.style.display = "none";
    } else {
      let errBody = '';
      try { errBody = (await res.text()).substring(0, 80); } catch (_) {}
      showStatus(`Error ${res.status}: ${errBody}`, false);
    }
  } catch (e) {
    showStatus("Network error: " + e.message, false);
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = "Test connection";
  }
});

// --- SCHEDULED TASKS ---

const schedTaskInput = document.getElementById("schedTaskInput");
const schedIntervalSelect = document.getElementById("schedIntervalSelect");
const addSchedBtn = document.getElementById("addSchedBtn");
const schedListEl = document.getElementById("schedListOptions");
const improveBtn = document.getElementById("improvePromptBtn");

// formatInterval now in shared/utils.js

function loadScheduledTasks() {
  chrome.runtime.sendMessage({ type: "get_scheduled" }, (res) => {
    if (chrome.runtime.lastError || !res) {
      schedListEl.textContent = "";
      const empty = document.createElement("div");
      empty.className = "sched-empty";
      empty.textContent = "Could not load tasks — service worker may be starting";
      schedListEl.appendChild(empty);
      return;
    }
    const tasks = res.tasks || [];
    schedListEl.textContent = "";
    if (tasks.length === 0) {
      const empty = document.createElement("div");
      empty.className = "sched-empty";
      empty.textContent = "No scheduled tasks";
      schedListEl.appendChild(empty);
      return;
    }
    tasks.forEach((t, i) => {
      const item = document.createElement("div");
      item.className = "sched-item";

      const taskText = document.createElement("div");
      taskText.className = "sched-item-task";
      taskText.textContent = t.task;

      const footer = document.createElement("div");
      footer.className = "sched-item-footer";

      const meta = document.createElement("div");
      meta.className = "sched-item-meta";
      const badge = document.createElement("span");
      badge.className = "sched-badge";
      badge.textContent = formatInterval(t.intervalMinutes);
      const date = document.createElement("span");
      date.textContent = t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—';
      meta.appendChild(badge);
      meta.appendChild(date);

      const actions = document.createElement("div");
      actions.className = "sched-item-actions";

      const run = document.createElement("button");
      run.className = "sched-item-run";
      run.textContent = "Run now";
      run.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "run_task", task: t.task, taskId: Date.now(), model: null }, (res) => {
          if (res?.success) {
            run.textContent = "Running...";
            run.disabled = true;
            setTimeout(() => { run.textContent = "Run now"; run.disabled = false; }, 10000);
          } else {
            const errMsg = typeof res?.error === 'string' ? res.error.substring(0, 120) : 'Could not start task';
            showStatus(errMsg, false);
          }
        });
      });

      const del = document.createElement("button");
      del.className = "sched-item-delete";
      del.textContent = "Delete";
      del.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "remove_scheduled", alarmName: t.alarmName, index: i }, () => {
          loadScheduledTasks();
        });
      });

      actions.appendChild(run);
      actions.appendChild(del);
      footer.appendChild(meta);
      footer.appendChild(actions);
      item.appendChild(taskText);
      item.appendChild(footer);
      schedListEl.appendChild(item);
    });
  });
}

addSchedBtn.addEventListener("click", () => {
  const task = schedTaskInput.value.trim();
  if (!task) return;
  const minutes = parseInt(schedIntervalSelect.value, 10);
  if (!Number.isFinite(minutes) || minutes < 1) {
    showStatus('Invalid interval', false);
    return;
  }
  chrome.runtime.sendMessage({ type: "schedule_task", task, cronMinutes: minutes }, () => {
    schedTaskInput.value = "";
    loadScheduledTasks();
  });
});

// --- IMPROVE PROMPT (AI-powered) ---

improveBtn.addEventListener("click", async () => {
  const text = schedTaskInput.value.trim();
  if (!text) return;
  const authToken = authTokenInput.value.trim();
  const endpoint = apiEndpointInput.value.trim() || DEFAULTS.apiEndpoint;
  const model = modelNameSelect.value;
  if (!authToken) { showStatus("Add your API key first", false); return; }

  improveBtn.disabled = true;
  improveBtn.textContent = "Improving...";

  try {
    const improved = await improvePrompt(endpoint, authToken, model, text, providerSelect?.value || 'zai');
    schedTaskInput.value = improved;
  } catch (e) {
    showStatus('Error: ' + (e.message || 'Unknown error').substring(0, 120), false);
  }

  improveBtn.disabled = false;
  improveBtn.textContent = "Improve";
});

// Load tasks on page open
loadScheduledTasks();

// --- TASK HISTORY ---

const historyListOptions = document.getElementById('historyListOptions');
const clearHistoryOptionsBtn = document.getElementById('clearHistoryOptionsBtn');

function loadTaskHistory() {
  chrome.storage.local.get(['taskHistory'], (data) => {
    const history = data.taskHistory || [];
    historyListOptions.textContent = '';
    if (history.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = 'No task history yet';
      historyListOptions.appendChild(empty);
      return;
    }
    history.slice(0, 20).forEach((item) => {
      const div = document.createElement('div');
      div.className = 'sched-item';

      const taskText = document.createElement('div');
      taskText.className = 'sched-item-task';
      taskText.textContent = item.task;

      const footer = document.createElement('div');
      footer.className = 'sched-item-footer';

      const meta = document.createElement('div');
      meta.className = 'sched-item-meta';
      const date = document.createElement('span');
      date.textContent = item.timestamp ? new Date(item.timestamp).toLocaleString() : '—';
      meta.appendChild(date);

      div.appendChild(taskText);
      if (item.result) {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'history-item-result';
        resultDiv.style.cssText = 'font-size:11px;color:var(--text-muted);margin-top:4px;padding-top:4px;border-top:1px solid var(--border-subtle);';
        resultDiv.textContent = item.result.substring(0, 200) + (item.result.length > 200 ? '...' : '');
        div.appendChild(resultDiv);
      }
      div.appendChild(meta);
      historyListOptions.appendChild(div);
    });
  });
}

clearHistoryOptionsBtn.addEventListener('click', () => {
  if (confirm('Clear all task history?')) {
    chrome.storage.local.set({ taskHistory: [] }, () => {
      if (chrome.runtime.lastError) { console.warn('[BrowserAgent AI] clearHistory failed:', chrome.runtime.lastError.message); return; }
      loadTaskHistory();
    });
  }
});

// Load history on page open
loadTaskHistory();

// --- TASK TEMPLATES ---

const templateTaskInput = document.getElementById('templateTaskInput');
const templateNameInput = document.getElementById('templateNameInput');
const addTemplateBtn = document.getElementById('addTemplateBtn');
const templateListOptions = document.getElementById('templateListOptions');

addTemplateBtn.addEventListener('click', () => {
  const task = templateTaskInput.value.trim();
  const name = templateNameInput.value.trim() || task.substring(0, 30);
  if (!task) return;

  chrome.storage.local.get(['taskTemplates'], (data) => {
    const templates = data.taskTemplates || [];
    templates.unshift({ name, task, createdAt: Date.now() });
    if (templates.length > 50) templates.pop();
    chrome.storage.local.set({ taskTemplates: templates });
    templateTaskInput.value = '';
    templateNameInput.value = '';
    showStatus('Template saved!', true);
    loadTemplates();
  });
});

function loadTemplates() {
  chrome.storage.local.get(['taskTemplates'], (data) => {
    const templates = data.taskTemplates || [];
    templateListOptions.textContent = '';
    if (templates.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'sched-empty';
      empty.textContent = 'No templates yet';
      templateListOptions.appendChild(empty);
      return;
    }
    templates.forEach((tmpl, index) => {
      const item = document.createElement('div');
      item.className = 'sched-item';

      const nameDiv = document.createElement('div');
      nameDiv.className = 'sched-item-task';
      nameDiv.textContent = tmpl.name;

      const taskDiv = document.createElement('div');
      taskDiv.style.cssText = 'font-size:11px;color:var(--text-muted);margin-top:2px;line-height:1.4;';
      taskDiv.textContent = tmpl.task;

      const footer = document.createElement('div');
      footer.className = 'sched-item-footer';

      const meta = document.createElement('div');
      meta.className = 'sched-item-meta';
      const date = document.createElement('span');
      date.textContent = tmpl.createdAt ? new Date(tmpl.createdAt).toLocaleDateString() : '—';
      meta.appendChild(date);

      const actions = document.createElement('div');
      actions.className = 'sched-item-actions';

      const run = document.createElement('button');
      run.className = 'sched-item-run';
      run.textContent = 'Run now';
      run.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'run_task', task: tmpl.task, taskId: Date.now(), model: null }, (res) => {
          if (res?.success) {
            run.textContent = 'Running...';
            run.disabled = true;
            setTimeout(() => { run.textContent = 'Run now'; run.disabled = false; }, 10000);
          } else {
            const errMsg = typeof res?.error === 'string' ? res.error.substring(0, 120) : 'Could not start task';
            showStatus(errMsg, false);
          }
        });
      });

      const del = document.createElement('button');
      del.className = 'sched-item-delete';
      del.textContent = 'Delete';
      del.addEventListener('click', () => {
        if (confirm('Delete this template?')) {
          chrome.storage.local.get(['taskTemplates'], (data) => {
            const templates = data.taskTemplates || [];
            templates.splice(index, 1);
            chrome.storage.local.set({ taskTemplates: templates });
            loadTemplates();
          });
        }
      });

      actions.appendChild(run);
      actions.appendChild(del);
      footer.appendChild(meta);
      footer.appendChild(actions);
      item.appendChild(nameDiv);
      item.appendChild(taskDiv);
      item.appendChild(footer);
      templateListOptions.appendChild(item);
    });
  });
}

// Load templates on page open
loadTemplates();

// --- UPDATE BANNER ---
const updateBannerEl = document.getElementById('updateBanner');
const updateTextEl = document.getElementById('updateText');
const updateLinkEl = document.getElementById('updateLink');
const updateDismissEl = document.getElementById('updateDismiss');

function showUpdateBanner(info) {
  if (!info || !info.updateAvailable) return;
  if (info.dismissed && info.dismissedVersion === info.latestVersion) return;
  updateTextEl.textContent = `v${info.latestVersion} available (you have v${info.currentVersion})`;
  updateBannerEl.classList.remove('hidden');
}

updateLinkEl.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'download_update' }, (res) => {
    if (chrome.runtime.lastError || !res?.success) {
      showStatus('Could not start download', false);
    }
  });
});

updateDismissEl.addEventListener('click', () => {
  updateBannerEl.classList.add('hidden');
  chrome.runtime.sendMessage({ type: 'dismiss_update' });
});

// Check for updates on page open
chrome.runtime.sendMessage({ type: 'get_update_info' }, function(info) {
  if (chrome.runtime.lastError || !info) return;
  showUpdateBanner(info);
});
