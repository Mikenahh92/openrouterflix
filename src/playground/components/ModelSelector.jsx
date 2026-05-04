/**
 * ModelSelector — Searchable dropdown/combobox for single-model selection.
 *
 * Shows model name + provider badge per option. Supports keyboard navigation
 * (Arrow keys, Enter, Escape) and click-outside to close.
 * Follows WAI-ARIA combobox pattern.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';

export default function ModelSelector({
  models,
  selectedModel,
  onModelSelect,
  isLoading,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Find the selected model data for display
  const selectedModelData = selectedModel
    ? models.find((m) => m.id === selectedModel)
    : null;

  // Filter models by search text
  const filteredModels = models.filter((m) =>
    (m.name || m.id).toLowerCase().includes(search.toLowerCase())
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

  const handleSelect = useCallback(
    (modelId) => {
      onModelSelect(modelId);
      setIsOpen(false);
      setSearch('');
    },
    [onModelSelect]
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
          prev < filteredModels.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredModels.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredModels.length) {
          handleSelect(filteredModels[highlightedIndex].id);
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
      highlightedIndex < filteredModels.length
    ) {
      const option = listRef.current.children[highlightedIndex];
      if (option && typeof option.scrollIntoView === 'function') {
        option.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, filteredModels.length]);

  const displayValue = selectedModelData
    ? selectedModelData.name || selectedModelData.id
    : '';

  const inputId = 'model-selector-input';
  const listboxId = 'model-selector-listbox';

  return (
    <div className="bg-surface-raised rounded-xl p-5">
      <label
        className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block"
        htmlFor={inputId}
      >
        Model
      </label>
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          {selectedModelData && !isOpen ? (
            <button
              id={inputId}
              role="combobox"
              aria-expanded={isOpen}
              aria-autocomplete="list"
              aria-controls={listboxId}
              className="w-full bg-surface-base border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 text-left flex items-center gap-2 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-surface-raised outline-none cursor-pointer"
              onClick={() => {
                setIsOpen(true);
                setSearch('');
              }}
              onKeyDown={handleKeyDown}
              type="button"
            >
              <span className="flex-1 truncate">{displayValue}</span>
              <span className="bg-cyan-500/10 text-cyan-400 rounded-full text-xs px-2 py-0.5 shrink-0">
                {selectedModelData.provider || 'Unknown'}
              </span>
              <span className="text-slate-500 text-xs ml-1">▾</span>
            </button>
          ) : (
            <input
              ref={inputRef}
              id={inputId}
              role="combobox"
              aria-expanded={isOpen}
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-activedescendant={
                highlightedIndex >= 0
                  ? `model-option-${highlightedIndex}`
                  : undefined
              }
              type="text"
              className="w-full bg-surface-base border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-surface-raised outline-none"
              placeholder="Search models..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
            />
          )}
        </div>

        {isOpen && (
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
            ) : filteredModels.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-500 text-center">
                No models found
              </div>
            ) : (
              filteredModels.map((model, index) => (
                <div
                  key={model.id}
                  id={`model-option-${index}`}
                  role="option"
                  aria-selected={model.id === selectedModel}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-2 ${
                    index === highlightedIndex
                      ? 'bg-violet-500/10 text-violet-200'
                      : 'text-slate-100 hover:bg-violet-500/5'
                  }`}
                  onClick={() => handleSelect(model.id)}
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
