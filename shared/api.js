// Z AI Browser Agent - Shared API Functions
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
async function improvePrompt(endpoint, authToken, model, text) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': authToken,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Improve this browser automation task prompt. Fix spelling, grammar, make it clearer and more precise for an AI agent. Return ONLY the improved prompt, nothing else:\n\n${text}`
      }]
    })
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const improved = data.content?.find(b => b.type === 'text')?.text || text;

  return improved.trim();
}

// Export — works in both browser pages (window) and service worker (importScripts)
if (typeof window !== 'undefined') {
  window.improvePrompt = improvePrompt;
}
