// Z AI Browser Agent — Provider Adapter Layer
// Supports: Z.AI (GLM), Anthropic, OpenAI, OpenRouter, Ollama
// Runs in service worker (importScripts) and browser pages (<script>)

const PROVIDER_CONFIGS = {
  zai: {
    name: 'Z.AI (GLM)',
    defaultEndpoint: 'https://api.z.ai/api/anthropic/v1/messages',
    format: 'anthropic',
    defaultModels: ['glm-5.1', 'glm-5-turbo', 'glm-5', 'glm-4.5', 'glm-4.5-flash', 'glm-4.5-air'],
    requiresKey: true,
    hint: 'Get your key from z.ai/dashboard → GLM Coding Plan'
  },
  anthropic: {
    name: 'Anthropic',
    defaultEndpoint: 'https://api.anthropic.com/v1/messages',
    format: 'anthropic',
    defaultModels: ['claude-opus-4-5-20251101', 'claude-sonnet-4-5-20251022', 'claude-haiku-4-5-20251001', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
    requiresKey: true,
    hint: 'Get your key from console.anthropic.com'
  },
  openai: {
    name: 'OpenAI',
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
    format: 'openai',
    defaultModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini', 'o3-mini'],
    requiresKey: true,
    hint: 'Get your key from platform.openai.com/api-keys'
  },
  openrouter: {
    name: 'OpenRouter',
    defaultEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    format: 'openai',
    defaultModels: [
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'google/gemini-pro-1.5',
      'meta-llama/llama-3.1-70b-instruct',
      'mistralai/mistral-large'
    ],
    requiresKey: true,
    hint: 'Get your key from openrouter.ai/keys',
    extraHeaders: {
      'HTTP-Referer': 'https://github.com/DANO-AMP/browser-agent-ai',
      'X-Title': 'BrowserAgent AI'
    }
  },
  ollama: {
    name: 'Ollama (local)',
    defaultEndpoint: 'http://localhost:11434/v1/chat/completions',
    format: 'openai',
    defaultModels: ['llama3.2', 'llama3.1', 'mistral', 'codellama', 'qwen2.5', 'phi3', 'gemma2'],
    requiresKey: false,
    hint: 'Ollama must be running with: OLLAMA_ORIGINS="chrome-extension://*" ollama serve — then enable Developer mode to allow localhost.'
  }
};

// Build fetch headers + body for a provider
// Returns { headers, body } ready for fetch
function buildProviderRequest(provider, authToken, model, systemPrompt, messages, tools) {
  const cfg = PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS.zai;
  const headers = { 'Content-Type': 'application/json' };

  if (cfg.format === 'anthropic') {
    if (authToken) headers['x-api-key'] = authToken;
    headers['anthropic-version'] = '2023-06-01';
    return {
      headers,
      body: JSON.stringify({ model, max_tokens: 4096, system: systemPrompt || '', messages, tools })
    };
  }

  // OpenAI-compatible format
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  } else if (provider === 'ollama') {
    headers['Authorization'] = 'Bearer ollama'; // Ollama accepts dummy key
  }
  if (cfg.extraHeaders) Object.assign(headers, cfg.extraHeaders);

  const oaiMessages = convertMessagesToOpenAI(messages, systemPrompt);
  const oaiTools = tools && tools.length ? convertToolsToOpenAI(tools) : undefined;
  const bodyObj = { model, max_tokens: 4096, messages: oaiMessages };
  if (oaiTools) bodyObj.tools = oaiTools;

  return { headers, body: JSON.stringify(bodyObj) };
}

// Normalize any provider response to internal Anthropic format:
// { content: [{type:'text'|'tool_use', ...}], stop_reason: 'end_turn'|'tool_use' }
function normalizeResponse(provider, data) {
  const cfg = PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS.zai;
  if (cfg.format === 'anthropic') return data; // already correct

  // OpenAI format
  const choice = data.choices && data.choices[0];
  if (!choice) throw new Error('No choices in API response');

  const msg = choice.message || {};
  const content = [];

  if (msg.content) content.push({ type: 'text', text: msg.content });

  if (Array.isArray(msg.tool_calls)) {
    for (const tc of msg.tool_calls) {
      let input = {};
      try { input = JSON.parse(tc.function.arguments || '{}'); } catch { input = {}; }
      content.push({
        type: 'tool_use',
        id: tc.id,
        name: tc.function.name,
        input
      });
    }
  }

  const stopReason = choice.finish_reason === 'tool_calls' ? 'tool_use' : 'end_turn';
  return { content, stop_reason: stopReason };
}

// Convert internal Anthropic-format messages to OpenAI messages array
// Inserts system prompt as first message, converts tool_use/tool_result blocks
function convertMessagesToOpenAI(messages, systemPrompt) {
  const result = [];
  if (systemPrompt) result.push({ role: 'system', content: systemPrompt });

  for (const msg of messages) {
    if (msg.role === 'user') {
      if (typeof msg.content === 'string') {
        result.push({ role: 'user', content: msg.content });
        continue;
      }
      if (!Array.isArray(msg.content)) continue;

      const textBlocks = msg.content.filter(b => b.type === 'text');
      const toolResults = msg.content.filter(b => b.type === 'tool_result');
      const imageBlocks = msg.content.filter(b => b.type === 'image');

      if (textBlocks.length > 0 || imageBlocks.length > 0) {
        // Build OpenAI content array if images present, else plain string
        if (imageBlocks.length > 0) {
          const oaiContent = [];
          for (const b of textBlocks) oaiContent.push({ type: 'text', text: b.text });
          for (const b of imageBlocks) {
            if (b.source?.type === 'base64') {
              oaiContent.push({ type: 'image_url', image_url: { url: `data:${b.source.media_type};base64,${b.source.data}` } });
            }
          }
          result.push({ role: 'user', content: oaiContent });
        } else {
          result.push({ role: 'user', content: textBlocks.map(b => b.text).join('\n') });
        }
      }

      // Each tool_result becomes a separate tool message
      for (const tr of toolResults) {
        const content = typeof tr.content === 'string'
          ? tr.content
          : (Array.isArray(tr.content) ? tr.content.map(b => b.text || '').join('\n') : JSON.stringify(tr.content));
        result.push({ role: 'tool', tool_call_id: tr.tool_use_id, content });
      }

    } else if (msg.role === 'assistant') {
      if (typeof msg.content === 'string') {
        result.push({ role: 'assistant', content: msg.content });
        continue;
      }
      if (!Array.isArray(msg.content)) continue;

      const textBlocks = msg.content.filter(b => b.type === 'text');
      const toolUseBlocks = msg.content.filter(b => b.type === 'tool_use');

      const assistantMsg = {
        role: 'assistant',
        content: textBlocks.length > 0 ? textBlocks.map(b => b.text).join('\n') : null
      };
      if (toolUseBlocks.length > 0) {
        assistantMsg.tool_calls = toolUseBlocks.map(b => ({
          id: b.id,
          type: 'function',
          function: { name: b.name, arguments: JSON.stringify(b.input || {}) }
        }));
      }
      result.push(assistantMsg);
    }
  }

  return result;
}

// Convert Anthropic-format tools to OpenAI function tools
function convertToolsToOpenAI(tools) {
  return tools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema || { type: 'object', properties: {} }
    }
  }));
}

// Export to globalThis so both SW (importScripts) and page (<script>) can use it
const _globalObj = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : self);
_globalObj.ZAIProviders = {
  PROVIDER_CONFIGS,
  buildProviderRequest,
  normalizeResponse,
  convertMessagesToOpenAI,
  convertToolsToOpenAI
};
