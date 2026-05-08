/**
 * usePlayground — hook encapsulating playground store interaction.
 *
 * Returns store state + derived data for the PlaygroundPage component.
 * Triggers fetchModels on mount if models not yet loaded.
 * Optionally accepts an initialModelId to pre-select from the URL.
 */
import { useEffect } from 'react';
import usePlaygroundStore from '../store';

export default function usePlayground(initialModelId) {
  const selectedModel = usePlaygroundStore((s) => s.selectedModel);
  const models = usePlaygroundStore((s) => s.models);
  const modelsLoaded = usePlaygroundStore((s) => s.modelsLoaded);
  const prompt = usePlaygroundStore((s) => s.prompt);
  const response = usePlaygroundStore((s) => s.response);
  const isLoading = usePlaygroundStore((s) => s.isLoading);
  const error = usePlaygroundStore((s) => s.error);

  // Multi-model state
  const mode = usePlaygroundStore((s) => s.mode);
  const selectedModels = usePlaygroundStore((s) => s.selectedModels);
  const compareResults = usePlaygroundStore((s) => s.compareResults);
  const compareErrors = usePlaygroundStore((s) => s.compareErrors);
  const isCompareLoading = usePlaygroundStore((s) => s.isCompareLoading);

  // Actions
  const setSelectedModel = usePlaygroundStore((s) => s.setSelectedModel);
  const setPrompt = usePlaygroundStore((s) => s.setPrompt);
  const fetchModels = usePlaygroundStore((s) => s.fetchModels);
  const submitPrompt = usePlaygroundStore((s) => s.submitPrompt);
  const clearResponse = usePlaygroundStore((s) => s.clearResponse);
  const clearAll = usePlaygroundStore((s) => s.clearAll);

  // Multi-model actions
  const setMode = usePlaygroundStore((s) => s.setMode);
  const addCompareModel = usePlaygroundStore((s) => s.addCompareModel);
  const removeCompareModel = usePlaygroundStore((s) => s.removeCompareModel);
  const submitCompare = usePlaygroundStore((s) => s.submitCompare);
  const clearCompare = usePlaygroundStore((s) => s.clearCompare);

  // Fetch models on mount if not yet loaded
  useEffect(() => {
    if (!modelsLoaded) {
      fetchModels();
    }
  }, [modelsLoaded, fetchModels]);

  // Pre-select model from URL query param after models are loaded
  useEffect(() => {
    if (initialModelId && modelsLoaded && !selectedModel) {
      const modelExists = models.some((m) => m.id === initialModelId);
      if (modelExists) {
        setSelectedModel(initialModelId);
      }
    }
  }, [initialModelId, modelsLoaded, models, selectedModel, setSelectedModel]);

  // Resolve selected model info for display
  const selectedModelData = selectedModel
    ? models.find((m) => m.id === selectedModel) ?? null
    : null;

  return {
    // State
    mode,
    selectedModel,
    selectedModelData,
    models,
    modelsLoading: !modelsLoaded,
    prompt,
    response,
    isLoading,
    error,

    // Multi-model state
    selectedModels,
    compareResults,
    compareErrors,
    isCompareLoading,

    // Actions
    setSelectedModel,
    setPrompt,
    submitPrompt,
    clearResponse,
    clearAll,

    // Multi-model actions
    setMode,
    addCompareModel,
    removeCompareModel,
    submitCompare,
    clearCompare,
  };
}
