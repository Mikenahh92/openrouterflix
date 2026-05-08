import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the api module using the same path that store.js uses
vi.mock('../shared/lib/api.js', () => ({
  api: {
    post: vi.fn(),
  },
}));

// Import api to reference in tests
import { api } from '../shared/lib/api.js';

// Import after mock setup
import { useStore } from '../shared/lib/store.js';

// ── Fixture data ────────────────────────────────────────────────────

const mockModels = [
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    pricing: { prompt: 5, completion: 15, currency: 'USD' },
    contextWindow: 128000,
    maxOutput: 16384,
    modalities: ['text', 'image'],
    qualityScore: 4.5,
    latency: 450,
    categories: ['chat', 'multimodal'],
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    pricing: { prompt: 3, completion: 15, currency: 'USD' },
    contextWindow: 200000,
    maxOutput: 8192,
    modalities: ['text'],
    qualityScore: 4.8,
    latency: 350,
    categories: ['chat', 'reasoning'],
  },
];

// ── Tests ───────────────────────────────────────────────────────────

describe('comparisonSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the comparison slice state between tests
    useStore.setState((s) => ({
      ...s,
      comparison: { models: [], loading: false, error: null, fetchModels: s.comparison.fetchModels },
    }));
  });

  // TC-STORE-01: fetchModels success — populates store
  it('TC-STORE-01: fetchModels success populates store with models', async () => {
    api.post.mockResolvedValueOnce({ data: { data: mockModels } });

    const { fetchModels } = useStore.getState().comparison;
    await fetchModels(['openai/gpt-4o', 'anthropic/claude-3.5-sonnet']);

    const state = useStore.getState().comparison;
    expect(state.models).toEqual(mockModels);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/compare', {
      modelIds: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
    });
  });

  // TC-STORE-02: fetchModels clears previous data
  it('TC-STORE-02: fetchModels clears previous data on new fetch', async () => {
    // First fetch
    api.post.mockResolvedValueOnce({ data: { data: [mockModels[0]] } });
    const { fetchModels } = useStore.getState().comparison;
    await fetchModels(['openai/gpt-4o']);

    expect(useStore.getState().comparison.models).toHaveLength(1);

    // Second fetch with different IDs
    api.post.mockResolvedValueOnce({ data: { data: mockModels } });
    await fetchModels(['openai/gpt-4o', 'anthropic/claude-3.5-sonnet']);

    const state = useStore.getState().comparison;
    expect(state.models).toHaveLength(2);
    expect(state.models).toEqual(mockModels);
  });

  // TC-STORE-03: fetchModels loading state
  it('TC-STORE-03: fetchModels sets loading=true during request', async () => {
    let resolvePromise;
    api.post.mockImplementationOnce(
      () => new Promise((resolve) => { resolvePromise = resolve; })
    );

    const { fetchModels } = useStore.getState().comparison;
    const promise = fetchModels(['a', 'b']);

    // While in-flight, loading should be true and models cleared
    expect(useStore.getState().comparison.loading).toBe(true);
    expect(useStore.getState().comparison.models).toEqual([]);

    resolvePromise({ data: { data: mockModels } });
    await promise;

    expect(useStore.getState().comparison.loading).toBe(false);
  });

  // TC-STORE-04: fetchModels error state
  it('TC-STORE-04: fetchModels error sets error and clears models', async () => {
    api.post.mockRejectedValueOnce({ message: 'Server error' });

    const { fetchModels } = useStore.getState().comparison;
    await fetchModels(['bad-id-1', 'bad-id-2']);

    const state = useStore.getState().comparison;
    expect(state.models).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Server error');
  });

  // TC-STORE-04b: fetchModels error with .error field
  it('TC-STORE-04b: fetchModels error with .error field uses that as message', async () => {
    api.post.mockRejectedValueOnce({ error: 'Too many models' });

    const { fetchModels } = useStore.getState().comparison;
    await fetchModels(['a', 'b', 'c', 'd', 'e']);

    expect(useStore.getState().comparison.error).toBe('Too many models');
  });

  // TC-STORE-05: fetchModels validates 2-4 IDs (delegates to API)
  it('TC-STORE-05: fetchModels still calls API with 1 ID (validation delegated to backend)', async () => {
    api.post.mockResolvedValueOnce({ data: { data: [mockModels[0]] } });

    const { fetchModels } = useStore.getState().comparison;
    await fetchModels(['only-one']);

    expect(api.post).toHaveBeenCalledWith('/compare', { modelIds: ['only-one'] });
    expect(useStore.getState().comparison.models).toHaveLength(1);
  });

  // TC-STORE-06: Comparison slice registration
  it('TC-STORE-06: comparison slice is registered in combined store', () => {
    const state = useStore.getState();
    expect(state.comparison).toBeDefined();
    expect(state.comparison.models).toEqual([]);
    expect(state.comparison.loading).toBe(false);
    expect(state.comparison.error).toBeNull();
    expect(typeof state.comparison.fetchModels).toBe('function');
  });

  // Partial success: data + errors
  it('handles partial success with errors array', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        data: [mockModels[0]],
        errors: [{ id: 'invalid-model', reason: 'Not found' }],
      },
    });

    const { fetchModels } = useStore.getState().comparison;
    await fetchModels(['openai/gpt-4o', 'invalid-model']);

    const state = useStore.getState().comparison;
    expect(state.models).toHaveLength(1);
    expect(state.models[0].id).toBe('openai/gpt-4o');
    expect(state.error).toContain('Some models could not be loaded');
    expect(state.error).toContain('invalid-model');
  });

  // Response with nested data
  it('handles response where data is directly the array', async () => {
    api.post.mockResolvedValueOnce({ data: mockModels });

    const { fetchModels } = useStore.getState().comparison;
    await fetchModels(['a', 'b']);

    expect(useStore.getState().comparison.models).toEqual(mockModels);
  });
});
