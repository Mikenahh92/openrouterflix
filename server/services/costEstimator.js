/**
 * Cost estimator — calculates request cost from token usage and model pricing.
 * Pricing is per-1M tokens (matching the normalizer output).
 */

/**
 * Estimate the cost of a chat completion request.
 * @param {{ prompt: number|null, completion: number|null, currency: string }} pricing
 *   - Pricing from normalized model (per-1M tokens).
 * @param {{ prompt_tokens?: number, completion_tokens?: number }} usage
 *   - Token usage from the OpenRouter response.
 * @returns {{ promptCost: number, completionCost: number, totalCost: number, currency: string }}
 */
export function estimateCost(pricing, usage = {}) {
  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;

  const promptCost =
    pricing.prompt != null ? (promptTokens / 1_000_000) * pricing.prompt : 0;
  const completionCost =
    pricing.completion != null
      ? (completionTokens / 1_000_000) * pricing.completion
      : 0;

  return {
    promptCost: round(promptCost),
    completionCost: round(completionCost),
    totalCost: round(promptCost + completionCost),
    currency: pricing.currency || 'USD',
  };
}

/**
 * Round to 8 decimal places to avoid floating-point noise.
 * @param {number} value
 * @returns {number}
 */
function round(value) {
  return Math.round(value * 1e8) / 1e8;
}
