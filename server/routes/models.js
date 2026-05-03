/**
 * Models route handlers — GET /api/models (list) and GET /api/models/:id (detail).
 * Thin orchestration: validate → cache → services → filter/sort → respond.
 *
 * Note: Model IDs contain slashes (e.g. "openai/gpt-4o"), so the detail route
 * uses a wildcard parameter to capture the full path segment after /api/models/.
 */
import { Router } from 'express';
import * as cache from '../services/cache.js';
import { fetchModels } from '../services/openrouter.js';
import { normalizeModels } from '../services/normalizer.js';

const router = Router();

const CACHE_KEY_LIST = 'models';
const CACHE_KEY_MODEL = (id) => `model:${id}`;
const MODELS_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Apply server-side filters to a normalized model list.
 * @param {object[]} models - Normalized models
 * @param {object} query - Express query params
 * @returns {object[]} Filtered models
 */
function applyFilters(models, query) {
  let result = models;

  if (query.category) {
    const cat = query.category.toLowerCase();
    result = result.filter((m) =>
      m.categories.some((c) => c.toLowerCase() === cat)
    );
  }

  if (query.provider) {
    const prov = query.provider.toLowerCase();
    result = result.filter(
      (m) => m.provider && m.provider.toLowerCase() === prov
    );
  }

  if (query.search) {
    const term = query.search.toLowerCase();
    result = result.filter((m) => {
      const haystack = [m.name, m.provider, m.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }

  return result;
}

/**
 * Apply sorting to a normalized model list.
 * @param {object[]} models - Normalized models
 * @param {string} sort - Sort key
 * @returns {object[]} Sorted models
 */
function applySort(models, sort) {
  if (!sort) return models;

  const sorted = [...models];

  switch (sort) {
    case 'price_low':
      sorted.sort((a, b) => {
        const pa = a.pricing?.prompt ?? Infinity;
        const pb = b.pricing?.prompt ?? Infinity;
        return pa - pb;
      });
      break;
    case 'price_high':
      sorted.sort((a, b) => {
        const pa = a.pricing?.prompt ?? -Infinity;
        const pb = b.pricing?.prompt ?? -Infinity;
        return pb - pa;
      });
      break;
    case 'quality':
      sorted.sort((a, b) => {
        const qa = a.qualityScore ?? -Infinity;
        const qb = b.qualityScore ?? -Infinity;
        return qb - qa;
      });
      break;
    case 'newest':
      sorted.sort((a, b) => {
        const da = a.created ? new Date(a.created).getTime() : 0;
        const db = b.created ? new Date(b.created).getTime() : 0;
        return db - da;
      });
      break;
    default:
      // Unknown sort — return unsorted
      break;
  }

  return sorted;
}

/**
 * Fetch normalized models with cache + stale fallback.
 * @returns {Promise<object[]>} Array of normalized models
 */
async function getNormalizedModels() {
  // Check cache
  let models = cache.get(CACHE_KEY_LIST);
  if (models) return models;

  try {
    // Fetch from OpenRouter
    const rawModels = await fetchModels();
    models = normalizeModels(rawModels);
    cache.set(CACHE_KEY_LIST, models, MODELS_TTL);
    return models;
  } catch (err) {
    // Stale cache fallback (AD-6)
    const staleModels = cache.get(CACHE_KEY_LIST, { allowStale: true });
    if (staleModels) return staleModels;

    // No stale data — re-throw for error middleware
    throw err;
  }
}

/**
 * GET /api/models — List all models with optional filter/sort.
 */
router.get('/', async (_req, res, next) => {
  try {
    const models = await getNormalizedModels();
    const filtered = applyFilters(models, _req.query);
    const sorted = applySort(filtered, _req.query.sort);
    res.json({ data: sorted });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/models/:id — Single model detail.
 * Uses wildcard (*) to capture model IDs that contain slashes (e.g. "openai/gpt-4o").
 */
router.get('/*', async (req, res, next) => {
  try {
    // req.params[0] captures everything after /api/models/ when using wildcard
    const id = req.params[0];

    // Check single-model cache
    let model = cache.get(CACHE_KEY_MODEL(id));
    if (model) {
      return res.json({ data: model });
    }

    // Check full-list cache or fetch
    const models = await getNormalizedModels();
    model = models.find((m) => m.id === id) || null;

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Cache the individual model
    cache.set(CACHE_KEY_MODEL(id), model, MODELS_TTL);
    res.json({ data: model });
  } catch (err) {
    next(err);
  }
});

export default router;
