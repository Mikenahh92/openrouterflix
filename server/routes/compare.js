/**
 * Compare route handler — POST /api/compare
 * Accepts 2–4 model IDs, batch-fetches normalized model details via cache-first
 * resolution, and returns structured comparison data with partial-success error handling.
 */
import { Router } from 'express';
import * as cache from '../services/cache.js';
import { fetchModelById } from '../services/openrouter.js';
import { normalizeModel } from '../services/normalizer.js';

const router = Router();

const CACHE_KEY_MODEL = (id) => `model:${id}`;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes, matches models route

/**
 * Resolve a single model ID: cache-first, then OpenRouter API, then normalize.
 * Returns { status: 'fulfilled', value } or { status: 'rejected', reason: { id, reason } }.
 * @param {string} modelId
 * @returns {Promise<{status: string, value?: object, reason?: {id: string, reason: string}}>}
 */
async function resolveModel(modelId) {
  try {
    // Cache lookup
    const cached = cache.get(CACHE_KEY_MODEL(modelId));
    if (cached) {
      return { status: 'fulfilled', value: cached };
    }

    // Fetch from OpenRouter
    const rawModel = await fetchModelById(modelId);

    if (!rawModel) {
      return {
        status: 'rejected',
        reason: { id: modelId, reason: 'Model not found' },
      };
    }

    // Normalize and cache
    const normalized = normalizeModel(rawModel);
    cache.set(CACHE_KEY_MODEL(modelId), normalized, CACHE_TTL);

    return { status: 'fulfilled', value: normalized };
  } catch (err) {
    return {
      status: 'rejected',
      reason: { id: modelId, reason: err.message || 'Failed to fetch model' },
    };
  }
}

/**
 * POST /api/compare
 * Body: { modelIds: string[] } — 2 to 4 model IDs
 */
router.post('/', async (req, res) => {
  const { modelIds } = req.body;

  // Input validation
  if (
    !Array.isArray(modelIds) ||
    modelIds.length < 2 ||
    modelIds.length > 4 ||
    !modelIds.every((id) => typeof id === 'string')
  ) {
    return res.status(400).json({
      error: 'modelIds must be an array of 2-4 model ID strings',
    });
  }

  // Batch resolution with Promise.allSettled pattern (individual resolveModel never throws)
  const results = await Promise.all(
    modelIds.map((id) => resolveModel(id))
  );

  const data = [];
  const errors = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      data.push(result.value);
    } else {
      errors.push(result.reason);
    }
  }

  // All models failed
  if (data.length === 0) {
    return res.status(404).json({
      error: 'No models found',
      details: errors,
    });
  }

  // Full or partial success
  const response = { data };
  if (errors.length > 0) {
    response.errors = errors;
  }

  return res.status(200).json(response);
});

export default router;
