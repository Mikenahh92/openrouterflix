/**
 * Centralized Express error middleware.
 * All errors are returned as structured JSON: { error: string, details?: string }
 *
 * - Sanitizes error messages to prevent leaking API keys, secrets, or env var names.
 * - Maps upstream errors (502/504/429) to 503 for client consumption.
 * - Preserves explicit client-error statuses (4xx).
 */

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9_-]{10,}/g,   // OpenAI/OpenRouter key patterns
  /Bearer\s+\S+/gi,            // Bearer tokens
  /api[_-]?key[=:]\s*\S+/gi,   // Key=value patterns
];

const ENV_VAR_PATTERN = /[A-Z][A-Z0-9_]{2,}(?=\s+is\s+not\s+set|\s*=\s*)/g;

function sanitize(message) {
  let cleaned = message;
  for (const pattern of SECRET_PATTERNS) {
    cleaned = cleaned.replace(pattern, '[REDACTED]');
  }
  // Redact environment variable names from "X is not set" style messages
  cleaned = cleaned.replace(
    /([A-Z][A-Z0-9_]{2,})(\s+is\s+not\s+set)/g,
    '[REDACTED]$2'
  );
  return cleaned;
}

export function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;

  // Map upstream gateway errors to 503
  if ([502, 504].includes(status)) {
    status = 503;
  }

  // For 5xx errors without an explicit status from our code, default to 503
  // (indicates upstream / infrastructure issues rather than our server bugs)
  if (status === 500 && err.message) {
    const msg = err.message.toLowerCase();
    if (
      msg.includes('openrouter') ||
      msg.includes('api key') ||
      msg.includes('timed out') ||
      msg.includes('unavailable') ||
      msg.includes('is not set')
    ) {
      status = 503;
    }
  }

  const response = {
    error: sanitize(err.message || 'Internal Server Error'),
  };

  if (err.details) {
    response.details = sanitize(err.details);
  }

  // Never expose stack traces or internal details in production
  res.status(status).json(response);
}
