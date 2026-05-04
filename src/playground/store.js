/**
 * Playground store — Zustand standalone store managing playground state.
 *
 * State shape:
 *   {
 *     selectedModel: string | null,
 *     models: Array,
 *     modelsLoaded: boolean,
 *     prompt: string,
 *     response: { text, tokens, latency, cost } | null,
 *     isLoading: boolean,
 *     error: string | null,
 *   }
 *
 * Actions:
 *   setSelectedModel(modelId)
 *   setPrompt(text)
 *   fetchModels()
 *   submitPrompt()
 *   clearResponse()
 *   clearAll()
 */
import { create } from 'zustand';
import { api } from '../shared/lib/api';

const usePlaygroundStore = create((set, get) => ({
  // Model selection
  selectedModel: null,
  models: [],
  modelsLoaded: false,

  // Prompt
  prompt: '',

  // Response
  response: null,

  // Async state
  isLoading: false,
  error: null,

  setSelectedModel: (modelId) => {
    set({ selectedModel: modelId });
  },

  setPrompt: (text) => {
    set({ prompt: text });
  },

  fetchModels: async () => {
    const state = get();
    if (state.modelsLoaded) return;

    try {
      const result = await api.get('/models');
      const models = result.data?.data ?? [];
      set({ models, modelsLoaded: true });
    } catch {
      // Silently fail — ModelSelector will show empty state
      set({ modelsLoaded: true });
    }
  },

  submitPrompt: async () => {
    const { selectedModel, prompt } = get();
    if (!selectedModel || !prompt.trim()) return;

    set({ isLoading: true, error: null });

    try {
      const result = await api.sendPlaygroundPrompt(selectedModel, prompt);
      set({ response: result, isLoading: false });
    } catch (err) {
      const message = err?.message || 'An unexpected error occurred';
      set({ error: message, isLoading: false });
    }
  },

  clearResponse: () => {
    set({ response: null, error: null });
  },

  clearAll: () => {
    set({
      selectedModel: null,
      prompt: '',
      response: null,
      isLoading: false,
      error: null,
    });
  },
}));

export default usePlaygroundStore;
