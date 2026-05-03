/**
 * Normalized model fixtures for categories tests.
 * Simulates the output of ORF-006's normalizer — normalized model shapes
 * with categories: string[] field.
 */
export const sampleModels = [
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    categories: ['chat', 'code'],
    provider: 'openai',
    qualityScore: 92,
    created: '2024-05-10T12:00:00.000Z',
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    categories: ['chat', 'reasoning'],
    provider: 'anthropic',
    qualityScore: 90,
    created: '2024-05-29T00:00:00.000Z',
  },
  {
    id: 'google/gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    categories: ['image'],
    provider: 'google',
    qualityScore: 88,
    created: '2024-06-01T00:00:00.000Z',
  },
  {
    id: 'meta/llama-3.1-8b',
    name: 'Llama 3.1 8B',
    categories: ['chat'],
    provider: 'meta',
    qualityScore: 75,
    created: '2024-06-10T00:00:00.000Z',
  },
  {
    id: 'mistral/mistral-large',
    name: 'Mistral Large',
    categories: ['code', 'reasoning'],
    provider: 'mistral',
    qualityScore: 85,
    created: '2024-04-15T00:00:00.000Z',
  },
];

/**
 * Models with overlapping raw categories that map to the same display category.
 * 'text' and 'chat' both map to 'Chat' display category.
 */
export const overlapModels = [
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    categories: ['chat', 'text'],
    provider: 'openai',
  },
];

/**
 * Models with empty categories arrays.
 */
export const emptyCategoryModels = [
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    categories: ['chat'],
    provider: 'openai',
  },
  {
    id: 'unknown/model',
    name: 'Unknown Model',
    categories: [],
    provider: 'unknown',
  },
];

/**
 * All models with empty categories.
 */
export const allEmptyCategoriesModels = [
  { id: 'a/model1', name: 'Model 1', categories: [], provider: 'a' },
  { id: 'b/model2', name: 'Model 2', categories: [], provider: 'b' },
  { id: 'c/model3', name: 'Model 3', categories: [], provider: 'c' },
];

/**
 * Models with unknown raw categories (not in DISPLAY_MAP).
 */
export const unknownCategoryModels = [
  {
    id: 'test/multimodal',
    name: 'Multimodal Test',
    categories: ['multimodal', 'embedding'],
    provider: 'test',
  },
];

/**
 * Models for sort testing — categories with tied counts.
 */
export const tiedCountModels = [
  {
    id: 'a/chat1',
    name: 'Chat Model 1',
    categories: ['chat'],
    provider: 'a',
  },
  {
    id: 'a/chat2',
    name: 'Chat Model 2',
    categories: ['chat'],
    provider: 'a',
  },
  {
    id: 'a/chat3',
    name: 'Chat Model 3',
    categories: ['chat'],
    provider: 'a',
  },
  {
    id: 'b/code1',
    name: 'Code Model 1',
    categories: ['code'],
    provider: 'b',
  },
  {
    id: 'b/code2',
    name: 'Code Model 2',
    categories: ['code'],
    provider: 'b',
  },
  {
    id: 'c/reasoning1',
    name: 'Reasoning Model 1',
    categories: ['reasoning'],
    provider: 'c',
  },
  {
    id: 'c/reasoning2',
    name: 'Reasoning Model 2',
    categories: ['reasoning'],
    provider: 'c',
  },
  {
    id: 'd/image1',
    name: 'Image Model 1',
    categories: ['image'],
    provider: 'd',
  },
];

/**
 * Model with uppercase raw category (defensive test).
 */
export const uppercaseCategoryModels = [
  {
    id: 'test/model',
    name: 'Test Model',
    categories: ['Chat'],
    provider: 'test',
  },
];
