/**
 * Zustand combined store factory for OpenRouterFlix.
 *
 * Provides a `createStore` function that composes named slices into a single
 * Zustand store. Each feature defines a slice function of the form:
 *
 *   (set, get) => ({ ...state, ...actions })
 *
 * Then combines them:
 *
 *   const useStore = createStore({
 *     catalog: catalogSlice,
 *     detail: detailSlice,
 *   })
 */

import { create } from 'zustand';
import { catalogSlice } from '../../features/catalog/catalogSlice.js';

/**
 * Create a combined Zustand store from named slice functions.
 *
 * @param {Record<string, Function>} sliceMap — map of slice names to slice functions
 * @returns {Function} — Zustand useStore hook
 *
 * @example
 * const useStore = createStore({
 *   test: (set, get) => ({
 *     value: 0,
 *     increment: () => set(s => ({ test: { ...s.test, value: s.test.value + 1 } })),
 *   }),
 * })
 *
 * // In a component:
 * const value = useStore(s => s.test.value)
 */
export function createStore(sliceMap) {
  return create((set, get) => {
    const slices = {};

    for (const [name, sliceFn] of Object.entries(sliceMap)) {
      slices[name] = sliceFn(set, get);
    }

    return slices;
  });
}

/**
 * Application-wide Zustand store with all feature slices.
 * Slices are added here as features are implemented.
 */
const useStore = create((set, get) => ({
  catalog: catalogSlice(set, get),
}));

export { useStore };
