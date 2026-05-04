import { useEffect, useMemo } from 'react';
import { useStore } from '../../shared/lib/store.js';
import { catalogSlice } from './catalogSlice.js';
import CategoryRow from './CategoryRow.jsx';

// Initialize store with catalog slice (singleton pattern)
let storeInstance = null;

function getCatalogStore() {
  if (!storeInstance) {
    // Dynamic import would be cleaner but inline creation works for now
    // The store is created in store.js via createStore
    return null;
  }
  return storeInstance;
}

/**
 * Catalog home page — Netflix-style category rows with model cards.
 * Fetches categories and models from the backend API on mount.
 */
export default function CatalogPage() {
  // Access Zustand store directly — catalog slice is registered at app level
  const categories = useStore((s) => s.catalog?.categories ?? []);
  const models = useStore((s) => s.catalog?.models ?? []);
  const loading = useStore((s) => s.catalog?.loading ?? false);
  const error = useStore((s) => s.catalog?.error);
  const fetchCatalog = useStore((s) => s.catalog?.fetchCatalog);

  useEffect(() => {
    if (fetchCatalog) {
      fetchCatalog();
    }
  }, [fetchCatalog]);

  // Group models by category using the slug-based matching
  const categoryModelsMap = useMemo(() => {
    const map = new Map();

    // Build a map from raw category → display slug using the categories endpoint data
    // We match by checking if model.categories includes the category id (which is the slug)
    for (const category of categories) {
      const matchingModels = models.filter((model) => {
        if (!Array.isArray(model.categories)) return false;
        return model.categories.some((cat) => {
          // Match by slug: compare lowercase version
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

  // Empty state
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
      <div className="px-12 mb-6">
        <h1 className="text-3xl font-bold text-slate-100">Model Catalog</h1>
        <p className="text-sm text-slate-400 mt-1">
          Browse and discover AI models across {categories.length} categories
        </p>
      </div>

      {/* Category rows */}
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
    </div>
  );
}
