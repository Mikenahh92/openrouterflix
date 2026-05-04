/**
 * Zustand catalog slice — manages categories and models state.
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
    // State
    categories: [],
    models: [],
    loading: false,
    error: null,

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
  };
}
