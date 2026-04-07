const authTokenInput = document.getElementById("authToken");
const apiEndpointInput = document.getElementById("apiEndpoint");
const modelNameSelect = document.getElementById("modelName");
const systemPromptInput = document.getElementById("systemPrompt");
const saveBtn = document.getElementById("saveBtn");
const testBtn = document.getElementById("testBtn");
const statusEl = document.getElementById("status");

const DEFAULTS = {
  apiEndpoint: "https://api.z.ai/api/anthropic/v1/messages",
  modelName: "glm-5.1"
};

const alertBanner = document.getElementById("alertBanner");

// Load saved settings
chrome.storage.local.get(["authToken", "apiEndpoint", "modelName", "systemPrompt"], (data) => {
  authTokenInput.value = data.authToken || "";
  apiEndpointInput.value = data.apiEndpoint || DEFAULTS.apiEndpoint;
  modelNameSelect.value = data.modelName || DEFAULTS.modelName;
  systemPromptInput.value = data.systemPrompt || "";
  // Show warning if no API key
  if (!data.authToken) alertBanner.style.display = "flex";
});

// Hide banner as soon as user types a key
authTokenInput.addEventListener('input', () => {
  if (authTokenInput.value.trim()) alertBanner.style.display = "none";
});

function showStatus(msg, ok) {
  statusEl.textContent = msg;
  statusEl.className = "status " + (ok ? "ok" : "err");
  setTimeout(() => { statusEl.textContent = ""; statusEl.className = "status"; }, 4000);
}

saveBtn.addEventListener("click", () => {
  chrome.storage.local.set({
    authToken: authTokenInput.value.trim(),
    apiEndpoint: apiEndpointInput.value.trim() || DEFAULTS.apiEndpoint,
    modelName: modelNameSelect.value,
    systemPrompt: systemPromptInput.value.trim()
  });
  showStatus("Saved!", true);
  if (authTokenInput.value.trim()) alertBanner.style.display = "none";
});

testBtn.addEventListener("click", async () => {
  const authToken = authTokenInput.value.trim();
  const endpoint = apiEndpointInput.value.trim() || DEFAULTS.apiEndpoint;
  const model = modelNameSelect.value;

  if (!authToken) {
    showStatus("Enter your Z.AI API Key", false);
    return;
  }

  testBtn.disabled = true;
  testBtn.textContent = "Testing...";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": authToken,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: 20,
        messages: [{ role: "user", content: "Reply only: OK" }]
      })
    });

    if (res.ok) {
      showStatus("Connection successful!", true);
      alertBanner.style.display = "none";
    } else {
      const err = await res.text();
      showStatus(`Error ${res.status}: ${err.substring(0, 100)}`, false);
    }
  } catch (e) {
    showStatus("Network error: " + e.message, false);
  }

  testBtn.disabled = false;
  testBtn.textContent = "Test connection";
});

// --- SCHEDULED TASKS ---

const schedTaskInput = document.getElementById("schedTaskInput");
const schedIntervalSelect = document.getElementById("schedIntervalSelect");
const addSchedBtn = document.getElementById("addSchedBtn");
const schedListEl = document.getElementById("schedListOptions");
const improveBtn = document.getElementById("improvePromptBtn");

function formatInterval(min) {
  if (min < 60) return min + " min";
  if (min < 1440) return (min / 60) + " hr";
  return (min / 1440) + " day";
}

function loadScheduledTasks() {
  chrome.runtime.sendMessage({ type: "get_scheduled" }, (res) => {
    const tasks = res?.tasks || [];
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
      date.textContent = new Date(t.createdAt).toLocaleDateString();
      meta.appendChild(badge);
      meta.appendChild(date);

      const actions = document.createElement("div");
      actions.className = "sched-item-actions";

      const run = document.createElement("button");
      run.className = "sched-item-run";
      run.textContent = "Run now";
      run.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "run_task", task: t.task, taskId: Date.now(), model: null });
        run.textContent = "Running...";
        run.disabled = true;
        setTimeout(() => { run.textContent = "Run now"; run.disabled = false; }, 3000);
      });

      const del = document.createElement("button");
      del.className = "sched-item-delete";
      del.textContent = "Delete";
      del.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "remove_scheduled", index: i });
        setTimeout(loadScheduledTasks, 200);
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
  const minutes = parseInt(schedIntervalSelect.value);
  chrome.runtime.sendMessage({ type: "schedule_task", task, cronMinutes: minutes });
  schedTaskInput.value = "";
  setTimeout(loadScheduledTasks, 300);
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
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": authToken,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [{ role: "user", content: `Improve this browser automation task prompt. Fix spelling, grammar, make it clearer and more precise for an AI agent. Return ONLY the improved prompt, nothing else:\n\n${text}` }]
      })
    });
    if (res.ok) {
      const data = await res.json();
      const improved = data.content?.find(b => b.type === "text")?.text || text;
      schedTaskInput.value = improved.trim();
    } else {
      showStatus("Could not improve prompt", false);
    }
  } catch (e) {
    showStatus("Error: " + e.message, false);
  }

  improveBtn.disabled = false;
  improveBtn.textContent = "Improve";
});

// Load tasks on page open
loadScheduledTasks();
