/**
 * OpenRouter API client — single point of API key usage.
 * Never logs or exposes the API key in responses.
 */

const BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Fetch data from the OpenRouter API.
 * @param {string} endpoint - API endpoint path (e.g., '/models')
 * @param {RequestInit} [options] - Optional fetch options
 * @param {number} [timeoutMs=10000] - Request timeout in milliseconds
 * @returns {Promise<any>} Parsed JSON response
 */
export async function fetchFromOpenRouter(endpoint, options = {}, timeoutMs = 10000) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Please configure it in your .env file.'
    );
  }

  const url = `${BASE_URL}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://openrouterflix.app',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = new Error(
        `OpenRouter API error: ${response.status} ${response.statusText}`
      );
      error.status = response.status;
      try {
        const body = await response.json();
        error.details = body.error?.message || JSON.stringify(body);
      } catch {
        // Response body not JSON — skip details
      }
      throw error;
    }

    return response.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutError = new Error('OpenRouter API request timed out.');
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch the full list of models from OpenRouter.
 * Uses GET /api/v1/models — the primary data source.
 * @returns {Promise<object[]>} Array of raw model objects
 */
export async function fetchModels() {
  const response = await fetchFromOpenRouter('/models');
  return response.data || [];
}

/**
 * Fetch a single model by ID.
 * Reuses fetchModels() internally since OpenRouter may not expose a reliable single-model endpoint.
 * @param {string} id - Model ID (e.g., "openai/gpt-4o")
 * @returns {Promise<object|null>} Raw model object or null if not found
 */
export async function fetchModelById(id) {
  const models = await fetchModels();
  return models.find((m) => m.id === id) || null;
}

/**
 * Send a chat completion request to OpenRouter.
 * Uses POST /api/v1/chat/completions with a longer timeout (60s).
 * @param {object} params
 * @param {string} params.model - Model ID (e.g., "openai/gpt-4o")
 * @param {Array<{role: string, content: string}>} params.messages - Chat messages
 * @param {number} [params.temperature] - Sampling temperature (0–2)
 * @param {number} [params.max_tokens] - Maximum tokens to generate
 * @returns {Promise<object>} OpenRouter chat completion response
 */
export async function fetchChatCompletion({ model, messages, temperature, max_tokens }) {
  const body = {
    model,
    messages,
  };

  if (temperature != null) {
    body.temperature = temperature;
  }
  if (max_tokens != null) {
    body.max_tokens = max_tokens;
  }

  return fetchFromOpenRouter('/chat/completions', {
    method: 'POST',
    body: JSON.stringify(body),
  }, 60000);
}
