import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import * as cache from '../../services/cache.js';

// Mock the openrouter module before importing routes
vi.mock('../../services/openrouter.js', () => ({
  fetchModels: vi.fn(),
}));

// Import after mocking
const { fetchModels } = await import('../../services/openrouter.js');
const { default: categoriesRouter } = await import('../../routes/categories.js');
const { errorHandler } = await import('../../middleware/errorHandler.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/categories', categoriesRouter);
  app.use(errorHandler);
  return app;
}

// --- Fixtures ---

const rawModelsForCategories = [
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    description: 'OpenAI flagship',
    context_length: 128000,
    pricing: { prompt: '0.000005', completion: '0.000015' },
    architecture: { modality: ['text', 'image'] },
    top_provider: { max_completion_tokens: 16384, latency: 450 },
    quality_score: 92,
    parameters: '1760B',
    archived: false,
    created: 1715365300,
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    description: 'Anthropic smart model',
    context_length: 200000,
    pricing: { prompt: '0.000003', completion: '0.000015' },
    architecture: { modality: ['text'] },
    top_provider: { max_completion_tokens: 8192, latency: 300 },
    quality_score: 90,
    parameters: 'unknown',
    archived: false,
    created: 1717000000,
  },
  {
    id: 'meta/llama-3.1-8b',
    name: 'Llama 3.1 8B',
    description: 'Meta open model',
    context_length: 131072,
    pricing: { prompt: '0', completion: '0' },
    architecture: { modality: ['text'] },
    top_provider: { max_completion_tokens: 4096 },
    archived: true,
    created: 1718000000,
    supported_parameters: ['tools'],
  },
];

describe('GET /api/categories', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    cache.invalidateAll();
    vi.clearAllMocks();
  });

  // TC-009: Returns 200 with correct structure
  it('TC-009: returns 200 with { data: [...] } of categories', async () => {
    fetchModels.mockResolvedValueOnce(rawModelsForCategories);

    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);

    // Each category has required fields
    res.body.data.forEach((cat) => {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('name');
      expect(cat).toHaveProperty('slug');
      expect(cat).toHaveProperty('modelCount');
      expect(typeof cat.id).toBe('string');
      expect(typeof cat.name).toBe('string');
      expect(typeof cat.slug).toBe('string');
      expect(typeof cat.modelCount).toBe('number');
      expect(cat.modelCount).toBeGreaterThanOrEqual(1);
    });

    // Sorted by modelCount descending
    for (let i = 1; i < res.body.data.length; i++) {
      expect(res.body.data[i - 1].modelCount).toBeGreaterThanOrEqual(
        res.body.data[i].modelCount
      );
    }
  });

  // TC-010: Response contract validation
  it('TC-010: response follows { data: T } contract with no extra fields', async () => {
    fetchModels.mockResolvedValueOnce(rawModelsForCategories);

    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    // Top-level key is 'data'
    expect(Object.keys(res.body)).toEqual(['data']);
    // Each category has exactly 4 fields
    res.body.data.forEach((cat) => {
      expect(Object.keys(cat).sort()).toEqual(
        ['id', 'modelCount', 'name', 'slug'].sort()
      );
    });
    // id === slug for every category
    res.body.data.forEach((cat) => {
      expect(cat.id).toBe(cat.slug);
    });
  });

  // TC-011: Cached data used — no duplicate API call
  it('TC-011: uses cached model data on second request', async () => {
    fetchModels.mockResolvedValueOnce(rawModelsForCategories);

    await request(app).get('/api/categories');
    await request(app).get('/api/categories');

    // fetchModels should be called only once — cache hit on second call
    expect(fetchModels).toHaveBeenCalledTimes(1);
  });

  // TC-012: Model fetch failure returns 503
  it('TC-012: returns 503 when model data fetch fails with no cache', async () => {
    const apiError = new Error('OpenRouter API error: timeout');
    apiError.status = 503;
    fetchModels.mockRejectedValueOnce(apiError);

    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(503);
    expect(res.body.error).toBeDefined();
  });

  // TC-013: Empty model list returns 200 with empty array
  it('TC-013: returns 200 with { data: [] } when no models exist', async () => {
    fetchModels.mockResolvedValueOnce([]);

    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  // TC-017: Route is mounted (not 404)
  it('TC-017: route is registered and accessible (not 404)', async () => {
    fetchModels.mockResolvedValueOnce([]);

    const res = await request(app).get('/api/categories');

    expect(res.status).not.toBe(404);
  });

  // TC-018: getNormalizedModels import from models.js works
  it('TC-018: calls getNormalizedModels and uses its result for aggregation', async () => {
    fetchModels.mockResolvedValueOnce(rawModelsForCategories);

    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    // Verify that categories were derived from the normalized models
    expect(res.body.data.length).toBeGreaterThan(0);
    // fetchModels was called — proving the data pipeline works
    expect(fetchModels).toHaveBeenCalledTimes(1);
    // Verify categories include expected ones from the fixture
    const catIds = res.body.data.map((c) => c.id);
    // gpt-4o has ['chat','image'] (text→chat, image→image-understanding), claude has ['chat'], llama has ['chat','function_calling']
    expect(catIds).toContain('chat');
  });
});
