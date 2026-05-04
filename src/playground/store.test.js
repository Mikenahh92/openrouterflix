/**
 * Store tests for the playground Zustand store.
 *
 * Covers:
 *   - Initial state
 *   - setSelectedModel, setPrompt
 *   - submitPrompt success and error
 *   - clearResponse, clearAll
 *   - fetchModels with caching guard
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
    });
    usePlaygroundStore.getState().clearAll();
    const state = usePlaygroundStore.getState();
    expect(state.selectedModel).toBeNull();
    expect(state.prompt).toBe('');
    expect(state.response).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
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
