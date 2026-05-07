/**
 * Store tests for the playground Zustand store.
 *
 * Covers:
 *   - Initial state
 *   - setSelectedModel, setPrompt
 *   - submitPrompt success and error
 *   - clearResponse, clearAll
 *   - fetchModels with caching guard
 *   - Multi-model comparison: addCompareModel, removeCompareModel, submitCompare, setMode, clearCompare
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import usePlaygroundStore from './store';

// Mock the api module
vi.mock('../shared/lib/api', () => ({
  api: {
    get: vi.fn(),
    sendPlaygroundPrompt: vi.fn(),
  },
}));

import { api } from '../shared/lib/api';

describe('playground store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlaygroundStore.getState().clearAll();
  });

  it('has correct initial state', () => {
    const state = usePlaygroundStore.getState();
    expect(state.selectedModel).toBeNull();
    expect(state.prompt).toBe('');
    expect(state.response).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.models).toEqual([]);
    expect(state.modelsLoaded).toBe(false);
    expect(state.mode).toBe('single');
    expect(state.selectedModels).toEqual([]);
    expect(state.compareResults).toEqual([]);
    expect(state.compareErrors).toEqual([]);
    expect(state.isCompareLoading).toBe(false);
  });

  it('setSelectedModel updates selectedModel', () => {
    usePlaygroundStore.getState().setSelectedModel('gpt-4o');
    expect(usePlaygroundStore.getState().selectedModel).toBe('gpt-4o');
  });

  it('setPrompt updates prompt', () => {
    usePlaygroundStore.getState().setPrompt('Hello');
    expect(usePlaygroundStore.getState().prompt).toBe('Hello');
  });

  it('submitPrompt — success flow', async () => {
    const mockResponse = {
      text: 'Hello! How can I help?',
      tokens: 100,
      latency: 500,
      cost: 0.001,
    };
    api.sendPlaygroundPrompt.mockResolvedValue(mockResponse);

    usePlaygroundStore.getState().setSelectedModel('gpt-4o');
    usePlaygroundStore.getState().setPrompt('Hello');

    const promise = usePlaygroundStore.getState().submitPrompt();
    expect(usePlaygroundStore.getState().isLoading).toBe(true);

    await promise;

    const state = usePlaygroundStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.response).toEqual(mockResponse);
    expect(api.sendPlaygroundPrompt).toHaveBeenCalledWith('gpt-4o', 'Hello');
  });

  it('submitPrompt — error flow', async () => {
    api.sendPlaygroundPrompt.mockRejectedValue({
      status: 429,
      message: 'Rate limit exceeded',
    });

    usePlaygroundStore.getState().setSelectedModel('gpt-4o');
    usePlaygroundStore.getState().setPrompt('Hello');

    await usePlaygroundStore.getState().submitPrompt();

    const state = usePlaygroundStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Rate limit exceeded');
    expect(state.response).toBeNull();
  });

  it('submitPrompt — does nothing without model', async () => {
    usePlaygroundStore.getState().setPrompt('Hello');
    await usePlaygroundStore.getState().submitPrompt();
    expect(api.sendPlaygroundPrompt).not.toHaveBeenCalled();
  });

  it('submitPrompt — does nothing without prompt', async () => {
    usePlaygroundStore.getState().setSelectedModel('gpt-4o');
    usePlaygroundStore.getState().setPrompt('   ');
    await usePlaygroundStore.getState().submitPrompt();
    expect(api.sendPlaygroundPrompt).not.toHaveBeenCalled();
  });

  it('clearResponse resets response and error', () => {
    usePlaygroundStore.setState({
      response: { text: 'hi', tokens: 5, latency: 100, cost: 0 },
      error: 'some error',
    });
    usePlaygroundStore.getState().clearResponse();
    expect(usePlaygroundStore.getState().response).toBeNull();
    expect(usePlaygroundStore.getState().error).toBeNull();
  });

  it('clearAll resets all state to initial', () => {
    usePlaygroundStore.setState({
      selectedModel: 'gpt-4o',
      prompt: 'Hello',
      response: { text: 'hi', tokens: 5, latency: 100, cost: 0 },
      isLoading: false,
      error: null,
      mode: 'compare',
      selectedModels: ['gpt-4o', 'claude-3'],
    });
    usePlaygroundStore.getState().clearAll();
    const state = usePlaygroundStore.getState();
    expect(state.selectedModel).toBeNull();
    expect(state.prompt).toBe('');
    expect(state.response).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.mode).toBe('single');
    expect(state.selectedModels).toEqual([]);
    expect(state.compareResults).toEqual([]);
    expect(state.compareErrors).toEqual([]);
    expect(state.isCompareLoading).toBe(false);
  });

  it('fetchModels — success', async () => {
    const mockModels = [
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
      { id: 'claude-3', name: 'Claude 3', provider: 'Anthropic' },
    ];
    api.get.mockResolvedValue({ data: { data: mockModels } });

    await usePlaygroundStore.getState().fetchModels();

    const state = usePlaygroundStore.getState();
    expect(state.models).toEqual(mockModels);
    expect(state.modelsLoaded).toBe(true);
  });

  it('fetchModels — does not re-fetch if already loaded', async () => {
    usePlaygroundStore.setState({ modelsLoaded: true, models: [] });
    await usePlaygroundStore.getState().fetchModels();
    expect(api.get).not.toHaveBeenCalled();
  });
});

describe('playground store — multi-model comparison', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlaygroundStore.getState().clearAll();
  });

  it('setMode switches between single and compare', () => {
    usePlaygroundStore.getState().setMode('compare');
    expect(usePlaygroundStore.getState().mode).toBe('compare');

    usePlaygroundStore.getState().setMode('single');
    expect(usePlaygroundStore.getState().mode).toBe('single');
  });

  it('addCompareModel adds model to selectedModels', () => {
    usePlaygroundStore.getState().addCompareModel('gpt-4o');
    expect(usePlaygroundStore.getState().selectedModels).toEqual(['gpt-4o']);

    usePlaygroundStore.getState().addCompareModel('claude-3');
    expect(usePlaygroundStore.getState().selectedModels).toEqual([
      'gpt-4o',
      'claude-3',
    ]);
  });

  it('addCompareModel does not add duplicates', () => {
    usePlaygroundStore.getState().addCompareModel('gpt-4o');
    usePlaygroundStore.getState().addCompareModel('gpt-4o');
    expect(usePlaygroundStore.getState().selectedModels).toEqual(['gpt-4o']);
  });

  it('addCompareModel enforces max 4 models', () => {
    usePlaygroundStore.getState().addCompareModel('model-1');
    usePlaygroundStore.getState().addCompareModel('model-2');
    usePlaygroundStore.getState().addCompareModel('model-3');
    usePlaygroundStore.getState().addCompareModel('model-4');
    usePlaygroundStore.getState().addCompareModel('model-5'); // should be ignored
    expect(usePlaygroundStore.getState().selectedModels).toHaveLength(4);
  });

  it('removeCompareModel removes a model', () => {
    usePlaygroundStore.getState().addCompareModel('gpt-4o');
    usePlaygroundStore.getState().addCompareModel('claude-3');
    usePlaygroundStore.getState().removeCompareModel('gpt-4o');
    expect(usePlaygroundStore.getState().selectedModels).toEqual(['claude-3']);
  });

  it('submitCompare — success flow (parallel frontend requests)', async () => {
    api.sendPlaygroundPrompt
      .mockResolvedValueOnce({
        text: 'Hello from GPT',
        tokens: 50,
        latency: 500,
        cost: 0.001,
      })
      .mockResolvedValueOnce({
        text: 'Hello from Claude',
        tokens: 60,
        latency: 600,
        cost: 0.002,
      });

    usePlaygroundStore.getState().addCompareModel('gpt-4o');
    usePlaygroundStore.getState().addCompareModel('claude-3');
    usePlaygroundStore.getState().setPrompt('Hello');

    const promise = usePlaygroundStore.getState().submitCompare();
    expect(usePlaygroundStore.getState().isCompareLoading).toBe(true);

    await promise;

    const state = usePlaygroundStore.getState();
    expect(state.isCompareLoading).toBe(false);
    expect(state.compareResults).toHaveLength(2);
    expect(state.compareErrors).toEqual([]);

    // Verify parallel calls to the single-model endpoint
    expect(api.sendPlaygroundPrompt).toHaveBeenCalledTimes(2);
    expect(api.sendPlaygroundPrompt).toHaveBeenCalledWith('gpt-4o', 'Hello');
    expect(api.sendPlaygroundPrompt).toHaveBeenCalledWith('claude-3', 'Hello');

    // Verify results include model IDs
    const gptResult = state.compareResults.find((r) => r.model === 'gpt-4o');
    const claudeResult = state.compareResults.find((r) => r.model === 'claude-3');
    expect(gptResult.text).toBe('Hello from GPT');
    expect(claudeResult.text).toBe('Hello from Claude');
  });

  it('submitCompare — partial failure (one model succeeds, one fails)', async () => {
    api.sendPlaygroundPrompt
      .mockResolvedValueOnce({
        text: 'Hello',
        tokens: 50,
        latency: 500,
        cost: 0.001,
      })
      .mockRejectedValueOnce({ message: 'Rate limit exceeded' });

    usePlaygroundStore.getState().addCompareModel('gpt-4o');
    usePlaygroundStore.getState().addCompareModel('claude-3');
    usePlaygroundStore.getState().setPrompt('Hello');

    await usePlaygroundStore.getState().submitCompare();

    const state = usePlaygroundStore.getState();
    expect(state.isCompareLoading).toBe(false);
    expect(state.compareResults).toHaveLength(1);
    expect(state.compareErrors).toHaveLength(1);
    expect(state.compareErrors[0].model).toBe('claude-3');
    expect(state.compareErrors[0].error).toBe('Rate limit exceeded');
  });

  it('submitCompare — total failure (all models fail)', async () => {
    api.sendPlaygroundPrompt
      .mockRejectedValueOnce({ message: 'Service unavailable' })
      .mockRejectedValueOnce({ message: 'Service unavailable' });

    usePlaygroundStore.getState().addCompareModel('gpt-4o');
    usePlaygroundStore.getState().addCompareModel('claude-3');
    usePlaygroundStore.getState().setPrompt('Hello');

    await usePlaygroundStore.getState().submitCompare();

    const state = usePlaygroundStore.getState();
    expect(state.isCompareLoading).toBe(false);
    expect(state.compareErrors).toHaveLength(2);
    expect(state.compareResults).toEqual([]);
  });

  it('submitCompare — does nothing with fewer than 2 models', async () => {
    usePlaygroundStore.getState().addCompareModel('gpt-4o');
    usePlaygroundStore.getState().setPrompt('Hello');
    await usePlaygroundStore.getState().submitCompare();
    expect(api.sendPlaygroundPrompt).not.toHaveBeenCalled();
  });

  it('submitCompare — does nothing with empty prompt', async () => {
    usePlaygroundStore.getState().addCompareModel('gpt-4o');
    usePlaygroundStore.getState().addCompareModel('claude-3');
    usePlaygroundStore.getState().setPrompt('   ');
    await usePlaygroundStore.getState().submitCompare();
    expect(api.sendPlaygroundPrompt).not.toHaveBeenCalled();
  });

  it('clearCompare resets comparison state', () => {
    usePlaygroundStore.setState({
      selectedModels: ['gpt-4o', 'claude-3'],
      compareResults: [{ model: 'gpt-4o', text: 'Hi', tokens: 5, latency: 100, cost: 0 }],
      compareErrors: [],
      isCompareLoading: true,
    });
    usePlaygroundStore.getState().clearCompare();
    const state = usePlaygroundStore.getState();
    expect(state.selectedModels).toEqual([]);
    expect(state.compareResults).toEqual([]);
    expect(state.compareErrors).toEqual([]);
    expect(state.isCompareLoading).toBe(false);
  });

  it('setMode clears comparison results', () => {
    usePlaygroundStore.setState({
      mode: 'compare',
      compareResults: [{ model: 'gpt-4o', text: 'Hi', tokens: 5, latency: 100, cost: 0 }],
    });
    usePlaygroundStore.getState().setMode('single');
    expect(usePlaygroundStore.getState().compareResults).toEqual([]);
  });
});
