/**
 * OpenRouter API client — single point of API key usage.
 * Never logs or exposes the API key in responses.
 */

const BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Fetch data from the OpenRouter API.
 * @param {string} endpoint - API endpoint path (e.g., '/models')
 * @param {RequestInit} [options] - Optional fetch options
 * @returns {Promise<any>} Parsed JSON response
 */
export async function fetchFromOpenRouter(endpoint, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Please configure it in your .env file.'
    );
  }

  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
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
}
