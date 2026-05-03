/**
 * Playground route handlers — POST /api/playground.
 * Proxies chat completion requests to OpenRouter and returns
 * response text with metadata (tokens, latency, cost).
 */
import { Router } from 'express';
import { fetchChatCompletion, fetchModels } from '../services/openrouter.js';
import { normalizeModel } from '../services/normalizer.js';
import { estimateCost } from '../services/costEstimator.js';

const router = Router();

// Allowed roles for message validation
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);

/**
 * Validate the request body for POST /api/playground.
 * @param {any} body - Express request body
 * @returns {{ valid: boolean, error?: string, status?: number }}
 */
function validateBody(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object.', status: 400 };
  }

  // model is required
  if (!body.model || typeof body.model !== 'string') {
    return { valid: false, error: '"model" is required and must be a string.', status: 400 };
  }

  // messages is required and must be a non-empty array
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return { valid: false, error: '"messages" is required and must be a non-empty array.', status: 400 };
  }

  // Validate each message
  for (let i = 0; i < body.messages.length; i++) {
    const msg = body.messages[i];
    if (!msg || typeof msg !== 'object') {
      return {
        valid: false,
        error: `messages[${i}] must be an object with "role" and "content".`,
        status: 400,
      };
    }
    if (!ALLOWED_ROLES.has(msg.role)) {
      return {
        valid: false,
        error: `messages[${i}].role must be one of: ${[...ALLOWED_ROLES].join(', ')}.`,
        status: 400,
      };
    }
    if (typeof msg.content !== 'string') {
      return {
        valid: false,
        error: `messages[${i}].content must be a string.`,
        status: 400,
      };
    }
  }

  // temperature: optional, number 0–2
  if (body.temperature != null) {
    if (typeof body.temperature !== 'number' || body.temperature < 0 || body.temperature > 2) {
      return {
        valid: false,
        error: '"temperature" must be a number between 0 and 2.',
        status: 400,
      };
    }
  }

  // max_tokens: optional, positive integer
  if (body.max_tokens != null) {
    if (typeof body.max_tokens !== 'number' || !Number.isInteger(body.max_tokens) || body.max_tokens <= 0) {
      return {
        valid: false,
        error: '"max_tokens" must be a positive integer.',
        status: 400,
      };
    }
  }

  return { valid: true };
}

/**
 * Look up the normalized model pricing for cost estimation.
 * Fetches from cache/OpenRouter and finds by ID.
 * @param {string} modelId
 * @returns {Promise<object|null>} Normalized model or null
 */
async function lookupModelPricing(modelId) {
  try {
    const rawModels = await fetchModels();
    const raw = rawModels.find((m) => m.id === modelId);
    if (!raw) return null;
    return normalizeModel(raw);
  } catch {
    return null;
  }
}

/**
 * POST /api/playground — Proxy a chat completion request to OpenRouter.
 *
 * Request body:
 *   { model: string, messages: [{role, content}], temperature?: number, max_tokens?: number }
 *
 * Response:
 *   { data: { text, model, usage, cost, latency_ms } }
 */
router.post('/', async (req, res, next) => {
  try {
    // Validate request
    const validation = validateBody(req.body);
    if (!validation.valid) {
      return res.status(validation.status).json({ error: validation.error });
    }

    const { model, messages, temperature, max_tokens } = req.body;

    const startTime = Date.now();

    // Call OpenRouter chat completions
    const openRouterResponse = await fetchChatCompletion({
      model,
      messages,
      temperature,
      max_tokens,
    });

    const latency_ms = Date.now() - startTime;

    // Extract response text (first choice message content)
    const choice = openRouterResponse.choices?.[0];
    const text = choice?.message?.content ?? '';

    // Token usage from OpenRouter response
    const usage = openRouterResponse.usage
      ? {
          prompt_tokens: openRouterResponse.usage.prompt_tokens ?? 0,
          completion_tokens: openRouterResponse.usage.completion_tokens ?? 0,
          total_tokens: openRouterResponse.usage.total_tokens ?? 0,
        }
      : { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    // Cost estimation — look up model pricing
    let cost = null;
    try {
      const normalizedModel = await lookupModelPricing(model);
      if (normalizedModel?.pricing) {
        cost = estimateCost(normalizedModel.pricing, usage);
      }
    } catch {
      // Pricing lookup failed — cost stays null
    }

    res.json({
      data: {
        text,
        model: openRouterResponse.model || model,
        usage,
        cost,
        latency_ms,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
