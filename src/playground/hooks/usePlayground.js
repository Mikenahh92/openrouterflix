/**
 * usePlayground — hook encapsulating playground store interaction.
 *
 * Returns store state + derived data for the PlaygroundPage component.
 * Triggers fetchModels on mount if models not yet loaded.
 */
import { useEffect } from 'react';
import usePlaygroundStore from '../store';

export default function usePlayground() {
  const selectedModel = usePlaygroundStore((s) => s.selectedModel);
  const models = usePlaygroundStore((s) => s.models);
  const modelsLoaded = usePlaygroundStore((s) => s.modelsLoaded);
  const prompt = usePlaygroundStore((s) => s.prompt);
  const response = usePlaygroundStore((s) => s.response);
  const isLoading = usePlaygroundStore((s) => s.isLoading);
  const error = usePlaygroundStore((s) => s.error);

  const setSelectedModel = usePlaygroundStore((s) => s.setSelectedModel);
  const setPrompt = usePlaygroundStore((s) => s.setPrompt);
  const fetchModels = usePlaygroundStore((s) => s.fetchModels);
  const submitPrompt = usePlaygroundStore((s) => s.submitPrompt);
  const clearResponse = usePlaygroundStore((s) => s.clearResponse);
  const clearAll = usePlaygroundStore((s) => s.clearAll);

  // Fetch models on mount if not yet loaded
  useEffect(() => {
    if (!modelsLoaded) {
      fetchModels();
    }
  }, [modelsLoaded, fetchModels]);

  // Resolve selected model info for display
  const selectedModelData = selectedModel
    ? models.find((m) => m.id === selectedModel) ?? null
    : null;

  return {
    // State
    selectedModel,
    selectedModelData,
    models,
    modelsLoading: !modelsLoaded,
    prompt,
    response,
    isLoading,
    error,

    // Actions
    setSelectedModel,
    setPrompt,
    submitPrompt,
    clearResponse,
    clearAll,
  };
}
