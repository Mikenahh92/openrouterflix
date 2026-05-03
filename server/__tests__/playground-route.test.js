import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import * as cache from '../services/cache.js';

// Mock the openrouter module before importing routes
vi.mock('../services/openrouter.js', () => ({
  fetchModels: vi.fn(),
  fetchChatCompletion: vi.fn(),
}));

// Import after mocking
const { fetchModels, fetchChatCompletion } = await import(
  '../services/openrouter.js'
);
const { default: playgroundRouter } = await import('../routes/playground.js');
const { errorHandler } = await import('../middleware/errorHandler.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/playground', playgroundRouter);
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
];

const chatCompletionResponse = {
  id: 'chatcmpl-123',
  object: 'chat.completion',
  model: 'openai/gpt-4o',
  choices: [
    {
      index: 0,
      message: { role: 'assistant', content: 'Hello! How can I help you?' },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 8,
    total_tokens: 18,
  },
};

describe('POST /api/playground', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    cache.invalidateAll();
    vi.clearAllMocks();
  });

  // TC-001: Happy path — returns response text with metadata
  it('TC-001: returns 200 with text, usage, cost, and latency', async () => {
    fetchChatCompletion.mockResolvedValueOnce(chatCompletionResponse);
    fetchModels.mockResolvedValueOnce(rawModels);

    const res = await request(app).post('/api/playground').send({
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.text).toBe('Hello! How can I help you?');
    expect(res.body.data.model).toBe('openai/gpt-4o');
    expect(res.body.data.usage).toEqual({
      prompt_tokens: 10,
      completion_tokens: 8,
      total_tokens: 18,
    });
    expect(res.body.data.cost).toBeDefined();
    expect(res.body.data.cost.totalCost).toBeGreaterThan(0);
    expect(res.body.data.cost.currency).toBe('USD');
    expect(typeof res.body.data.latency_ms).toBe('number');
    expect(res.body.data.latency_ms).toBeGreaterThanOrEqual(0);
  });

  // TC-002: Request validation — missing model
  it('TC-002: returns 400 when model is missing', async () => {
    const res = await request(app).post('/api/playground').send({
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('model');
  });

  // TC-003: Request validation — missing messages
  it('TC-003: returns 400 when messages is missing', async () => {
    const res = await request(app).post('/api/playground').send({
      model: 'openai/gpt-4o',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('messages');
  });

  // TC-004: Request validation — empty messages array
  it('TC-004: returns 400 when messages is empty', async () => {
    const res = await request(app).post('/api/playground').send({
      model: 'openai/gpt-4o',
      messages: [],
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('messages');
  });

  // TC-005: Request validation — invalid role
  it('TC-005: returns 400 for invalid message role', async () => {
    const res = await request(app).post('/api/playground').send({
      model: 'openai/gpt-4o',
      messages: [{ role: 'hacker', content: 'Hello' }],
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('role');
  });

  // TC-006: Request validation — content not a string
  it('TC-006: returns 400 when content is not a string', async () => {
    const res = await request(app).post('/api/playground').send({
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 123 }],
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('content');
  });

  // TC-007: Request validation — temperature out of range
  it('TC-007: returns 400 for temperature > 2', async () => {
    const res = await request(app).post('/api/playground').send({
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
      temperature: 5,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('temperature');
  });

  // TC-008: Request validation — negative temperature
  it('TC-008: returns 400 for negative temperature', async () => {
    const res = await request(app).post('/api/playground').send({
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
      temperature: -0.5,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('temperature');
  });

  // TC-009: Request validation — max_tokens not positive integer
  it('TC-009: returns 400 for non-integer max_tokens', async () => {
    const res = await request(app).post('/api/playground').send({
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: -10,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('max_tokens');
  });

  // TC-010: Request validation — no body
  it('TC-010: returns 400 when body is missing', async () => {
    const res = await request(app).post('/api/playground');

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  // TC-011: OpenRouter error → 503
  it('TC-011: returns 503 when OpenRouter fails', async () => {
    const apiError = new Error(
      'OpenRouter API error: 500 Internal Server Error'
    );
    apiError.status = 503;
    fetchChatCompletion.mockRejectedValueOnce(apiError);

    const res = await request(app).post('/api/playground').send({
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(res.status).toBe(503);
    expect(res.body.error).toBeDefined();
  });

  // TC-012: Timeout → 503
  it('TC-012: returns 503 on timeout', async () => {
    const timeoutError = new Error('OpenRouter API request timed out.');
    timeoutError.status = 504;
    fetchChatCompletion.mockRejectedValueOnce(timeoutError);

    const res = await request(app).post('/api/playground').send({
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(res.status).toBe(503);
    expect(res.body.error).toContain('timed out');
  });

  // TC-013: API key not leaked in error response
  it('TC-013: API key never appears in error responses', async () => {
    const apiError = new Error(
      'OpenRouter API error: 401 Unauthorized with key sk-test-secret-key-12345'
    );
    apiError.status = 503;
    fetchChatCompletion.mockRejectedValueOnce(apiError);

    const res = await request(app).post('/api/playground').send({
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    const body = JSON.stringify(res.body);
    expect(body).not.toContain('sk-test-secret-key-12345');
  });

  // TC-014: System message is accepted
  it('TC-014: accepts system message in messages array', async () => {
    fetchChatCompletion.mockResolvedValueOnce(chatCompletionResponse);
    fetchModels.mockResolvedValueOnce(rawModels);

    const res = await request(app).post('/api/playground').send({
      model: 'openai/gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.text).toBeDefined();
  });

  // TC-015: Cost is null when pricing lookup fails
  it('TC-015: cost is null when model pricing is unavailable', async () => {
    fetchChatCompletion.mockResolvedValueOnce(chatCompletionResponse);
    fetchModels.mockRejectedValueOnce(new Error('API error'));

    const res = await request(app).post('/api/playground').send({
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.cost).toBeNull();
  });

  // TC-016: Passes temperature and max_tokens to OpenRouter
  it('TC-016: passes optional temperature and max_tokens to OpenRouter', async () => {
    fetchChatCompletion.mockResolvedValueOnce(chatCompletionResponse);
    fetchModels.mockResolvedValueOnce(rawModels);

    await request(app).post('/api/playground').send({
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
      temperature: 0.7,
      max_tokens: 100,
    });

    expect(fetchChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'openai/gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        max_tokens: 100,
      })
    );
  });

  // TC-017: Empty response text
  it('TC-017: handles empty assistant content gracefully', async () => {
    const emptyResponse = {
      ...chatCompletionResponse,
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: '' },
          finish_reason: 'stop',
        },
      ],
    };
    fetchChatCompletion.mockResolvedValueOnce(emptyResponse);
    fetchModels.mockResolvedValueOnce(rawModels);

    const res = await request(app).post('/api/playground').send({
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.text).toBe('');
  });

  // TC-018: No usage in response
  it('TC-018: handles missing usage in OpenRouter response', async () => {
    const noUsageResponse = {
      ...chatCompletionResponse,
      usage: undefined,
    };
    fetchChatCompletion.mockResolvedValueOnce(noUsageResponse);
    fetchModels.mockResolvedValueOnce(rawModels);

    const res = await request(app).post('/api/playground').send({
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.usage).toEqual({
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    });
  });

  // TC-019: Latency is measured correctly
  it('TC-019: latency_ms reflects actual elapsed time', async () => {
    fetchChatCompletion.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(chatCompletionResponse), 50))
    );
    fetchModels.mockResolvedValueOnce(rawModels);

    const res = await request(app).post('/api/playground').send({
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.latency_ms).toBeGreaterThanOrEqual(40);
  });

  // TC-020: Non-string model
  it('TC-020: returns 400 when model is not a string', async () => {
    const res = await request(app).post('/api/playground').send({
      model: 123,
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('model');
  });

  // TC-021: Cost estimation with known pricing
  it('TC-021: calculates correct cost from model pricing', async () => {
    fetchChatCompletion.mockResolvedValueOnce(chatCompletionResponse);
    fetchModels.mockResolvedValueOnce(rawModels);

    const res = await request(app).post('/api/playground').send({
      model: 'openai/gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(res.status).toBe(200);
    // Pricing: prompt $5/1M, completion $15/1M (per normalizer: 0.000005 * 1M = 5, 0.000015 * 1M = 15)
    // Usage: 10 prompt, 8 completion
    // Expected: promptCost = 10/1M * 5 = 0.00005, completionCost = 8/1M * 15 = 0.00012
    expect(res.body.data.cost.promptCost).toBeCloseTo(0.00005, 6);
    expect(res.body.data.cost.completionCost).toBeCloseTo(0.00012, 6);
    expect(res.body.data.cost.totalCost).toBeCloseTo(0.00017, 6);
  });
});

describe('Cost estimator', () => {
  // Direct unit test for the cost estimator
  it('calculates cost correctly for known inputs', async () => {
    const { estimateCost } = await import('../services/costEstimator.js');

    const pricing = { prompt: 5, completion: 15, currency: 'USD' };
    const usage = { prompt_tokens: 1000, completion_tokens: 500 };

    const cost = estimateCost(pricing, usage);

    expect(cost.promptCost).toBeCloseTo(0.005, 6);
    expect(cost.completionCost).toBeCloseTo(0.0075, 6);
    expect(cost.totalCost).toBeCloseTo(0.0125, 6);
    expect(cost.currency).toBe('USD');
  });

  it('returns zero cost when pricing is null', async () => {
    const { estimateCost } = await import('../services/costEstimator.js');

    const pricing = { prompt: null, completion: null, currency: 'USD' };
    const usage = { prompt_tokens: 1000, completion_tokens: 500 };

    const cost = estimateCost(pricing, usage);

    expect(cost.promptCost).toBe(0);
    expect(cost.completionCost).toBe(0);
    expect(cost.totalCost).toBe(0);
  });

  it('handles empty usage', async () => {
    const { estimateCost } = await import('../services/costEstimator.js');

    const pricing = { prompt: 5, completion: 15, currency: 'USD' };
    const cost = estimateCost(pricing, {});

    expect(cost.promptCost).toBe(0);
    expect(cost.completionCost).toBe(0);
    expect(cost.totalCost).toBe(0);
  });
});
