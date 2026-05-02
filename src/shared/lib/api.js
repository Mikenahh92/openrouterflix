/**
 * Centralized API client for OpenRouterFlix.
 * All backend communication goes through this module.
 */

export const API_BASE_URL = 'http://localhost:3001/api';

/** Optional request/response interceptor hooks */
let requestInterceptor = null;
let responseInterceptor = null;

/**
 * Register a request interceptor.
 * Called with (url, options) before each request.
 * Must return { url, options } or a Promise resolving to same.
 */
export function setRequestInterceptor(fn) {
  requestInterceptor = fn;
}

/**
 * Register a response interceptor.
 * Called with (response) after each fetch resolves.
 * Must return the response (or a modified one).
 */
export function setResponseInterceptor(fn) {
  responseInterceptor = fn;
}

/**
 * Build the full request URL and default options.
 */
function buildRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  return { url, options: { ...options, headers } };
}

/**
 * Core request function. Handles fetch, JSON parsing, and error normalisation.
 */
async function request(path, options = {}) {
  let { url, options: fetchOptions } = buildRequest(path, options);

  // Apply request interceptor if registered
  if (requestInterceptor) {
    const intercepted = await requestInterceptor(url, fetchOptions);
    url = intercepted.url;
    fetchOptions = intercepted.options;
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (networkError) {
    throw {
      status: 0,
      message: 'Network error — unable to reach the server',
      details: networkError.message,
    };
  }

  // Apply response interceptor if registered
  if (responseInterceptor) {
    response = await responseInterceptor(response);
  }

  // Parse response body
  let body;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  // Throw structured error on non-OK responses
  if (!response.ok) {
    throw {
      status: response.status,
      message: body?.error || response.statusText || 'Unknown error',
      details: body?.details || undefined,
    };
  }

  return { data: body };
}

/**
 * API client with convenience methods for common HTTP verbs.
 */
export const api = {
  /**
   * GET request.
   * @param {string} path  — route path (e.g. '/health')
   * @param {object} opts  — additional fetch options
   */
  get(path, opts = {}) {
    return request(path, { ...opts, method: 'GET' });
  },

  /**
   * POST request.
   * @param {string} path
   * @param {any}    body  — request body (will be JSON-stringified)
   * @param {object} opts  — additional fetch options
   */
  post(path, body, opts = {}) {
    return request(path, {
      ...opts,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /**
   * PUT request.
   * @param {string} path
   * @param {any}    body
   * @param {object} opts
   */
  put(path, body, opts = {}) {
    return request(path, {
      ...opts,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  /**
   * DELETE request.
   * @param {string} path
   * @param {object} opts
   */
  del(path, opts = {}) {
    return request(path, { ...opts, method: 'DELETE' });
  },
};
