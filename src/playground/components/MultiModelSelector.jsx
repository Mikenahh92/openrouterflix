/**
 * MultiModelSelector — Multi-select combobox for selecting 2–4 models.
 *
 * Shows a searchable dropdown where models can be toggled on/off.
 * Selected models appear as removable chips/tags above the dropdown.
 * Enforces min 2 / max 4 selection constraints.
 * Follows WAI-ARIA combobox pattern.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Plus } from 'lucide-react';

const MIN_MODELS = 2;
const MAX_MODELS = 4;

export default function MultiModelSelector({
  models,
  selectedModels,
  onAddModel,
  onRemoveModel,
  isLoading,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selectedSet = new Set(selectedModels);
  const isAtMax = selectedModels.length >= MAX_MODELS;

  // Filter models by search text, excluding already selected
  const filteredModels = models.filter((m) => {
    const matchesSearch = (m.name || m.id)
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesSearch;
  });

  // Available models (not yet selected)
  const availableModels = filteredModels.filter(
    (m) => !selectedSet.has(m.id)
  );

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [search, isOpen]);

  const handleAdd = useCallback(
    (modelId) => {
      onAddModel(modelId);
      setSearch('');
      // Don't close — user may want to add more
    },
    [onAddModel]
  );

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < availableModels.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : availableModels.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < availableModels.length
        ) {
          handleAdd(availableModels[highlightedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  // Scroll highlighted option into view
  useEffect(() => {
    if (
      listRef.current &&
      highlightedIndex >= 0 &&
      highlightedIndex < availableModels.length
    ) {
      const option = listRef.current.children[highlightedIndex];
      if (option && typeof option.scrollIntoView === 'function') {
        option.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, availableModels.length]);

  // Resolve selected model data for chips
  const selectedModelData = selectedModels
    .map((id) => models.find((m) => m.id === id))
    .filter(Boolean);

  const inputId = 'multi-model-selector-input';
  const listboxId = 'multi-model-selector-listbox';

  return (
    <div className="bg-surface-raised rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <label
          className="text-xs font-medium text-slate-500 uppercase tracking-wide block"
          htmlFor={inputId}
        >
          Models ({selectedModels.length}/{MAX_MODELS})
        </label>
        {selectedModels.length > 0 && selectedModels.length < MIN_MODELS && (
          <span className="text-xs text-amber-400">
            Select at least {MIN_MODELS} models
          </span>
        )}
      </div>

      {/* Selected model chips */}
      {selectedModelData.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedModelData.map((model) => (
            <span
              key={model.id}
              className="inline-flex items-center gap-1.5 bg-violet-500/10 text-violet-300 border border-violet-500/20 rounded-lg px-2.5 py-1 text-xs"
            >
              <span className="truncate max-w-[180px]">
                {model.name || model.id}
              </span>
              <span className="bg-cyan-500/10 text-cyan-400 rounded-full text-[10px] px-1.5 py-0.5">
                {model.provider || 'Unknown'}
              </span>
              <button
                type="button"
                aria-label={`Remove ${model.name || model.id}`}
                className="text-violet-400 hover:text-white transition-colors cursor-pointer ml-0.5"
                onClick={() => onRemoveModel(model.id)}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            ref={inputRef}
            id={inputId}
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={
              highlightedIndex >= 0
                ? `multi-model-option-${highlightedIndex}`
                : undefined
            }
            type="text"
            className="w-full bg-surface-base border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-surface-raised outline-none"
            placeholder={
              isAtMax
                ? `${MAX_MODELS} models selected`
                : 'Search models to add...'
            }
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              if (!isAtMax) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            disabled={isAtMax}
          />
          {!isAtMax && (
            <Plus className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          )}
        </div>

        {isOpen && !isAtMax && (
          <div
            id={listboxId}
            ref={listRef}
            role="listbox"
            className="absolute z-10 mt-1 w-full bg-surface-overlay border border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto"
          >
            {isLoading ? (
              <div className="px-3 py-4 text-sm text-slate-500 text-center">
                Loading models...
              </div>
            ) : availableModels.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-500 text-center">
                {search ? 'No models found' : 'All models selected'}
              </div>
            ) : (
              availableModels.map((model, index) => (
                <div
                  key={model.id}
                  id={`multi-model-option-${index}`}
                  role="option"
                  aria-selected={false}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-2 ${
                    index === highlightedIndex
                      ? 'bg-violet-500/10 text-violet-200'
                      : 'text-slate-100 hover:bg-violet-500/5'
                  }`}
                  onClick={() => handleAdd(model.id)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span className="truncate">{model.name || model.id}</span>
                  <span className="bg-cyan-500/10 text-cyan-400 rounded-full text-xs px-2 py-0.5 shrink-0">
                    {model.provider || 'Unknown'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
