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
