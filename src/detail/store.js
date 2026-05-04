/**
 * Detail store slice — Zustand store managing single model detail state.
 *
 * State shape:
 *   { model: NormalizedModel | null, loading: boolean, error: string | null }
 *
 * Actions:
 *   fetchModel(id) — calls GET /api/models/:id, manages loading/error/model
 */
import { create } from 'zustand';
import { api } from '../shared/lib/api';

const useDetailStore = create((set) => ({
  model: null,
  loading: false,
  error: null,

  fetchModel: async (id) => {
    set({ loading: true, error: null });
    try {
      // Model IDs may contain slashes (e.g. "openai/gpt-4o")
      const encoded = encodeURIComponent(id);
      const result = await api.get(`/models/${encoded}`);
      // Double-unwrap: api.js returns { data: body }, server returns { data: model }
      const model = result.data.data ?? result.data;
      set({ model, loading: false, error: null });
    } catch (err) {
      const message =
        err?.message || err?.error || 'Failed to fetch model details';
      set({ model: null, loading: false, error: message });
    }
  },
}));

export default useDetailStore;
