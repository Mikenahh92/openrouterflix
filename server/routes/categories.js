/**
 * Categories route handler — GET /api/categories.
 * Derives model categories from normalized OpenRouter model metadata
 * and returns each category with its model count.
 *
 * Thin aggregation layer over cached model data — no new OpenRouter API calls.
 */
import { Router } from 'express';
import { getNormalizedModels } from './models.js';

const router = Router();

/**
 * Display name mapping: raw normalizer categories → user-facing names.
 * Maps technical categories from the normalizer (lowercase) to PRD display names.
 */
const DISPLAY_MAP = {
  text: 'Chat',
  chat: 'Chat',
  code: 'Code',
  image: 'Image Understanding',
  reasoning: 'Reasoning',
  function_calling: 'Function Calling',
};

/**
 * Map a raw normalizer category to a user-facing display name.
 * Known categories use DISPLAY_MAP; unknown categories get titleCase fallback.
 * @param {string} rawCategory - Raw lowercase category from normalizer
 * @returns {string} Display name
 */
export function mapToDisplayCategory(rawCategory) {
  const key = String(rawCategory).toLowerCase();
  if (DISPLAY_MAP[key]) return DISPLAY_MAP[key];
  // titleCase fallback for unknown categories
  return String(rawCategory)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Generate a URL-friendly slug from a display name.
 * Lowercase, hyphenated, no leading/trailing hyphens.
 * @param {string} name - Display name
 * @returns {string} Slug
 */
export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Aggregate categories from normalized models.
 * Iterates models, maps raw categories to display names, counts per category.
 * @param {object[]} models - Array of normalized model objects with categories field
 * @returns {object[]} Sorted array of { id, name, slug, modelCount }
 */
export function aggregateCategories(models) {
  const categoryMap = new Map(); // slug → { id, name, slug, modelCount }

  for (const model of models) {
    if (!Array.isArray(model.categories)) continue;

    // Track which display slugs this model has already been counted toward
    const countedSlugs = new Set();

    for (const rawCat of model.categories) {
      const display = mapToDisplayCategory(rawCat);
      const slug = slugify(display);

      // Deduplicate: count each model once per display category
      if (countedSlugs.has(slug)) continue;
      countedSlugs.add(slug);

      if (!categoryMap.has(slug)) {
        categoryMap.set(slug, { id: slug, name: display, slug, modelCount: 0 });
      }
      categoryMap.get(slug).modelCount++;
    }
  }

  return [...categoryMap.values()]
    .filter((c) => c.modelCount > 0)
    .sort((a, b) => b.modelCount - a.modelCount || a.name.localeCompare(b.name));
}

/**
 * GET /api/categories — List all categories with model counts.
 */
router.get('/', async (_req, res, next) => {
  try {
    const models = await getNormalizedModels();
    const categories = aggregateCategories(models);
    res.json({ data: categories });
  } catch (err) {
    next(err);
  }
});

export default router;
