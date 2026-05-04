/**
 * PlaygroundPage — Route-level component for /playground.
 *
 * Composes ModelSelector, PromptInput, and ResponsePanel in a vertical stack.
 * Uses the usePlayground hook for state management.
 * Terminal-inspired dark visual treatment.
 */
import { Terminal } from 'lucide-react';
import usePlayground from '../hooks/usePlayground';
import ModelSelector from './ModelSelector';
import PromptInput from './PromptInput';
import ResponsePanel from './ResponsePanel';

export default function PlaygroundPage() {
  const {
    selectedModel,
    selectedModelData,
    models,
    modelsLoading,
    prompt,
    response,
    isLoading,
    error,
    setSelectedModel,
    setPrompt,
    submitPrompt,
    clearResponse,
    clearAll,
  } = usePlayground();

  const isSendDisabled = !selectedModel;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="flex items-center gap-2 mb-6">
        <Terminal className="w-5 h-5 text-slate-400" />
        <h1 className="text-2xl font-semibold text-slate-100">Playground</h1>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-6">
        <ModelSelector
          models={models}
          selectedModel={selectedModel}
          onModelSelect={setSelectedModel}
          isLoading={modelsLoading}
        />

        <PromptInput
          prompt={prompt}
          onPromptChange={setPrompt}
          onSend={submitPrompt}
          onClear={clearResponse}
          isLoading={isLoading}
          isDisabled={isSendDisabled}
        />

        <ResponsePanel
          response={response}
          isLoading={isLoading}
          error={error}
          onRetry={submitPrompt}
          modelName={selectedModelData?.name || selectedModelData?.id || null}
          modelProvider={selectedModelData?.provider || null}
        />
      </div>
    </div>
  );
}
