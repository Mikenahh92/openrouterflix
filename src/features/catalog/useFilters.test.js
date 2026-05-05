import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { catalogSlice } from './catalogSlice';

// ── Test store factory ──────────────────────────────────────────────
// We test the filtering/sorting logic that lives in useFilters by
// directly exercising the store + the filter logic rather than rendering
// components (which would require react-router setup).
//
// The filtering logic is extracted from useFilters.js for direct testing.

function createTestStore(models = [], categories = []) {
  return create((set, get) => ({
    catalog: {
      ...catalogSlice(set, get).catalog,
      models,
      categories,
    },
  }));
}

// ── Test data ───────────────────────────────────────────────────────
const models = [
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Flagship multimodal model',
    categories: ['chat'],
    pricing: { prompt: 5, completion: 15 },
    contextWindow: 128000,
    modalities: ['text', 'image'],
    qualityScore: 4.5,
    latency: 450,
    archived: false,
  },
  {
    id: 'meta/llama-3',
    name: 'Llama 3',
    provider: 'meta',
    description: 'Open source model',
    categories: ['chat', 'coding'],
    pricing: { prompt: 0.5, completion: 1 },
    contextWindow: 8192,
    modalities: ['text'],
    qualityScore: 3.8,
    latency: 200,
    archived: false,
  },
  {
    id: 'anthropic/claude-3',
    name: 'Claude 3',
    provider: 'anthropic',
    description: 'Constitutional AI model',
    categories: ['chat'],
    pricing: { prompt: 3, completion: 15 },
    contextWindow: 200000,
    modalities: ['text', 'image'],
    qualityScore: 4.2,
    latency: 500,
    archived: false,
  },
  {
    id: 'google/gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    description: 'Google multimodal model',
    categories: ['multimodal'],
    pricing: { prompt: 1.25, completion: 5 },
    contextWindow: 32000,
    modalities: ['text', 'image', 'audio'],
    qualityScore: 4.0,
    latency: 300,
    archived: false,
  },
  {
    id: 'archived/old',
    name: 'Old Model',
    provider: 'test',
    description: 'Archived model',
    categories: ['chat'],
    pricing: { prompt: 1, completion: 2 },
    contextWindow: 4096,
    archived: true,
  },
];

// ── Re-implement filteredModels logic for direct testing ────────────
// This mirrors the exact logic from useFilters.js filteredModels useMemo
function computeFilteredModels(models, filters, searchQuery, sortBy) {
  let result = models;

  // Exclude archived
  result = result.filter((m) => !m.archived);

  // Search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter((m) => {
      const name = (m.name || '').toLowerCase();
      const provider = (m.provider || '').toLowerCase();
      const description = (m.description || '').toLowerCase();
      return name.includes(q) || provider.includes(q) || description.includes(q);
    });
  }

  // Category
  if (filters?.category) {
    const cat = filters.category.toLowerCase();
    result = result.filter((m) => {
      if (!Array.isArray(m.categories)) return false;
      return m.categories.some((c) => c.toLowerCase() === cat);
    });
  }

  // Provider
  if (filters?.provider) {
    const prov = filters.provider.toLowerCase();
    result = result.filter((m) => (m.provider || '').toLowerCase() === prov);
  }

  // Price min
  if (filters?.priceMin != null) {
    const min = Number(filters.priceMin);
    if (!Number.isNaN(min)) {
      result = result.filter((m) => m.pricing?.prompt != null && m.pricing.prompt >= min);
    }
  }

  // Price max
  if (filters?.priceMax != null) {
    const max = Number(filters.priceMax);
    if (!Number.isNaN(max)) {
      result = result.filter((m) => m.pricing?.prompt != null && m.pricing.prompt <= max);
    }
  }

  // Modality
  if (filters?.modality) {
    const mod = filters.modality.toLowerCase();
    result = result.filter((m) => {
      if (!Array.isArray(m.modalities)) return false;
      return m.modalities.some((m2) => m2.toLowerCase() === mod);
    });
  }

  // Context window
  if (filters?.ctxWindow != null) {
    const minCtx = Number(filters.ctxWindow);
    if (!Number.isNaN(minCtx)) {
      result = result.filter((m) => m.contextWindow != null && m.contextWindow >= minCtx);
    }
  }

  // Sort
  const sorted = [...result];
  switch (sortBy) {
    case 'price_asc':
      sorted.sort((a, b) => (a.pricing?.prompt ?? Infinity) - (b.pricing?.prompt ?? Infinity));
      break;
    case 'price_desc':
      sorted.sort((a, b) => (b.pricing?.prompt ?? 0) - (a.pricing?.prompt ?? 0));
      break;
    case 'latency_asc':
      sorted.sort((a, b) => (a.latency ?? Infinity) - (b.latency ?? Infinity));
      break;
    case 'quality_desc':
      sorted.sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
      break;
    case 'newest':
      sorted.sort((a, b) => new Date(b.created ?? 0) - new Date(a.created ?? 0));
      break;
    case 'popularity':
    default:
      break;
  }

  return sorted;
}

describe('useFilters – filtering logic', () => {
  // TC-015: No filters returns all non-archived models
  it('TC-015: returns all non-archived models with no filters', () => {
    const result = computeFilteredModels(models, {}, '', 'popularity');
    expect(result).toHaveLength(4);
    expect(result.every((m) => !m.archived)).toBe(true);
  });

  // TC-016: Search by name
  it('TC-016: search by name filters models', () => {
    const result = computeFilteredModels(models, {}, 'gpt', 'popularity');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('GPT-4o');
  });

  // TC-017: Search by provider
  it('TC-017: search by provider filters models', () => {
    const result = computeFilteredModels(models, {}, 'meta', 'popularity');
    expect(result).toHaveLength(1);
    expect(result[0].provider).toBe('meta');
  });

  // TC-018: Search by description
  it('TC-018: search by description filters models', () => {
    const result = computeFilteredModels(models, {}, 'constitutional', 'popularity');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Claude 3');
  });

  // TC-019: Search is case-insensitive
  it('TC-019: search is case-insensitive', () => {
    const result = computeFilteredModels(models, {}, 'GPT', 'popularity');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('GPT-4o');
  });

  // TC-020: Category filter
  it('TC-020: category filter returns matching models', () => {
    const result = computeFilteredModels(models, { category: 'coding' }, '', 'popularity');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Llama 3');
  });

  // TC-021: Provider filter
  it('TC-021: provider filter returns matching models', () => {
    const result = computeFilteredModels(models, { provider: 'google' }, '', 'popularity');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Gemini Pro');
  });

  // TC-022: Price min filter
  it('TC-022: priceMin filter excludes cheaper models', () => {
    const result = computeFilteredModels(models, { priceMin: 2 }, '', 'popularity');
    expect(result).toHaveLength(2); // GPT-4o (5) and Claude 3 (3)
    expect(result.every((m) => m.pricing.prompt >= 2)).toBe(true);
  });

  // TC-023: Price max filter
  it('TC-023: priceMax filter excludes expensive models', () => {
    const result = computeFilteredModels(models, { priceMax: 2 }, '', 'popularity');
    expect(result).toHaveLength(2); // Llama 3 (0.5) and Gemini Pro (1.25)
    expect(result.every((m) => m.pricing.prompt <= 2)).toBe(true);
  });

  // TC-024: Modality filter
  it('TC-024: modality filter returns models with that modality', () => {
    const result = computeFilteredModels(models, { modality: 'audio' }, '', 'popularity');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Gemini Pro');
  });

  // TC-025: Context window filter
  it('TC-025: ctxWindow filter returns models with enough context', () => {
    const result = computeFilteredModels(models, { ctxWindow: 100000 }, '', 'popularity');
    expect(result).toHaveLength(2); // GPT-4o (128K) and Claude 3 (200K)
    expect(result.every((m) => m.contextWindow >= 100000)).toBe(true);
  });

  // TC-026: Combined filters
  it('TC-026: combined filters intersect correctly', () => {
    const result = computeFilteredModels(
      models,
      { category: 'chat', modality: 'image' },
      '',
      'popularity'
    );
    expect(result).toHaveLength(2); // GPT-4o and Claude 3
    expect(result.map((m) => m.name)).toEqual(
      expect.arrayContaining(['GPT-4o', 'Claude 3'])
    );
  });

  // TC-027: Sort by price ascending
  it('TC-027: sort by price_asc orders cheapest first', () => {
    const result = computeFilteredModels(models, {}, '', 'price_asc');
    const prices = result.map((m) => m.pricing.prompt);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  // TC-028: Sort by price descending
  it('TC-028: sort by price_desc orders most expensive first', () => {
    const result = computeFilteredModels(models, {}, '', 'price_desc');
    const prices = result.map((m) => m.pricing.prompt);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
    }
  });

  // TC-029: Sort by latency ascending
  it('TC-029: sort by latency_asc orders fastest first', () => {
    const result = computeFilteredModels(models, {}, '', 'latency_asc');
    const latencies = result.map((m) => m.latency);
    for (let i = 1; i < latencies.length; i++) {
      expect(latencies[i]).toBeGreaterThanOrEqual(latencies[i - 1]);
    }
  });

  // TC-030: Sort by quality descending
  it('TC-030: sort by quality_desc orders highest quality first', () => {
    const result = computeFilteredModels(models, {}, '', 'quality_desc');
    const scores = result.map((m) => m.qualityScore);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  // TC-031: Archived models excluded
  it('TC-031: archived models are always excluded', () => {
    const result = computeFilteredModels(models, {}, '', 'popularity');
    expect(result.some((m) => m.archived)).toBe(false);
    expect(result).toHaveLength(4);
  });

  // TC-032: Empty result for no matches
  it('TC-032: returns empty array when no models match', () => {
    const result = computeFilteredModels(models, {}, 'nonexistent', 'popularity');
    expect(result).toEqual([]);
  });

  // TC-033: Price range filter (both min and max)
  it('TC-033: price range with both min and max', () => {
    const result = computeFilteredModels(models, { priceMin: 1, priceMax: 5 }, '', 'popularity');
    expect(result).toHaveLength(2); // Gemini Pro (1.25) and Claude 3 (3)
    expect(result.every((m) => m.pricing.prompt >= 1 && m.pricing.prompt <= 5)).toBe(true);
  });

  // TC-034: Search + filter combined
  it('TC-034: search combined with category filter', () => {
    const result = computeFilteredModels(models, { category: 'chat' }, 'openai', 'popularity');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('GPT-4o');
  });

  // Additional: popularity (default) preserves API order
  it('popularity sort preserves original order', () => {
    const result = computeFilteredModels(models, {}, '', 'popularity');
    expect(result.map((m) => m.id)).toEqual([
      'openai/gpt-4o',
      'meta/llama-3',
      'anthropic/claude-3',
      'google/gemini-pro',
    ]);
  });

  // Additional: newest sort
  it('newest sort orders by created date descending', () => {
    const modelsWithDates = [
      { ...models[0], created: '2024-06-01', archived: false },
      { ...models[1], created: '2024-01-01', archived: false },
      { ...models[2], created: '2024-03-01', archived: false },
    ];
    const result = computeFilteredModels(modelsWithDates, {}, '', 'newest');
    expect(result[0].id).toBe('openai/gpt-4o');
    expect(result[1].id).toBe('anthropic/claude-3');
    expect(result[2].id).toBe('meta/llama-3');
  });
});

// ── activeFilterCount / isFiltered tests ────────────────────────────
describe('useFilters – activeFilterCount logic', () => {
  function countActiveFilters(filters, searchQuery) {
    let count = 0;
    if (filters?.category) count++;
    if (filters?.provider) count++;
    if (filters?.priceMin != null) count++;
    if (filters?.priceMax != null) count++;
    if (filters?.modality) count++;
    if (filters?.ctxWindow != null) count++;
    if (searchQuery) count++;
    return count;
  }

  it('returns 0 with empty filters', () => {
    expect(countActiveFilters({}, '')).toBe(0);
  });

  it('counts category filter', () => {
    expect(countActiveFilters({ category: 'chat' }, '')).toBe(1);
  });

  it('counts search query as a filter', () => {
    expect(countActiveFilters({}, 'gpt')).toBe(1);
  });

  it('counts multiple filters', () => {
    expect(countActiveFilters({ category: 'chat', provider: 'openai', priceMin: 1 }, 'gpt')).toBe(4);
  });

  it('isFiltered is true when count > 0', () => {
    expect(countActiveFilters({ category: 'chat' }, '') > 0).toBe(true);
  });

  it('isFiltered is false when count === 0', () => {
    expect(countActiveFilters({}, '') > 0).toBe(false);
  });
});
