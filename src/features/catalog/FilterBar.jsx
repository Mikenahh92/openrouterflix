import { useState, useMemo, useCallback } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../../shared/lib/store.js';
import { SUPPORTED_MODALITIES } from '../../shared/lib/constants.js';
import { useFilters } from './useFilters.js';

/**
 * Sort option definitions for the dropdown.
 */
const SORT_OPTIONS = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'latency_asc', label: 'Latency: Fast → Slow' },
  { value: 'quality_desc', label: 'Quality: Best' },
  { value: 'newest', label: 'Newest' },
];

const FILTER_PANEL_ID = 'filter-panel';

/**
 * Collapsible/expandable filter bar with sort control and "Clear all" button.
 * Reads/writes filter state via useFilters hook.
 */
export default function FilterBar() {
  const [expanded, setExpanded] = useState(false);

  const { filters, setFilter, clearFilters, sortBy, setSortBy, activeFilterCount } =
    useFilters();

  const models = useStore((s) => s.catalog?.models ?? []);
  const categories = useStore((s) => s.catalog?.categories ?? []);

  // Derive provider options from loaded models
  const providerOptions = useMemo(() => {
    const set = new Set();
    for (const m of models) {
      if (m.provider) set.add(m.provider);
    }
    return [...set].sort();
  }, [models]);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleFilterChange = useCallback(
    (key) => (e) => {
      const value = e.target.value || null;
      if (setFilter) setFilter(key, value);
    },
    [setFilter]
  );

  const handleSortChange = useCallback(
    (e) => {
      if (setSortBy) setSortBy(e.target.value);
    },
    [setSortBy]
  );

  const handleClear = useCallback(() => {
    if (clearFilters) clearFilters();
  }, [clearFilters]);

  return (
    <div className="w-full bg-surface-raised border border-slate-800 rounded-lg overflow-hidden">
      {/* Toggle row — always visible */}
      <div className="flex items-center gap-3 h-12 px-4">
        {/* Filter toggle */}
        <button
          onClick={handleToggle}
          aria-label={expanded ? 'Collapse filters' : 'Expand filters'}
          aria-expanded={expanded}
          aria-controls={FILTER_PANEL_ID}
          className="flex items-center gap-2 text-sm text-slate-300 hover:text-slate-100
            transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
        >
          <SlidersHorizontal size={16} />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span
              className="ml-1 px-2 py-0.5 text-xs font-medium bg-violet-500/20 text-violet-300 rounded-full"
              aria-label={`${activeFilterCount} active filter${activeFilterCount !== 1 ? 's' : ''}`}
            >
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sort — always visible */}
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <span>Sort:</span>
          <select
            value={sortBy}
            onChange={handleSortChange}
            aria-label="Sort models"
            className="bg-surface-base border border-slate-800 rounded-md px-2 py-1 text-sm text-slate-300
              focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 focus:outline-none
              transition-colors cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {/* Clear all */}
        {activeFilterCount > 0 && (
          <button
            onClick={handleClear}
            aria-label="Clear all filters"
            className="text-xs text-red-400 hover:text-red-300 transition-colors ml-2
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Expanded filter controls */}
      {expanded && (
        <div
          id={FILTER_PANEL_ID}
          role="region"
          aria-label="Filter controls"
          className="border-t border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4
            animate-fadeIn"
        >
          {/* Category */}
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">
              Category
            </label>
            <select
              value={filters.category ?? ''}
              onChange={handleFilterChange('category')}
              aria-label="Filter by category"
              className="w-full bg-surface-base border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300
                focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 focus:outline-none
                transition-colors cursor-pointer"
            >
              <option value="">All categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Provider */}
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">
              Provider
            </label>
            <select
              value={filters.provider ?? ''}
              onChange={handleFilterChange('provider')}
              aria-label="Filter by provider"
              className="w-full bg-surface-base border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300
                focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 focus:outline-none
                transition-colors cursor-pointer"
            >
              <option value="">All providers</option>
              {providerOptions.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
          </div>

          {/* Modality */}
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">
              Modality
            </label>
            <select
              value={filters.modality ?? ''}
              onChange={handleFilterChange('modality')}
              aria-label="Filter by modality"
              className="w-full bg-surface-base border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300
                focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 focus:outline-none
                transition-colors cursor-pointer"
            >
              <option value="">All modalities</option>
              {SUPPORTED_MODALITIES.map((mod) => (
                <option key={mod} value={mod}>
                  {mod.charAt(0).toUpperCase() + mod.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Context Window (minimum) */}
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">
              Context Window (min)
            </label>
            <input
              type="number"
              value={filters.ctxWindow ?? ''}
              onChange={handleFilterChange('ctxWindow')}
              placeholder="e.g. 128000"
              step={1000}
              min={0}
              aria-label="Filter by minimum context window"
              className="w-full bg-surface-base border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300
                placeholder:text-slate-600
                focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 focus:outline-none
                transition-colors"
            />
          </div>

          {/* Price Min */}
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">
              Price Min ($/1M)
            </label>
            <input
              type="number"
              value={filters.priceMin ?? ''}
              onChange={handleFilterChange('priceMin')}
              placeholder="0.001"
              step={0.001}
              min={0}
              aria-label="Filter by minimum price"
              className="w-full bg-surface-base border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300
                placeholder:text-slate-600
                focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 focus:outline-none
                transition-colors"
            />
          </div>

          {/* Price Max */}
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1">
              Price Max ($/1M)
            </label>
            <input
              type="number"
              value={filters.priceMax ?? ''}
              onChange={handleFilterChange('priceMax')}
              placeholder="0.01"
              step={0.001}
              min={0}
              aria-label="Filter by maximum price"
              className="w-full bg-surface-base border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300
                placeholder:text-slate-600
                focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 focus:outline-none
                transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}
