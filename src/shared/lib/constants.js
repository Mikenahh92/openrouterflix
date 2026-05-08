/**
 * Shared constants for OpenRouterFlix.
 * Single source of truth for API routes, defaults, and shared enums.
 */

/**
 * API route paths — relative to the base URL.
 * Used with the API client: api.get(API_ROUTES.HEALTH)
 */
export const API_ROUTES = {
  HEALTH: '/health',
  MODELS: '/models',
  CATEGORIES: '/categories',
  COMPARE: '/compare',
  PLAYGROUND: '/playground',
};

/**
 * Default configuration values.
 */
export const DEFAULTS = {
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
  PAGE_SIZE: 20,
  DEBOUNCE_MS: 300,
  MAX_HISTORY_RUNS: 50,
};

/**
 * Supported modalities for model output.
 */
export const SUPPORTED_MODALITIES = ['text', 'image', 'audio', 'video'];

/**
 * Available sort options for the model catalog.
 */
export const SORT_OPTIONS = {
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  PRICING_LOW: 'pricing_low',
  PRICING_HIGH: 'pricing_high',
  CONTEXT_LENGTH: 'context_length',
  POPULARITY: 'popularity',
};

/**
 * Filter keys used in the catalog filtering system.
 */
export const FILTER_KEYS = {
  CATEGORY: 'category',
  MODALITY: 'modality',
  PRICING_RANGE: 'pricing_range',
  CONTEXT_LENGTH: 'context_length',
  PROVIDER: 'provider',
};
