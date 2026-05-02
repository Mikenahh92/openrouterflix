/**
 * Model data normalizer — transforms raw OpenRouter model data
 * into a consistent shape. Missing fields default to null.
 *
 * Actual transformation logic will be completed in Story ORF-006 (Backend Models API).
 */

/**
 * Normalize a raw OpenRouter model object into a consistent shape.
 * @param {object} rawModel - Raw model object from OpenRouter API
 * @returns {object} Normalized model with all expected fields
 */
export function normalizeModel(rawModel = {}) {
  return {
    id: rawModel.id ?? null,
    name: rawModel.name ?? null,
    description: rawModel.description ?? null,
    provider: rawModel.provider ?? null,
    category: rawModel.category ?? null,
    pricing: rawModel.pricing ?? null,
    contextWindow: rawModel.context_window ?? rawModel.contextWindow ?? null,
    latency: rawModel.latency ?? null,
    qualityScore: rawModel.quality_score ?? rawModel.qualityScore ?? null,
    modalities: rawModel.modalities ?? null,
    capabilities: rawModel.capabilities ?? null,
  };
}
