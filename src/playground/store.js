/**
 * Playground store — Zustand standalone store managing playground state.
 *
 * Supports both single-model mode and multi-model comparison mode.
 *
 * State shape:
 *   {
 *     // Single-model mode
 *     selectedModel: string | null,
 *     models: Array,
 *     modelsLoaded: boolean,
 *     prompt: string,
 *     response: { text, tokens, latency, cost } | null,
 *     isLoading: boolean,
 *     error: string | null,
 *
 *     // Multi-model comparison mode
 *     mode: 'single' | 'compare',
 *     selectedModels: string[],          // 2–4 model IDs
 *     compareResults: Array<{ model, text, tokens, latency, cost }>,
 *     compareErrors: Array<{ model, error }>,
 *     isCompareLoading: boolean,
 *   }
 *
 * Actions:
 *   setSelectedModel(modelId)
 *   setPrompt(text)
 *   fetchModels()
 *   submitPrompt()
 *   clearResponse()
 *   clearAll()
 *   setMode(mode)
 *   addCompareModel(modelId)
 *   removeCompareModel(modelId)
 *   submitCompare()
 *   clearCompare()
 */
import { create } from 'zustand';
import { api } from '../shared/lib/api';

const MAX_COMPARE_MODELS = 4;
const MIN_COMPARE_MODELS = 2;

const usePlaygroundStore = create((set, get) => ({
  // Model selection
  selectedModel: null,
  models: [],
  modelsLoaded: false,

  // Prompt
  prompt: '',

  // Response (single model)
  response: null,

  // Async state (single model)
  isLoading: false,
  error: null,

  // Multi-model comparison mode
  mode: 'single', // 'single' | 'compare'
  selectedModels: [],
  compareResults: [],
  compareErrors: [],
  isCompareLoading: false,

  // --- Single-model actions ---

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
      mode: 'single',
      selectedModels: [],
      compareResults: [],
      compareErrors: [],
      isCompareLoading: false,
    });
  },

  // --- Multi-model comparison actions ---

  setMode: (mode) => {
    set({
      mode,
      // Clear comparison state when switching modes
      compareResults: [],
      compareErrors: [],
      isCompareLoading: false,
    });
  },

  addCompareModel: (modelId) => {
    const { selectedModels } = get();
    if (selectedModels.includes(modelId)) return;
    if (selectedModels.length >= MAX_COMPARE_MODELS) return;
    set({ selectedModels: [...selectedModels, modelId] });
  },

  removeCompareModel: (modelId) => {
    const { selectedModels } = get();
    set({ selectedModels: selectedModels.filter((id) => id !== modelId) });
  },

  /**
   * Submit the same prompt to all selected models in parallel using
   * Promise.allSettled so that individual failures do not abort the others.
   * Each model gets its own POST /api/playground call (no batch endpoint).
   */
  submitCompare: async () => {
    const { selectedModels, prompt } = get();
    if (selectedModels.length < MIN_COMPARE_MODELS || !prompt.trim()) return;

    set({ isCompareLoading: true, compareResults: [], compareErrors: [] });

    const results = await Promise.allSettled(
      selectedModels.map(async (modelId) => {
        const response = await api.sendPlaygroundPrompt(modelId, prompt);
        return { model: modelId, ...response };
      })
    );

    const data = [];
    const errors = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        data.push(result.value);
      } else {
        const modelId =
          selectedModels[results.indexOf(result)];
        const message =
          result.reason?.message || result.reason || 'An unexpected error occurred';
        errors.push({ model: modelId, error: message });
      }
    }

    set({
      compareResults: data,
      compareErrors: errors,
      isCompareLoading: false,
    });
  },

  clearCompare: () => {
    set({
      selectedModels: [],
      compareResults: [],
      compareErrors: [],
      isCompareLoading: false,
    });
  },
}));

export default usePlaygroundStore;
