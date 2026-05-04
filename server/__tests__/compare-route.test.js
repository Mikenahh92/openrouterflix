import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import * as cache from '../services/cache.js';

// Mock openrouter before importing routes
vi.mock('../services/openrouter.js', () => ({
  fetchModelById: vi.fn(),
}));

const { fetchModelById } = await import('../services/openrouter.js');
const { default: compareRouter } = await import('../routes/compare.js');
const { errorHandler } = await import('../middleware/errorHandler.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/compare', compareRouter);
  app.use(errorHandler);
  return app;
}

// --- Fixtures ---

const normalizedGpt4o = {
  id: 'openai/gpt-4o',
  name: 'GPT-4o',
  description: 'OpenAI flagship model',
  provider: 'openai',
  categories: ['text', 'image', 'chat'],
  pricing: { prompt: 5, completion: 15, currency: 'USD' },
  contextWindow: 128000,
  maxOutput: 16384,
  modalities: ['text', 'image'],
  qualityScore: 92,
  latency: 450,
  parameters: '1760B',
  archived: false,
  created: '2024-05-10T14:08:20.000Z',
};

const normalizedClaude = {
  id: 'anthropic/claude-3.5-sonnet',
  name: 'Claude 3.5 Sonnet',
  description: 'Anthropic smart model',
  provider: 'anthropic',
  categories: ['text', 'chat'],
  pricing: { prompt: 3, completion: 15, currency: 'USD' },
  contextWindow: 200000,
  maxOutput: 8192,
  modalities: ['text'],
  qualityScore: 90,
  latency: 300,
  parameters: 'unknown',
  archived: false,
  created: '2024-05-29T16:53:20.000Z',
};

const normalizedGemini = {
  id: 'google/gemini-1.5-pro',
  name: 'Gemini 1.5 Pro',
  description: 'Google multimodal model',
  provider: 'google',
  categories: ['text', 'image', 'chat'],
  pricing: { prompt: 1.25, completion: 5, currency: 'USD' },
  contextWindow: 1000000,
  maxOutput: 8192,
  modalities: ['text', 'image'],
  qualityScore: 88,
  latency: 350,
  parameters: null,
  archived: false,
  created: '2024-06-01T00:00:00.000Z',
};

const normalizedLlama = {
  id: 'meta/llama-3.1-8b',
  name: 'Llama 3.1 8B',
  description: 'Meta open model',
  provider: 'meta',
  categories: ['text', 'chat'],
  pricing: { prompt: 0, completion: 0, currency: 'USD' },
  contextWindow: 131072,
  maxOutput: 4096,
  modalities: ['text'],
  qualityScore: 75,
  latency: 200,
  parameters: '8B',
  archived: true,
  created: '2024-06-10T00:00:00.000Z',
};

describe('POST /api/compare — Input validation', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    cache.invalidateAll();
    vi.resetAllMocks();
  });

  it('returns 400 when modelIds is missing', async () => {
    const res = await request(app).post('/api/compare').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('modelIds');
  });

  it('returns 400 when modelIds is not an array', async () => {
    const res = await request(app).post('/api/compare').send({ modelIds: 'openai/gpt-4o' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when modelIds has fewer than 2 IDs', async () => {
    const res = await request(app).post('/api/compare').send({ modelIds: ['openai/gpt-4o'] });

    expect(res.status).toBe(400);
  });

  it('returns 400 when modelIds has more than 4 IDs', async () => {
    const res = await request(app).post('/api/compare').send({
      modelIds: ['a', 'b', 'c', 'd', 'e'],
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 when modelIds contains non-string elements', async () => {
    const res = await request(app).post('/api/compare').send({
      modelIds: ['openai/gpt-4o', 123],
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 when modelIds is empty array', async () => {
    const res = await request(app).post('/api/compare').send({ modelIds: [] });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/compare — Happy path', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    cache.invalidateAll();
    vi.resetAllMocks();
  });

  it('returns 200 with 2 models successfully compared', async () => {
    // Prime cache with normalized models
    cache.set('model:openai/gpt-4o', normalizedGpt4o);
    cache.set('model:anthropic/claude-3.5-sonnet', normalizedClaude);

    const res = await request(app).post('/api/compare').send({
      modelIds: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data[0].id).toBe('openai/gpt-4o');
    expect(res.body.data[1].id).toBe('anthropic/claude-3.5-sonnet');
  });

  it('returns 200 with 4 models (maximum)', async () => {
    cache.set('model:openai/gpt-4o', normalizedGpt4o);
    cache.set('model:anthropic/claude-3.5-sonnet', normalizedClaude);
    cache.set('model:google/gemini-1.5-pro', normalizedGemini);
    cache.set('model:meta/llama-3.1-8b', normalizedLlama);

    const res = await request(app).post('/api/compare').send({
      modelIds: [
        'openai/gpt-4o',
        'anthropic/claude-3.5-sonnet',
        'google/gemini-1.5-pro',
        'meta/llama-3.1-8b',
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(4);
    expect(res.body.errors).toBeUndefined();
  });

  it('returns normalized model shapes with all expected fields', async () => {
    cache.set('model:openai/gpt-4o', normalizedGpt4o);

    // Second model needs to be fetched and normalized
    fetchModelById.mockResolvedValueOnce({
      id: 'anthropic/claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      context_length: 200000,
      pricing: { prompt: '0.000003', completion: '0.000015' },
      architecture: { modality: ['text'] },
      top_provider: { max_completion_tokens: 8192, latency: 300 },
    });

    const res = await request(app).post('/api/compare').send({
      modelIds: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
    });

    expect(res.status).toBe(200);
    const model = res.body.data.find((m) => m.id === 'openai/gpt-4o');
    expect(model).toBeDefined();
    expect(model).toHaveProperty('id');
    expect(model).toHaveProperty('name');
    expect(model).toHaveProperty('description');
    expect(model).toHaveProperty('provider');
    expect(model).toHaveProperty('categories');
    expect(model).toHaveProperty('pricing');
    expect(model).toHaveProperty('contextWindow');
    expect(model).toHaveProperty('maxOutput');
    expect(model).toHaveProperty('modalities');
    expect(model).toHaveProperty('qualityScore');
    expect(model).toHaveProperty('latency');
    expect(model).toHaveProperty('parameters');
    expect(model).toHaveProperty('archived');
    expect(model).toHaveProperty('created');
  });
});

describe('POST /api/compare — Cache-first resolution', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    cache.invalidateAll();
    vi.resetAllMocks();
  });

  it('serves cached models without calling OpenRouter', async () => {
    cache.set('model:openai/gpt-4o', normalizedGpt4o);
    cache.set('model:anthropic/claude-3.5-sonnet', normalizedClaude);

    const res = await request(app).post('/api/compare').send({
      modelIds: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
    });

    expect(res.status).toBe(200);
    expect(fetchModelById).not.toHaveBeenCalled();
  });

  it('fetches uncached models from OpenRouter and caches the result', async () => {
    const rawModel = {
      id: 'openai/gpt-4o',
      name: 'GPT-4o',
      context_length: 128000,
      pricing: { prompt: '0.000005', completion: '0.000015' },
      architecture: { modality: ['text', 'image'] },
      top_provider: { max_completion_tokens: 16384, latency: 450 },
    };

    fetchModelById.mockResolvedValueOnce(rawModel);
    cache.set('model:anthropic/claude-3.5-sonnet', normalizedClaude);

    const res = await request(app).post('/api/compare').send({
      modelIds: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
    });

    expect(res.status).toBe(200);
    expect(fetchModelById).toHaveBeenCalledTimes(1);
    expect(fetchModelById).toHaveBeenCalledWith('openai/gpt-4o');
    expect(res.body.data).toHaveLength(2);
  });

  it('handles mixed cache-hit and cache-miss for same request', async () => {
    cache.set('model:openai/gpt-4o', normalizedGpt4o);

    const rawClaude = {
      id: 'anthropic/claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      context_length: 200000,
      pricing: { prompt: '0.000003', completion: '0.000015' },
      architecture: { modality: ['text'] },
      top_provider: { max_completion_tokens: 8192, latency: 300 },
    };
    fetchModelById.mockResolvedValueOnce(rawClaude);

    const res = await request(app).post('/api/compare').send({
      modelIds: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
    });

    expect(res.status).toBe(200);
    expect(fetchModelById).toHaveBeenCalledTimes(1);
    expect(fetchModelById).toHaveBeenCalledWith('anthropic/claude-3.5-sonnet');
    expect(res.body.data).toHaveLength(2);
  });
});

describe('POST /api/compare — Partial success', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    cache.invalidateAll();
    vi.resetAllMocks();
  });

  it('returns 200 with data + errors when some models are not found', async () => {
    cache.set('model:openai/gpt-4o', normalizedGpt4o);
    fetchModelById.mockResolvedValueOnce(null);

    const res = await request(app).post('/api/compare').send({
      modelIds: ['openai/gpt-4o', 'nonexistent-model'],
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe('openai/gpt-4o');
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0]).toEqual({
      id: 'nonexistent-model',
      reason: 'Model not found',
    });
  });

  it('returns 200 with data + errors when some models fail to fetch', async () => {
    cache.set('model:openai/gpt-4o', normalizedGpt4o);
    fetchModelById.mockRejectedValueOnce(new Error('Network timeout'));

    const res = await request(app).post('/api/compare').send({
      modelIds: ['openai/gpt-4o', 'broken/model'],
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].id).toBe('broken/model');
    expect(res.body.errors[0].reason).toBe('Network timeout');
  });

  it('returns partial success with 3 valid + 1 invalid out of 4', async () => {
    cache.set('model:openai/gpt-4o', normalizedGpt4o);
    cache.set('model:anthropic/claude-3.5-sonnet', normalizedClaude);
    cache.set('model:google/gemini-1.5-pro', normalizedGemini);
    fetchModelById.mockResolvedValueOnce(null);

    const res = await request(app).post('/api/compare').send({
      modelIds: [
        'openai/gpt-4o',
        'anthropic/claude-3.5-sonnet',
        'google/gemini-1.5-pro',
        'nonexistent-model',
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].id).toBe('nonexistent-model');
  });
});

describe('POST /api/compare — All models failed', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    cache.invalidateAll();
    vi.resetAllMocks();
  });

  it('returns 404 when all models are not found', async () => {
    fetchModelById.mockResolvedValue(null);

    const res = await request(app).post('/api/compare').send({
      modelIds: ['nonexistent1', 'nonexistent2'],
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No models found');
    expect(res.body.details).toHaveLength(2);
  });

  it('returns 404 when all models fail to fetch', async () => {
    fetchModelById.mockRejectedValue(new Error('Service unavailable'));

    const res = await request(app).post('/api/compare').send({
      modelIds: ['broken1', 'broken2'],
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No models found');
    expect(res.body.details).toHaveLength(2);
  });

  it('returns 404 with mixed errors (not found + fetch failure)', async () => {
    fetchModelById
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('Timeout'));

    const res = await request(app).post('/api/compare').send({
      modelIds: ['nonexistent', 'broken'],
    });

    expect(res.status).toBe(404);
    expect(res.body.details).toHaveLength(2);
  });
});

describe('POST /api/compare — Batch resolution', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    cache.invalidateAll();
    vi.resetAllMocks();
  });

  it('resolves all models in parallel (batch)', async () => {
    const callOrder = [];
    fetchModelById.mockImplementation(async (id) => {
      callOrder.push(id);
      return {
        id,
        name: `Model ${id}`,
        context_length: 100000,
        pricing: { prompt: '0.000001', completion: '0.000002' },
        architecture: { modality: ['text'] },
      };
    });

    const res = await request(app).post('/api/compare').send({
      modelIds: ['a/model1', 'b/model2', 'c/model3'],
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(callOrder).toEqual(['a/model1', 'b/model2', 'c/model3']);
  });
});
