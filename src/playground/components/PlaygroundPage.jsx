/**
 * PlaygroundPage — Route-level component for /playground.
 *
 * Composes ModelSelector, PromptInput, and ResponsePanel in single mode.
 * Composes MultiModelSelector, PromptInput, and ComparisonGrid in compare mode.
 * Toggle between modes via tabs.
 * Reads optional `?model=:id` query param to pre-select a model on load.
 * Uses the usePlayground hook for state management.
 * Terminal-inspired dark visual treatment.
 * Integrates with template picker for loading prompt templates.
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Terminal, GitCompare } from 'lucide-react';
import usePlayground from '../hooks/usePlayground';
import ModelSelector from './ModelSelector';
import MultiModelSelector from './MultiModelSelector';
import PromptInput from './PromptInput';
import ResponsePanel from './ResponsePanel';
import ComparisonGrid from './ComparisonGrid';
import TemplatePicker from '../../templates/components/TemplatePicker';

export default function PlaygroundPage() {
  const [searchParams] = useSearchParams();
  const modelFromUrl = searchParams.get('model') || undefined;
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const {
    mode,
    selectedModel,
    selectedModelData,
    models,
    modelsLoading,
    prompt,
    response,
    isLoading,
    error,
    selectedModels,
    compareResults,
    compareErrors,
    isCompareLoading,
    setSelectedModel,
    setPrompt,
    submitPrompt,
    clearResponse,
    clearAll,
    setMode,
    addCompareModel,
    removeCompareModel,
    submitCompare,
    clearCompare,
  } = usePlayground(modelFromUrl);

  const isCompareMode = mode === 'compare';

  const isSendDisabled = isCompareMode
    ? selectedModels.length < 2 || isCompareLoading
    : !selectedModel;

  const isSending = isCompareMode ? isCompareLoading : isLoading;

  const handleSend = isCompareMode ? submitCompare : submitPrompt;
  const handleClear = isCompareMode
    ? () => {
        clearCompare();
        setPrompt('');
      }
    : clearResponse;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="flex items-center gap-2 mb-6">
        <Terminal className="w-5 h-5 text-slate-400" />
        <h1 className="text-2xl font-semibold text-slate-100">Playground</h1>
      </div>

      {/* Mode toggle tabs */}
      <div className="flex items-center gap-1 mb-6 bg-surface-raised rounded-lg p-1 w-fit">
        <button
          type="button"
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
            !isCompareMode
              ? 'bg-violet-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          onClick={() => setMode('single')}
        >
          Single Model
        </button>
        <button
          type="button"
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
            isCompareMode
              ? 'bg-violet-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          onClick={() => setMode('compare')}
        >
          <GitCompare className="w-3.5 h-3.5" />
          Compare
        </button>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-6">
        {/* Model selector — switches based on mode */}
        {isCompareMode ? (
          <MultiModelSelector
            models={models}
            selectedModels={selectedModels}
            onAddModel={addCompareModel}
            onRemoveModel={removeCompareModel}
            isLoading={modelsLoading}
          />
        ) : (
          <ModelSelector
            models={models}
            selectedModel={selectedModel}
            onModelSelect={setSelectedModel}
            isLoading={modelsLoading}
          />
        )}

        <PromptInput
          prompt={prompt}
          onPromptChange={setPrompt}
          onSend={handleSend}
          onClear={handleClear}
          onLoadTemplate={() => setIsTemplateModalOpen(true)}
          isLoading={isSending}
          isDisabled={isSendDisabled}
        />

        {/* Response panel — switches based on mode */}
        {isCompareMode ? (
          <ComparisonGrid
            models={models}
            selectedModels={selectedModels}
            compareResults={compareResults}
            compareErrors={compareErrors}
            isCompareLoading={isCompareLoading}
            onRetry={submitCompare}
          />
        ) : (
          <ResponsePanel
            response={response}
            isLoading={isLoading}
            error={error}
            onRetry={submitPrompt}
            modelName={selectedModelData?.name || selectedModelData?.id || null}
            modelProvider={selectedModelData?.provider || null}
          />
        )}
      </div>

      {/* Template picker modal */}
      {isTemplateModalOpen && (
        <TemplatePicker
          onClose={() => setIsTemplateModalOpen(false)}
          onApply={(resolvedText) => {
            setPrompt(resolvedText);
            setIsTemplateModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
