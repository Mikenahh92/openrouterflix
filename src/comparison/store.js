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
import { API_ROUTES, DEFAULTS } from '../shared/lib/constants.js';
import { createPersistedStore } from '../shared/lib/persist.js';

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

/* ─── Comparison Presets (standalone persisted store) ─────────────── */

const MAX_PRESETS = DEFAULTS.MAX_COMPARISON_PRESETS;
const MIN_MODEL_IDS = 2;
const MAX_MODEL_IDS = 4;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 50;
const ALL_DIMENSION_KEYS = [
  'provider',
  'pricing.prompt',
  'pricing.completion',
  'latency',
  'contextWindow',
  'qualityScore',
  'maxOutput',
  'modalities',
  'categories',
];

export { ALL_DIMENSION_KEYS };

/**
 * Validate preset input. Returns null if valid, or an error message string.
 * @param {{ name?: string, modelIds?: string[] }} input
 * @param {number} currentPresetCount — current number of presets in the store
 * @returns {string|null}
 */
function validatePreset(input, currentPresetCount) {
  const name = (input.name || '').trim();
  const modelIds = input.modelIds;

  if (name.length < MIN_NAME_LENGTH) return 'Name is required';
  if (name.length > MAX_NAME_LENGTH) return 'Name too long (max 50 characters)';
  if (!Array.isArray(modelIds)) return 'Model IDs must be an array';
  if (modelIds.length < MIN_MODEL_IDS) return `At least ${MIN_MODEL_IDS} model IDs required`;
  if (modelIds.length > MAX_MODEL_IDS) return `At most ${MAX_MODEL_IDS} model IDs allowed`;
  if (currentPresetCount >= MAX_PRESETS) return 'Maximum 50 presets reached';

  return null;
}

/**
 * Validate preset update. Returns null if valid, or an error message string.
 * @param {{ name?: string, modelIds?: string[] }} updates
 * @returns {string|null}
 */
function validatePresetUpdate(updates) {
  if (updates.name !== undefined) {
    const name = (updates.name || '').trim();
    if (name.length < MIN_NAME_LENGTH) return 'Name is required';
    if (name.length > MAX_NAME_LENGTH) return 'Name too long (max 50 characters)';
  }
  if (updates.modelIds !== undefined) {
    if (!Array.isArray(updates.modelIds)) return 'Model IDs must be an array';
    if (updates.modelIds.length < MIN_MODEL_IDS) return `At least ${MIN_MODEL_IDS} model IDs required`;
    if (updates.modelIds.length > MAX_MODEL_IDS) return `At most ${MAX_MODEL_IDS} model IDs allowed`;
  }
  return null;
}

/**
 * Standalone persisted Zustand store for comparison presets.
 *
 * Uses createPersistedStore — same pattern as useTemplateStore and useRunHistoryStore.
 * localStorage key: orf-comparison-presets
 *
 * Feature isolation: does NOT read from or write to catalog, comparisonSlice, or playground stores.
 * Preset recall works via URL param update (no store-level "recall" action).
 */
export const useComparisonPresetsStore = createPersistedStore(
  'comparison-presets',
  (set, get) => ({
    presets: [],
    visibleDimensions: [...ALL_DIMENSION_KEYS],

    /**
     * Add a new preset. Returns the new preset object, or null if validation fails.
     * @param {string} name
     * @param {string[]} modelIds
     * @returns {object|null}
     */
    addPreset(name, modelIds) {
      const trimmedName = (name || '').trim();
      const error = validatePreset({ name: trimmedName, modelIds }, get().presets.length);
      if (error) return null;

      const now = new Date().toISOString();
      const preset = {
        id: crypto.randomUUID(),
        name: trimmedName,
        modelIds: [...modelIds],
        createdAt: now,
        updatedAt: now,
      };

      set((state) => ({
        presets: [preset, ...state.presets],
      }));

      return preset;
    },

    /**
     * Update an existing preset by ID. Sets updatedAt.
     * @param {string} id
     * @param {{ name?: string, modelIds?: string[] }} updates
     * @returns {boolean} true if updated, false if validation failed or not found
     */
    updatePreset(id, updates) {
      const error = validatePresetUpdate(updates);
      if (error) return false;

      let found = false;
      set((state) => ({
        presets: state.presets.map((p) => {
          if (p.id !== id) return p;
          found = true;
          const merged = { ...p, ...updates, updatedAt: new Date().toISOString() };
          if (updates.name !== undefined) merged.name = (updates.name || '').trim();
          return merged;
        }),
      }));

      return found;
    },

    /**
     * Delete a preset by ID.
     * @param {string} id
     */
    deletePreset(id) {
      set((state) => ({
        presets: state.presets.filter((p) => p.id !== id),
      }));
    },

    /**
     * Set visible dimension keys (global user preference).
     * @param {string[]} keys
     */
    setVisibleDimensions(keys) {
      set({ visibleDimensions: [...keys] });
    },

    /**
     * Reset visible dimensions to all 9.
     */
    resetVisibleDimensions() {
      set({ visibleDimensions: [...ALL_DIMENSION_KEYS] });
    },
  }),
  {
    partialize: (state) => ({
      presets: state.presets,
      visibleDimensions: state.visibleDimensions,
    }),
  }
);
