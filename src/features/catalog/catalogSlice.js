/**
 * Zustand catalog slice — manages categories, models, filter/sort/search state, and compare selections.
 */
import { api } from '../../shared/lib/api.js';
import { API_ROUTES } from '../../shared/lib/constants.js';

/**
 * Create the catalog slice.
 * @param {Function} set - Zustand set
 * @param {Function} get - Zustand get
 * @returns {object} Catalog slice state and actions
 */
export function catalogSlice(set, get) {
  return {
    // Data state
    categories: [],
    models: [],
    loading: false,
    error: null,

    // Filter/sort/search state
    filters: {
      category: null,
      provider: null,
      priceMin: null,
      priceMax: null,
      modality: null,
      ctxWindow: null,
    },
    sortBy: 'popularity',
    searchQuery: '',

    // Compare selection state
    compareSelections: [],

    // Actions

    async fetchCatalog() {
      const state = get().catalog;
      if (state.loading) return;

      set((s) => ({
        catalog: { ...s.catalog, loading: true, error: null },
      }));

      try {
        const [categoriesRes, modelsRes] = await Promise.all([
          api.get(API_ROUTES.CATEGORIES),
          api.get(API_ROUTES.MODELS),
        ]);

        set((s) => ({
          catalog: {
            ...s.catalog,
            categories: categoriesRes.data?.data ?? [],
            models: modelsRes.data?.data ?? [],
            loading: false,
            error: null,
          },
        }));
      } catch (err) {
        set((s) => ({
          catalog: {
            ...s.catalog,
            loading: false,
            error: err.message || 'Failed to load catalog',
          },
        }));
      }
    },

    setFilter(key, value) {
      set((s) => ({
        catalog: {
          ...s.catalog,
          filters: { ...s.catalog.filters, [key]: value },
        },
      }));
    },

    setSortBy(sort) {
      set((s) => ({
        catalog: { ...s.catalog, sortBy: sort },
      }));
    },

    setSearchQuery(query) {
      set((s) => ({
        catalog: { ...s.catalog, searchQuery: query },
      }));
    },

    clearFilters() {
      set((s) => ({
        catalog: {
          ...s.catalog,
          filters: {
            category: null,
            provider: null,
            priceMin: null,
            priceMax: null,
            modality: null,
            ctxWindow: null,
          },
          sortBy: 'popularity',
          searchQuery: '',
        },
      }));
    },

    /**
     * Toggle a model's presence in the compare selection array.
     * Enforces a maximum of 4 selections.
     * @param {string} modelId - The model ID to toggle
     * @returns {boolean} true if toggled successfully, false if max reached
     */
    toggleCompare(modelId) {
      const current = get().catalog.compareSelections;

      if (current.includes(modelId)) {
        // Remove from selection
        set((s) => ({
          catalog: {
            ...s.catalog,
            compareSelections: current.filter((id) => id !== modelId),
          },
        }));
        return true;
      }

      if (current.length < 4) {
        // Add to selection
        set((s) => ({
          catalog: {
            ...s.catalog,
            compareSelections: [...current, modelId],
          },
        }));
        return true;
      }

      // Max reached
      return false;
    },

    /**
     * Clear all compare selections.
     */
    clearCompareSelections() {
      set((s) => ({
        catalog: { ...s.catalog, compareSelections: [] },
      }));
    },

    /**
     * Check if a model is currently selected for comparison.
     * @param {string} modelId - The model ID to check
     * @returns {boolean}
     */
    isCompareSelected(modelId) {
      return get().catalog.compareSelections.includes(modelId);
    },

    /**
     * Get the current number of models selected for comparison.
     * @returns {number}
     */
    getCompareCount() {
      return get().catalog.compareSelections.length;
    },
  };
}
