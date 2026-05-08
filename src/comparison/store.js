/**
 * Zustand comparison slice — manages fetched comparison models, loading, and error state.
 *
 * Follows the same (set, get) => ({ ...state, ...actions }) signature as catalogSlice.
 * Registers into the combined store in src/shared/lib/store.js.
 *
 * Feature isolation: this slice does NOT read from or write to catalog.compareSelections.
 * Communication between features happens exclusively through URL query params.
 */
import { api } from '../shared/lib/api.js';
import { API_ROUTES } from '../shared/lib/constants.js';

/**
 * Create the comparison slice.
 * @param {Function} set - Zustand set
 * @param {Function} get - Zustand get
 * @returns {object} Comparison slice state and actions
 */
export function comparisonSlice(set, get) {
  return {
    // State
    models: [],
    loading: false,
    error: null,

    /**
     * Fetch comparison data for the given model IDs.
     * Clears previous data, sets loading, calls POST /api/compare.
     *
     * @param {string[]} ids — 2-4 model IDs to compare
     */
    async fetchModels(ids) {
      // Clear previous data and set loading
      set((s) => ({
        comparison: { ...s.comparison, models: [], loading: true, error: null },
      }));

      try {
        const response = await api.post(API_ROUTES.COMPARE, { modelIds: ids });

        // Backend returns { data: [...], errors?: [...] }
        const result = response.data?.data ?? response.data ?? [];
        const errors = response.data?.errors;

        set((s) => ({
          comparison: {
            ...s.comparison,
            models: Array.isArray(result) ? result : [],
            loading: false,
            error: null,
          },
        }));

        // If there were partial errors, surface them
        if (errors && errors.length > 0) {
          set((s) => ({
            comparison: {
              ...s.comparison,
              error: `Some models could not be loaded: ${errors.map((e) => e.id).join(', ')}`,
            },
          }));
        }
      } catch (err) {
        set((s) => ({
          comparison: {
            ...s.comparison,
            models: [],
            loading: false,
            error: err?.error || err?.message || 'Failed to load comparison data',
          },
        }));
      }
    },
  };
}
