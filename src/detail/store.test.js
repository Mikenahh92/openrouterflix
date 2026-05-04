import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../shared/lib/api';

// Mock the api module
vi.mock('../shared/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

// Import after mock setup so the store uses the mocked api
import useDetailStore from './store';

const mockModel = {
  id: 'openai/gpt-4o',
  name: 'GPT-4o',
  description: 'Flagship multimodal model',
  provider: 'openai',
  pricing: { prompt: 5, completion: 15, currency: 'USD' },
  contextWindow: 128000,
  maxOutput: 16384,
  modalities: ['text', 'image'],
  qualityScore: 4.5,
  latency: 450,
  parameters: '1760B',
  archived: false,
};

describe('useDetailStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the zustand store between tests
    useDetailStore.setState({ model: null, loading: false, error: null });
  });

  // TC-01: Initial state
  it('TC-01: starts with null model, loading false, error null', () => {
    const state = useDetailStore.getState();
    expect(state.model).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  // TC-02: fetchModel success — sets model and loading lifecycle
  it('TC-02: fetchModel success sets model and clears loading/error', async () => {
    api.get.mockResolvedValueOnce({ data: mockModel });

    const { fetchModel } = useDetailStore.getState();
    await fetchModel('openai/gpt-4o');

    const state = useDetailStore.getState();
    expect(state.model).toEqual(mockModel);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(api.get).toHaveBeenCalledTimes(1);
    // Verify the model ID is encoded (slashes become %2F)
    expect(api.get).toHaveBeenCalledWith('/models/openai%2Fgpt-4o');
  });

  it('TC-02b: fetchModel sets loading=true during request', async () => {
    let resolvePromise;
    api.get.mockImplementationOnce(
      () => new Promise((resolve) => { resolvePromise = resolve; })
    );

    const { fetchModel } = useDetailStore.getState();
    const promise = fetchModel('test/model');

    // While the request is in-flight, loading should be true
    expect(useDetailStore.getState().loading).toBe(true);

    resolvePromise({ data: mockModel });
    await promise;

    expect(useDetailStore.getState().loading).toBe(false);
  });

  it('fetchModel error sets error message and clears loading', async () => {
    api.get.mockRejectedValueOnce({ message: 'Server error' });

    const { fetchModel } = useDetailStore.getState();
    await fetchModel('bad/model');

    const state = useDetailStore.getState();
    expect(state.model).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Server error');
  });

  it('fetchModel error with .error field uses that as message', async () => {
    api.get.mockRejectedValueOnce({ error: 'Not found' });

    const { fetchModel } = useDetailStore.getState();
    await fetchModel('missing/model');

    const state = useDetailStore.getState();
    expect(state.error).toBe('Not found');
  });

  it('fetchModel error with no message uses fallback string', async () => {
    api.get.mockRejectedValueOnce({});

    const { fetchModel } = useDetailStore.getState();
    await fetchModel('x');

    const state = useDetailStore.getState();
    expect(state.error).toBe('Failed to fetch model details');
  });

  it('encodes model IDs with special characters', async () => {
    api.get.mockResolvedValueOnce({ data: mockModel });

    const { fetchModel } = useDetailStore.getState();
    await fetchModel('org/model-v2');

    expect(api.get).toHaveBeenCalledWith('/models/org%2Fmodel-v2');
  });
});
