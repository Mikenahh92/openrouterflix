import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import * as cache from '../services/cache.js';

// We need to set up the app similarly to index.js but with mocked services
// Mock the openrouter module before importing routes
vi.mock('../services/openrouter.js', () => ({
  fetchModels: vi.fn(),
}));

// Import after mocking
const { fetchModels } = await import('../services/openrouter.js');
const { default: modelsRouter } = await import('../routes/models.js');
const { errorHandler } = await import('../middleware/errorHandler.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/models', modelsRouter);
  app.use(errorHandler);
  return app;
}

// --- Fixtures ---

const rawModels = [
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    description: 'OpenAI flagship model',
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
  },
];

describe('GET /api/models', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    cache.invalidateAll();
    vi.clearAllMocks();
  });

  // TC-001: Happy path list
  it('TC-001: returns 200 with { data: [...] } of normalized models', async () => {
    fetchModels.mockResolvedValueOnce(rawModels);

    const res = await request(app).get('/api/models');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data).toHaveLength(3);

    // Verify first model has all expected fields
    const gpt4o = res.body.data.find((m) => m.id === 'openai/gpt-4o');
    expect(gpt4o).toBeDefined();
    expect(gpt4o.name).toBe('GPT-4o');
    expect(gpt4o.provider).toBe('openai');
    expect(gpt4o.pricing).toEqual({ prompt: 5, completion: 15, currency: 'USD' });
    expect(gpt4o.contextWindow).toBe(128000);
    expect(gpt4o.maxOutput).toBe(16384);
    expect(gpt4o.archived).toBe(false);
  });

  // TC-002: Cache hit — OpenRouter called only once
  it('TC-002: cache hit — no duplicate OpenRouter calls', async () => {
    fetchModels.mockResolvedValueOnce(rawModels);

    await request(app).get('/api/models');
    await request(app).get('/api/models');

    expect(fetchModels).toHaveBeenCalledTimes(1);
  });

  // TC-006: Filter by category
  it('TC-006: filters by category query param (case-insensitive)', async () => {
    fetchModels.mockResolvedValueOnce(rawModels);

    const res = await request(app).get('/api/models?category=text');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach((m) => {
      expect(m.categories).toEqual(
        expect.arrayContaining([expect.stringMatching(/^text$/i)])
      );
    });
  });

  // TC-007: Sort ascending by price
  it('TC-007: sorts by price_low (ascending prompt price)', async () => {
    fetchModels.mockResolvedValueOnce(rawModels);

    const res = await request(app).get('/api/models?sort=price_low');

    expect(res.status).toBe(200);
    const prices = res.body.data.map((m) => m.pricing.prompt);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  // TC-008: Sort by newest
  it('TC-008: sorts by newest (creation date descending)', async () => {
    fetchModels.mockResolvedValueOnce(rawModels);

    const res = await request(app).get('/api/models?sort=newest');

    expect(res.status).toBe(200);
    const dates = res.body.data.map((m) => (m.created ? new Date(m.created).getTime() : 0));
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  // Sort by quality
  it('sorts by quality (descending)', async () => {
    fetchModels.mockResolvedValueOnce(rawModels);

    const res = await request(app).get('/api/models?sort=quality');

    expect(res.status).toBe(200);
    const scores = res.body.data.map((m) => m.qualityScore ?? -Infinity);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    }
  });

  // Sort by price_high
  it('sorts by price_high (descending prompt price)', async () => {
    fetchModels.mockResolvedValueOnce(rawModels);

    const res = await request(app).get('/api/models?sort=price_high');

    expect(res.status).toBe(200);
    const prices = res.body.data.map((m) => m.pricing.prompt);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i - 1]).toBeGreaterThanOrEqual(prices[i]);
    }
  });

  // Filter by provider
  it('filters by provider query param', async () => {
    fetchModels.mockResolvedValueOnce(rawModels);

    const res = await request(app).get('/api/models?provider=openai');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].provider).toBe('openai');
  });

  // Filter by search
  it('filters by search query param', async () => {
    fetchModels.mockResolvedValueOnce(rawModels);

    const res = await request(app).get('/api/models?search=claude');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toContain('Claude');
  });

  // TC-016: Empty response
  it('TC-016: returns empty array when OpenRouter returns no models', async () => {
    fetchModels.mockResolvedValueOnce([]);

    const res = await request(app).get('/api/models');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  // TC-017: Invalid sort field — returns unsorted
  it('TC-017: unknown sort field returns unsorted results', async () => {
    fetchModels.mockResolvedValueOnce(rawModels);

    const res = await request(app).get('/api/models?sort=nonexistentField');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
  });
});

describe('GET /api/models/:id', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    cache.invalidateAll();
    vi.clearAllMocks();
  });

  // TC-004: Existing model
  it('TC-004: returns 200 with normalized model for valid id', async () => {
    fetchModels.mockResolvedValueOnce(rawModels);

    const res = await request(app).get('/api/models/openai/gpt-4o');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe('openai/gpt-4o');
    expect(res.body.data.name).toBe('GPT-4o');
    expect(res.body.data.provider).toBe('openai');
    expect(res.body.data.pricing).toEqual({ prompt: 5, completion: 15, currency: 'USD' });
    expect(res.body.data.contextWindow).toBe(128000);
    expect(res.body.data.maxOutput).toBe(16384);
    expect(res.body.data.modalities).toEqual(['text', 'image']);
    expect(res.body.data.archived).toBe(false);
    expect(res.body.data.created).toBeDefined();
  });

  // TC-005: Model not found
  it('TC-005: returns 404 for non-existent model id', async () => {
    fetchModels.mockResolvedValueOnce(rawModels);

    const res = await request(app).get('/api/models/nonexistent-model-id');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Model not found');
  });

  // Detail cache hit
  it('caches individual model lookups', async () => {
    fetchModels.mockResolvedValueOnce(rawModels);

    // First call populates both list and individual cache
    await request(app).get('/api/models/openai/gpt-4o');
    // Second call should hit the individual cache
    const res = await request(app).get('/api/models/openai/gpt-4o');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('openai/gpt-4o');
    expect(fetchModels).toHaveBeenCalledTimes(1);
  });
});

describe('Error handling', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    cache.invalidateAll();
    vi.clearAllMocks();
  });

  // TC-013: API key not leaked
  it('TC-013: API key never appears in error responses', async () => {
    const apiError = new Error(
      'OpenRouter API error: 401 Unauthorized with key sk-test-secret-key-12345'
    );
    apiError.status = 503;
    fetchModels.mockRejectedValueOnce(apiError);

    const res = await request(app).get('/api/models');

    const body = JSON.stringify(res.body);
    expect(body).not.toContain('sk-test-secret-key-12345');
  });

  // TC-014: OpenRouter 5xx → 503 with no cache
  it('TC-014: returns 503 when OpenRouter fails and no cache available', async () => {
    const apiError = new Error(
      'OpenRouter API error: 500 Internal Server Error'
    );
    apiError.status = 503;
    fetchModels.mockRejectedValueOnce(apiError);

    const res = await request(app).get('/api/models');

    expect(res.status).toBe(503);
    expect(res.body.error).toBeDefined();
  });

  // TC-015: Stale cache fallback
  it('TC-015: serves stale cache on OpenRouter error', async () => {
    // Prime cache
    fetchModels.mockResolvedValueOnce(rawModels);
    await request(app).get('/api/models');

    // Expire cache
    cache.invalidate('models');

    // Set stale data manually (simulate expired entry)
    cache.set('models', rawModels.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? null,
      provider: r.id.split('/')[0],
      categories: [],
      pricing: { prompt: null, completion: null, currency: 'USD' },
      contextWindow: null,
      maxOutput: null,
      modalities: [],
      qualityScore: null,
      latency: null,
      parameters: null,
      archived: false,
      created: null,
    })), 1); // 1ms TTL

    // Wait for expiry
    await new Promise((r) => setTimeout(r, 10));

    // OpenRouter fails
    const apiError = new Error('OpenRouter API error: 500');
    apiError.status = 503;
    fetchModels.mockRejectedValueOnce(apiError);

    const res = await request(app).get('/api/models');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  // TC-018: No API key → 503
  it('TC-018: returns 503 when OPENROUTER_API_KEY is missing', async () => {
    const originalKey = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;

    const keyError = new Error(
      'OPENROUTER_API_KEY is not set. Please configure it in your .env file.'
    );
    fetchModels.mockRejectedValueOnce(keyError);

    const res = await request(app).get('/api/models');

    expect(res.status).toBe(503);
    expect(res.body.error).toBeDefined();
    expect(res.body.error).not.toContain('OPENROUTER_API_KEY');

    // Restore
    if (originalKey) process.env.OPENROUTER_API_KEY = originalKey;
  });

  // TC-024: 429 rate limit with stale cache → 200
  it('TC-024: serves stale cache on 429 rate limit', async () => {
    // Prime cache with real data
    fetchModels.mockResolvedValueOnce(rawModels);
    await request(app).get('/api/models');

    // Set stale entry
    cache.set('models', rawModels.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? null,
      provider: r.id.split('/')[0],
      categories: [],
      pricing: { prompt: null, completion: null, currency: 'USD' },
      contextWindow: null,
      maxOutput: null,
      modalities: [],
      qualityScore: null,
      latency: null,
      parameters: null,
      archived: false,
      created: null,
    })), 1);

    await new Promise((r) => setTimeout(r, 10));

    // 429 error
    const rateLimitError = new Error(
      'OpenRouter API error: 429 Too Many Requests'
    );
    rateLimitError.status = 429;
    fetchModels.mockRejectedValueOnce(rateLimitError);

    const res = await request(app).get('/api/models');

    expect(res.status).toBe(200);
  });

  // TC-025: Timeout → 503
  it('TC-025: returns 503 on timeout with no cache', async () => {
    const timeoutError = new Error('OpenRouter API request timed out.');
    timeoutError.status = 504;
    fetchModels.mockRejectedValueOnce(timeoutError);

    const res = await request(app).get('/api/models');

    expect(res.status).toBe(503);
    expect(res.body.error).toContain('timed out');
  });
});
