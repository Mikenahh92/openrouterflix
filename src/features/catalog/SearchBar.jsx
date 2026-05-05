import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '../../shared/hooks/useDebounce.js';
import { useFilters } from './useFilters.js';

/**
 * Search bar with debounced input (300ms), clear button, and URL sync.
 * Reads/writes filter state via useFilters hook.
 */
export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useFilters();
  const [localValue, setLocalValue] = useState(() => searchQuery);
  const debouncedValue = useDebounce(localValue, 300);

  // Sync debounced local value → store
  useEffect(() => {
    if (debouncedValue !== searchQuery) {
      if (setSearchQuery) setSearchQuery(debouncedValue);
    }
  }, [debouncedValue, searchQuery, setSearchQuery]);

  // Sync external changes (e.g. clearFilters) → local state
  useEffect(() => {
    if (searchQuery !== localValue && searchQuery !== debouncedValue) {
      setLocalValue(searchQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleChange = useCallback((e) => {
    setLocalValue(e.target.value);
  }, []);

  const handleClear = useCallback(() => {
    setLocalValue('');
    if (setSearchQuery) setSearchQuery('');
  }, [setSearchQuery]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        handleClear();
      }
    },
    [handleClear]
  );

  return (
    <div className="relative w-full">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
        size={18}
        aria-hidden="true"
      />
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Search models, providers, descriptions..."
        aria-label="Search models"
        className="w-full h-11 pl-10 pr-9 bg-surface-base border border-slate-800 rounded-lg
          text-sm text-slate-200 placeholder:text-slate-500
          focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 focus:outline-none
          transition-colors duration-150"
      />
      {localValue && (
        <button
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200
            transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
