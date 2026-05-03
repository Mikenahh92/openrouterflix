import { describe, it, expect } from 'vitest';
import { normalizeModel, normalizeModels } from '../services/normalizer.js';

// --- Fixtures ---

const fullRawModel = {
  id: 'openai/gpt-4o',
  name: 'GPT-4o',
  description: "OpenAI's flagship multimodal model",
  context_length: 128000,
  pricing: { prompt: '0.000005', completion: '0.000015' },
  architecture: {
    modality: ['text', 'image', 'audio'],
    input_modalities: ['text', 'image'],
    output_modalities: ['text'],
  },
  top_provider: {
    max_completion_tokens: 16384,
    latency: 450,
  },
  quality_score: 92,
  parameters: '1760B',
  archived: false,
  created: 1715365300,
};

const sparseRawModel = {
  id: 'test/model',
  name: 'Test Model',
};

describe('normalizeModel', () => {
  // TC-009: Full payload — all 14 fields correctly mapped
  it('TC-009: maps all 14 fields from a full raw model', () => {
    const result = normalizeModel(fullRawModel);

    expect(result.id).toBe('openai/gpt-4o');
    expect(result.name).toBe('GPT-4o');
    expect(result.description).toBe("OpenAI's flagship multimodal model");
    expect(result.provider).toBe('openai');
    expect(Array.isArray(result.categories)).toBe(true);
    expect(result.categories.length).toBeGreaterThan(0);
    expect(result.pricing).toEqual({
      prompt: 5,
      completion: 15,
      currency: 'USD',
    });
    expect(result.contextWindow).toBe(128000);
    expect(result.maxOutput).toBe(16384);
    expect(Array.isArray(result.modalities)).toBe(true);
    expect(result.modalities).toEqual(['text', 'image', 'audio']);
    expect(result.qualityScore).toBe(92);
    expect(result.latency).toBe(450);
    expect(result.parameters).toBe('1760B');
    expect(result.archived).toBe(false);
    expect(result.created).toBe(new Date(1715365300 * 1000).toISOString());
  });

  // TC-010: Sparse payload — null defaults
  it('TC-010: sparse payload defaults to nulls and empty arrays', () => {
    const result = normalizeModel(sparseRawModel);

    expect(result.id).toBe('test/model');
    expect(result.name).toBe('Test Model');
    expect(result.provider).toBe('test');
    expect(result.description).toBeNull();
    expect(result.categories).toEqual([]);
    expect(result.pricing).toEqual({
      prompt: null,
      completion: null,
      currency: 'USD',
    });
    expect(result.contextWindow).toBeNull();
    expect(result.maxOutput).toBeNull();
    expect(result.modalities).toEqual([]);
    expect(result.qualityScore).toBeNull();
    expect(result.latency).toBeNull();
    expect(result.parameters).toBeNull();
    expect(result.archived).toBe(false);
    expect(result.created).toBeNull();
  });

  // TC-011: Empty object — all 14 fields present with defaults
  it('TC-011: empty object produces all defaults, no undefined', () => {
    const result = normalizeModel({});

    expect(result.id).toBeNull();
    expect(result.name).toBeNull();
    expect(result.description).toBeNull();
    expect(result.provider).toBeNull();
    expect(result.categories).toEqual([]);
    expect(result.pricing).toEqual({
      prompt: null,
      completion: null,
      currency: 'USD',
    });
    expect(result.contextWindow).toBeNull();
    expect(result.maxOutput).toBeNull();
    expect(result.modalities).toEqual([]);
    expect(result.qualityScore).toBeNull();
    expect(result.latency).toBeNull();
    expect(result.parameters).toBeNull();
    expect(result.archived).toBe(false);
    expect(result.created).toBeNull();

    // Verify NO undefined values (AC-5)
    const values = Object.values(result);
    for (const v of values) {
      expect(v).not.toBeUndefined();
    }
    // Also check pricing nested object
    expect(result.pricing.prompt).not.toBeUndefined();
    expect(result.pricing.completion).not.toBeUndefined();
    expect(result.pricing.currency).not.toBeUndefined();
  });

  // TC-012: No argument — defaults work
  it('TC-012: no argument produces all defaults, no undefined', () => {
    const result = normalizeModel();

    expect(result.id).toBeNull();
    expect(result.name).toBeNull();
    expect(result.description).toBeNull();
    expect(result.provider).toBeNull();
    expect(result.categories).toEqual([]);
    expect(result.pricing).toEqual({
      prompt: null,
      completion: null,
      currency: 'USD',
    });
    expect(result.contextWindow).toBeNull();
    expect(result.maxOutput).toBeNull();
    expect(result.modalities).toEqual([]);
    expect(result.qualityScore).toBeNull();
    expect(result.latency).toBeNull();
    expect(result.parameters).toBeNull();
    expect(result.archived).toBe(false);
    expect(result.created).toBeNull();
  });

  // TC-021: Provider extracted from ID
  it('TC-021: extracts provider from id prefix', () => {
    const result = normalizeModel({ id: 'openai/gpt-4o', name: 'GPT-4o' });
    expect(result.provider).toBe('openai');
  });

  it('returns null provider when id has no slash', () => {
    const result = normalizeModel({ id: 'no-slash-id', name: 'Test' });
    expect(result.provider).toBeNull();
  });

  // TC-022: Categories is array (plural)
  it('TC-022: categories is always an array, never a string', () => {
    const result1 = normalizeModel(fullRawModel);
    expect(Array.isArray(result1.categories)).toBe(true);

    const result2 = normalizeModel(sparseRawModel);
    expect(Array.isArray(result2.categories)).toBe(true);
    expect(result2.categories).toEqual([]);
  });

  // TC-023: Archived defaults to false
  it('TC-023: archived defaults to false', () => {
    const result = normalizeModel({ id: 'test/model', name: 'Test' });
    expect(result.archived).toBe(false);
    expect(result.created).toBeNull();
    expect(result.parameters).toBeNull();
    expect(result.maxOutput).toBeNull();
  });

  it('archived true is preserved', () => {
    const result = normalizeModel({ ...sparseRawModel, archived: true });
    expect(result.archived).toBe(true);
  });

  // Pricing edge cases
  it('handles zero pricing (free models) as 0, not null', () => {
    const result = normalizeModel({
      ...sparseRawModel,
      pricing: { prompt: '0', completion: '0' },
    });
    expect(result.pricing.prompt).toBe(0);
    expect(result.pricing.completion).toBe(0);
  });

  it('handles NaN pricing gracefully as null', () => {
    const result = normalizeModel({
      ...sparseRawModel,
      pricing: { prompt: 'not-a-number', completion: 'bad' },
    });
    expect(result.pricing.prompt).toBeNull();
    expect(result.pricing.completion).toBeNull();
  });

  it('derives function_calling category from supported_parameters', () => {
    const result = normalizeModel({
      ...sparseRawModel,
      architecture: { modality: ['text'] },
      supported_parameters: ['tools', 'tool_choice'],
    });
    expect(result.categories).toContain('function_calling');
    expect(result.categories).toContain('chat');
  });
});

describe('normalizeModels', () => {
  it('normalizes an array of models', () => {
    const result = normalizeModels([fullRawModel, sparseRawModel]);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('openai/gpt-4o');
    expect(result[1].id).toBe('test/model');
  });

  it('returns empty array for non-array input', () => {
    expect(normalizeModels(null)).toEqual([]);
    expect(normalizeModels(undefined)).toEqual([]);
    expect(normalizeModels('string')).toEqual([]);
  });

  it('returns empty array for empty array input', () => {
    expect(normalizeModels([])).toEqual([]);
  });
});
