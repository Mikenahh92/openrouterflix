import { useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useStore } from '../../shared/lib/store.js';
import { catalogSlice } from './catalogSlice.js';
import CategoryRow from './CategoryRow.jsx';
import ModelCard from './ModelCard.jsx';
import SearchBar from './SearchBar.jsx';
import FilterBar from './FilterBar.jsx';
import { useFilters } from './useFilters.js';

/**
 * Catalog home page — Netflix-style category rows with model cards,
 * plus filtering, sorting, and search capabilities.
 */
export default function CatalogPage() {
  // Access Zustand store directly — catalog slice is registered at app level
  const categories = useStore((s) => s.catalog?.categories ?? []);
  const loading = useStore((s) => s.catalog?.loading ?? false);
  const error = useStore((s) => s.catalog?.error);
  const fetchCatalog = useStore((s) => s.catalog?.fetchCatalog);

  const { isFiltered, filteredModels, clearFilters } = useFilters();

  useEffect(() => {
    if (fetchCatalog) {
      fetchCatalog();
    }
  }, [fetchCatalog]);

  // Group models by category using the slug-based matching (for unfiltered view)
  const models = useStore((s) => s.catalog?.models ?? []);
  const categoryModelsMap = useMemo(() => {
    const map = new Map();

    for (const category of categories) {
      const matchingModels = models.filter((model) => {
        if (!Array.isArray(model.categories)) return false;
        return model.categories.some((cat) => {
          const normalized = cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          return normalized === category.id || cat.toLowerCase() === category.id;
        });
      });
      map.set(category.id, matchingModels);
    }

    return map;
  }, [categories, models]);

  // Loading state
  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-12 py-16">
        <h1 className="text-3xl font-bold mb-8 text-slate-100">Model Catalog</h1>
        <div className="flex flex-col gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="h-6 w-48 bg-surface-raised rounded-md animate-pulse mb-3" />
              <div className="flex gap-4 overflow-hidden">
                {[...Array(5)].map((_, j) => (
                  <div
                    key={j}
                    className="min-w-[260px] max-w-[260px] h-64 bg-surface-raised rounded-xl animate-pulse"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-[1440px] mx-auto px-12 py-16">
        <h1 className="text-3xl font-bold mb-4 text-slate-100">Model Catalog</h1>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300">
          <p className="font-medium mb-1">Failed to load catalog</p>
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => fetchCatalog?.()}
            className="mt-3 px-4 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 rounded-md
              transition-colors text-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state (no categories loaded)
  if (categories.length === 0 && !loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-12 py-16">
        <h1 className="text-3xl font-bold mb-4 text-slate-100">Model Catalog</h1>
        <p className="text-slate-400">
          No models available yet. Check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto py-8">
      {/* Page header */}
      <div className="px-12 mb-4">
        <h1 className="text-3xl font-bold text-slate-100">Model Catalog</h1>
        <p className="text-sm text-slate-400 mt-1">
          {isFiltered
            ? `${filteredModels.length} model${filteredModels.length !== 1 ? 's' : ''} found`
            : `Browse and discover AI models across ${categories.length} categories`}
        </p>
      </div>

      {/* Search + Filter bar */}
      <div className="px-12 mb-6 flex flex-col gap-3">
        <SearchBar />
        <FilterBar />
      </div>

      {/* Content area */}
      {isFiltered ? (
        // Filtered view: flat responsive grid
        filteredModels.length === 0 ? (
          <div className="px-12 py-16 flex flex-col items-center text-center">
            <Search size={48} className="text-slate-600 mb-4" />
            <p className="text-lg text-slate-400 mb-2">No models match your filters</p>
            <p className="text-sm text-slate-500 mb-4">
              Try adjusting your search or filter criteria
            </p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm bg-violet-500 hover:bg-violet-600 text-white rounded-lg
                transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="px-12">
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              }}
            >
              {filteredModels.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
          </div>
        )
      ) : (
        // Default view: category rows
        <div className="flex flex-col gap-2">
          {categories.map((category) => {
            const rowModels = categoryModelsMap.get(category.id) ?? [];
            if (rowModels.length === 0) return null;
            return (
              <CategoryRow
                key={category.id}
                category={category}
                models={rowModels}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
