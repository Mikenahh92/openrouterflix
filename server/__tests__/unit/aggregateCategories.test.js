import { describe, it, expect } from 'vitest';
import { aggregateCategories } from '../../routes/categories.js';
import {
  sampleModels,
  emptyCategoryModels,
  allEmptyCategoriesModels,
  overlapModels,
  tiedCountModels,
  uppercaseCategoryModels,
} from '../fixtures/normalizedModels.js';

describe('aggregateCategories', () => {
  // TC-001: Happy path aggregation
  it('TC-001: aggregates categories from models with correct counts', () => {
    const result = aggregateCategories(sampleModels);

    expect(result).toBeInstanceOf(Array);
    // chat: gpt-4o, claude-3.5-sonnet, llama-3.1-8b = 3
    // code: gpt-4o, mistral-large = 2
    // reasoning: claude-3.5-sonnet, mistral-large = 2
    // image-understanding: gemini-1.5-pro = 1
    expect(result).toHaveLength(4);

    const chat = result.find((c) => c.id === 'chat');
    expect(chat).toBeDefined();
    expect(chat.modelCount).toBe(3);

    const code = result.find((c) => c.id === 'code');
    expect(code).toBeDefined();
    expect(code.modelCount).toBe(2);

    const reasoning = result.find((c) => c.id === 'reasoning');
    expect(reasoning).toBeDefined();
    expect(reasoning.modelCount).toBe(2);

    const image = result.find((c) => c.id === 'image-understanding');
    expect(image).toBeDefined();
    expect(image.modelCount).toBe(1);
  });

  // TC-005: Models with empty categories array are skipped
  it('TC-005: skips models with empty categories array', () => {
    const result = aggregateCategories(emptyCategoryModels);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('chat');
    expect(result[0].modelCount).toBe(1);
  });

  // TC-006: All models have empty categories → empty result
  it('TC-006: returns empty array when all models have empty categories', () => {
    const result = aggregateCategories(allEmptyCategoriesModels);
    expect(result).toEqual([]);
  });

  // TC-007: No models at all (empty list)
  it('TC-007: returns empty array for empty model list', () => {
    const result = aggregateCategories([]);
    expect(result).toEqual([]);
  });

  // TC-008: Deduplication — model counted once per display category
  it('TC-008: counts model once per display category even with multiple raw tags mapping to same display', () => {
    const result = aggregateCategories(overlapModels);

    // 'chat' and 'text' both map to 'Chat' — should count as 1
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('chat');
    expect(result[0].modelCount).toBe(1);
  });

  // TC-014: Sorting — by modelCount descending, then alphabetically
  it('TC-014: sorts by modelCount descending, then alphabetically for ties', () => {
    const result = aggregateCategories(tiedCountModels);

    expect(result).toHaveLength(4);
    // Chat (3) first
    expect(result[0].id).toBe('chat');
    expect(result[0].modelCount).toBe(3);
    // Code (2) and Reasoning (2) tied — alphabetical: Code, Reasoning
    expect(result[1].id).toBe('code');
    expect(result[1].modelCount).toBe(2);
    expect(result[2].id).toBe('reasoning');
    expect(result[2].modelCount).toBe(2);
    // Image Understanding (1) last
    expect(result[3].id).toBe('image-understanding');
    expect(result[3].modelCount).toBe(1);
  });

  // TC-015: Categories with 0 models excluded (implicit via filter)
  it('TC-015: never returns categories with modelCount of 0', () => {
    const result = aggregateCategories(sampleModels);
    result.forEach((cat) => {
      expect(cat.modelCount).toBeGreaterThan(0);
    });
  });

  // TC-016: Raw category casing normalization
  it('TC-016: normalizes raw category casing (uppercase input)', () => {
    const result = aggregateCategories(uppercaseCategoryModels);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('chat');
    expect(result[0].name).toBe('Chat');
    expect(result[0].modelCount).toBe(1);
  });

  // Verify shape of each category object
  it('returns objects with id, name, slug, modelCount fields', () => {
    const result = aggregateCategories(sampleModels);

    result.forEach((cat) => {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('name');
      expect(cat).toHaveProperty('slug');
      expect(cat).toHaveProperty('modelCount');
      expect(Object.keys(cat)).toHaveLength(4);
    });
  });

  // Verify id === slug for every category
  it('produces id equal to slug for every category', () => {
    const result = aggregateCategories(sampleModels);

    result.forEach((cat) => {
      expect(cat.id).toBe(cat.slug);
    });
  });
});
