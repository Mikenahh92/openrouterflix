/**
 * Model data normalizer — transforms raw OpenRouter model data
 * into a consistent 14-field NormalizedModel shape.
 *
 * NormalizedModel contract:
 * - All nullable fields default to null (never undefined)
 * - categories and modalities default to [] (empty array)
 * - archived defaults to false
 */

/**
 * Derive categories from model metadata fields.
 * Looks at architecture, modality, and known capability indicators.
 * @param {object} rawModel - Raw model object
 * @returns {string[]} Array of category strings
 */
function deriveCategories(rawModel) {
  const categories = new Set();

  // Derive from architecture type
  if (rawModel.architecture) {
    const arch = rawModel.architecture;
    if (arch.modality) {
      if (Array.isArray(arch.modality)) {
        arch.modality.forEach((m) => {
          if (typeof m === 'string') {
            categories.add(m.toLowerCase());
          }
        });
      } else if (typeof arch.modality === 'string') {
        categories.add(arch.modality.toLowerCase());
      }
    }
  }

  // Derive from supported_parameters (capabilities)
  if (Array.isArray(rawModel.supported_parameters)) {
    const params = rawModel.supported_parameters;
    if (params.includes('tools')) categories.add('function_calling');
    if (params.includes('tool_choice')) categories.add('function_calling');
  }

  // Mark as chat by default if model has text modality
  if (categories.has('text') && !categories.has('chat')) {
    categories.add('chat');
  }

  return [...categories];
}

/**
 * Parse modalities from raw model data.
 * @param {object} rawModel - Raw model object
 * @returns {string[]} Array of modality strings
 */
function parseModalities(rawModel) {
  if (rawModel.architecture?.modality) {
    const mod = rawModel.architecture.modality;
    if (Array.isArray(mod)) return mod.filter((m) => typeof m === 'string');
    if (typeof mod === 'string') return [mod];
  }
  return [];
}

/**
 * Normalize a raw OpenRouter model object into a consistent 14-field shape.
 * Guarantees: no undefined values, all missing fields are null.
 * @param {object} rawModel - Raw model object from OpenRouter API
 * @returns {object} Normalized model with all expected fields
 */
export function normalizeModel(rawModel = {}) {
  const id = rawModel.id ?? null;
  const name = rawModel.name ?? null;
  const description = rawModel.description ?? null;

  // Provider: extract from id prefix (before "/")
  let provider = null;
  if (typeof id === 'string' && id.includes('/')) {
    provider = id.split('/')[0];
  }

  // Pricing: OpenRouter returns string values per token, convert to per-1M tokens
  let pricing = {
    prompt: null,
    completion: null,
    currency: 'USD',
  };
  if (rawModel.pricing) {
    const promptRaw = rawModel.pricing.prompt;
    const completionRaw = rawModel.pricing.completion;
    // OpenRouter pricing is per token — multiply by 1,000,000 to get per-1M-tokens
    pricing.prompt =
      promptRaw != null ? parseFloat(promptRaw) * 1_000_000 : null;
    pricing.completion =
      completionRaw != null ? parseFloat(completionRaw) * 1_000_000 : null;
    // If parsing results in NaN, set to null
    if (Number.isNaN(pricing.prompt)) pricing.prompt = null;
    if (Number.isNaN(pricing.completion)) pricing.completion = null;
  }

  // Context window
  const contextWindow =
    rawModel.context_length != null ? Number(rawModel.context_length) : null;
  if (Number.isNaN(contextWindow)) {
    // leave as null if conversion fails
  }

  // Max output tokens
  let maxOutput = null;
  if (rawModel.top_provider?.max_completion_tokens != null) {
    maxOutput = Number(rawModel.top_provider.max_completion_tokens);
    if (Number.isNaN(maxOutput)) maxOutput = null;
  }

  // Quality score
  const qualityScore =
    rawModel.quality_score != null ? Number(rawModel.quality_score) : null;

  // Latency
  let latency = null;
  if (rawModel.top_provider?.latency != null) {
    latency = Number(rawModel.top_provider.latency);
    if (Number.isNaN(latency)) latency = null;
  }

  // Parameters (model size string)
  const parameters = rawModel.parameters ?? null;

  // Archived flag
  const archived = rawModel.archived === true;

  // Created date — OpenRouter returns Unix timestamp
  let created = null;
  if (rawModel.created != null) {
    const ts = Number(rawModel.created);
    if (!Number.isNaN(ts)) {
      created = new Date(ts * 1000).toISOString();
    }
  }

  return {
    id,
    name,
    description,
    provider,
    categories: deriveCategories(rawModel),
    pricing,
    contextWindow: Number.isNaN(contextWindow) ? null : contextWindow,
    maxOutput,
    modalities: parseModalities(rawModel),
    qualityScore: qualityScore != null && !Number.isNaN(qualityScore) ? qualityScore : null,
    latency,
    parameters,
    archived,
    created,
  };
}

/**
 * Normalize an array of raw OpenRouter model objects.
 * @param {object[]} rawModels - Array of raw model objects
 * @returns {object[]} Array of normalized models
 */
export function normalizeModels(rawModels = []) {
  if (!Array.isArray(rawModels)) return [];
  return rawModels.map(normalizeModel);
}
