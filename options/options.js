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

// Load saved settings
chrome.storage.local.get(["authToken", "apiEndpoint", "modelName", "systemPrompt"], (data) => {
  authTokenInput.value = data.authToken || "";
  apiEndpointInput.value = data.apiEndpoint || DEFAULTS.apiEndpoint;
  modelNameSelect.value = data.modelName || DEFAULTS.modelName;
  systemPromptInput.value = data.systemPrompt || "";
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
  showStatus("Guardado!", true);
});

testBtn.addEventListener("click", async () => {
  const authToken = authTokenInput.value.trim();
  const endpoint = apiEndpointInput.value.trim() || DEFAULTS.apiEndpoint;
  const model = modelNameSelect.value;

  if (!authToken) {
    showStatus("Ingresa tu Auth Token", false);
    return;
  }

  testBtn.disabled = true;
  testBtn.textContent = "Probando...";

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
        messages: [{ role: "user", content: "Responde solo: OK" }]
      })
    });

    if (res.ok) {
      showStatus("Conexion exitosa!", true);
    } else {
      const err = await res.text();
      showStatus(`Error ${res.status}: ${err.substring(0, 100)}`, false);
    }
  } catch (e) {
    showStatus("Error de red: " + e.message, false);
  }

  testBtn.disabled = false;
  testBtn.textContent = "Probar conexion";
});
