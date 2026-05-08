/**
 * Reusable Zustand persist helper for OpenRouterFlix.
 *
 * Wraps zustand/middleware persist with project-standard defaults:
 *   - localStorage key prefix: orf-{name}
 *   - Version: 1 (overridable via options.version)
 *   - Storage: localStorage (overridable via options.storage)
 *   - Optional partialize and migrate support
 *
 * @param {string}   name           — store name (used in localStorage key)
 * @param {Function} stateCreator   — Zustand state creator (set, get, api) => ({ ... })
 * @param {object}   [options={}]   — optional overrides
 * @param {number}   [options.version]      — schema version (default: 1)
 * @param {Storage}  [options.storage]      — Storage backend (default: localStorage)
 * @param {Function} [options.partialize]   — (state) => partial state to persist
 * @param {Function} [options.migrate]      — (persistedState, version) => migrated state
 * @returns {Function} — Zustand store hook
 *
 * @example
 * const useMyStore = createPersistedStore('my-feature', (set) => ({
 *   value: 0,
 *   increment: () => set(s => ({ value: s.value + 1 })),
 * }), {
 *   partialize: (state) => ({ value: state.value }),
 * });
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export function createPersistedStore(name, stateCreator, options = {}) {
  const storageKey = `orf-${name}`;

  const persistOptions = {
    name: storageKey,
    version: options.version ?? 1,
    storage: options.storage ?? createJSONStorage(() => localStorage),
  };

  // Only include optional fields when explicitly provided (Zustand v5 rejects undefined values)
  if (options.partialize != null) {
    persistOptions.partialize = options.partialize;
  }
  if (options.migrate != null) {
    persistOptions.migrate = options.migrate;
  }

  return create(persist(stateCreator, persistOptions));
}
