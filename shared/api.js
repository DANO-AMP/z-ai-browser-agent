// BrowserAgent AI - Shared API Functions
// API-related functions used across the extension

/**
 * Improve a browser automation task prompt using AI
 * Fixes spelling, grammar, and makes prompts clearer for AI agents
 * @param {string} endpoint - API endpoint URL
 * @param {string} authToken - API authentication key
 * @param {string} model - Model name to use
 * @param {string} text - Original prompt text to improve
 * @returns {Promise<string>} Improved prompt text
 * @throws {Error} If API call fails
 */
async function improvePrompt(endpoint, authToken, model, text, provider = 'zai') {
  const providers = (typeof globalThis !== 'undefined' ? globalThis : self).ZAIProviders;
  const systemPrompt = 'Improve the user\'s browser automation task prompt. Fix spelling, grammar, and clarity for an AI agent. Return ONLY the improved prompt text, no explanation or extra words.';
  const messages = [{ role: 'user', content: text }];

  let headers, bodyObj;
  if (providers) {
    const req = providers.buildProviderRequest(provider, authToken, model, systemPrompt, messages, []);
    headers = req.headers;
    bodyObj = JSON.parse(req.body);
  } else {
    // Fallback: Anthropic format
    headers = { 'Content-Type': 'application/json', 'x-api-key': authToken, 'anthropic-version': '2023-06-01' };
    bodyObj = { model, system: systemPrompt, messages };
  }
  bodyObj.max_tokens = 300;

  const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(bodyObj) });
  if (!res.ok) {
    const errBody = (await res.text()).substring(0, 300);
    throw new Error(`API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  const normalized = providers ? providers.normalizeResponse(provider, data) : data;
  const improved = normalized.content?.find(b => b.type === 'text')?.text || text;
  return improved.trim();
}

// Export — works in both browser pages (window) and service worker (importScripts)
const _globalObj = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : self);
_globalObj.improvePrompt = improvePrompt;
