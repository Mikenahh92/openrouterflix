/**
 * Zustand catalog slice — manages categories, models, and filter/sort/search state.
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
  };
}
