import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { useStore } from '../../shared/lib/store.js';

/**
 * URL param ↔ store key mapping
 */
const PARAM_MAP = {
  category: 'category',
  provider: 'provider',
  priceMin: 'priceMin',
  priceMax: 'priceMax',
  modality: 'modality',
  ctxWindow: 'ctxWindow',
  sort: 'sortBy',
  q: 'searchQuery',
};

/**
 * Numeric params that need parsing from URL strings
 */
const NUMERIC_PARAMS = new Set(['priceMin', 'priceMax', 'ctxWindow']);

/**
 * Default sort order
 */
const DEFAULT_SORT = 'popularity';

/**
 * Hook that bridges URL search params and the Zustand catalog store.
 *
 * On mount: reads URL params → hydrates store.
 * On change: updates store → syncs URL via useSearchParams.
 *
 * Exposes: filters, setFilter, clearFilters, sortBy, setSortBy,
 *          searchQuery, setSearchQuery, isFiltered, activeFilterCount,
 *          filteredModels
 */
export function useFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const hydrated = useRef(false);

  // Store selectors
  const filters = useStore((s) => s.catalog?.filters ?? {});
  const sortBy = useStore((s) => s.catalog?.sortBy ?? DEFAULT_SORT);
  const searchQuery = useStore((s) => s.catalog?.searchQuery ?? '');
  const models = useStore((s) => s.catalog?.models ?? []);
  const setFilter = useStore((s) => s.catalog?.setFilter);
  const setSortBy = useStore((s) => s.catalog?.setSortBy);
  const setSearchQuery = useStore((s) => s.catalog?.setSearchQuery);
  const clearFilters = useStore((s) => s.catalog?.clearFilters);

  // ─── Hydrate store from URL on first mount ───
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const urlFilters = {};
    let hasUrlParams = false;

    for (const [paramKey, storeKey] of Object.entries(PARAM_MAP)) {
      const value = searchParams.get(paramKey);
      if (value !== null && value !== '') {
        hasUrlParams = true;
        if (storeKey === 'filters') {
          // shouldn't happen with our map
        } else if (storeKey === 'sortBy') {
          if (setSortBy) setSortBy(value);
        } else if (storeKey === 'searchQuery') {
          if (setSearchQuery) setSearchQuery(value);
        } else {
          // Filter keys
          const parsed = NUMERIC_PARAMS.has(storeKey) ? Number(value) : value;
          if (!Number.isNaN(parsed)) {
            urlFilters[storeKey] = parsed;
          }
        }
      }
    }

    // Apply hydrated filter values
    for (const [key, value] of Object.entries(urlFilters)) {
      if (setFilter) setFilter(key, value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Sync store → URL ───
  const syncUrl = useCallback(() => {
    const params = new URLSearchParams();

    // Filters
    for (const key of ['category', 'provider', 'modality']) {
      const val = filters?.[key];
      if (val) params.set(key, String(val));
    }
    for (const key of ['priceMin', 'priceMax', 'ctxWindow']) {
      const val = filters?.[key];
      if (val != null && val !== '') params.set(key, String(val));
    }

    // Sort
    if (sortBy && sortBy !== DEFAULT_SORT) {
      params.set('sort', sortBy);
    }

    // Search
    if (searchQuery) {
      params.set('q', searchQuery);
    }

    setSearchParams(params, { replace: true });
  }, [filters, sortBy, searchQuery, setSearchParams]);

  // Sync URL whenever filters/sort/search change
  useEffect(() => {
    if (!hydrated.current) return; // don't sync before hydration
    syncUrl();
  }, [syncUrl]);

  // ─── Computed values ───
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters?.category) count++;
    if (filters?.provider) count++;
    if (filters?.priceMin != null) count++;
    if (filters?.priceMax != null) count++;
    if (filters?.modality) count++;
    if (filters?.ctxWindow != null) count++;
    if (searchQuery) count++;
    return count;
  }, [filters, searchQuery]);

  const isFiltered = activeFilterCount > 0;

  // ─── filteredModels selector ───
  const filteredModels = useMemo(() => {
    let result = models;

    // Exclude archived models
    result = result.filter((m) => !m.archived);

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((m) => {
        const name = (m.name || '').toLowerCase();
        const provider = (m.provider || '').toLowerCase();
        const description = (m.description || '').toLowerCase();
        return (
          name.includes(q) ||
          provider.includes(q) ||
          description.includes(q)
        );
      });
    }

    // Category filter
    if (filters?.category) {
      const cat = filters.category.toLowerCase();
      result = result.filter((m) => {
        if (!Array.isArray(m.categories)) return false;
        return m.categories.some((c) => c.toLowerCase() === cat);
      });
    }

    // Provider filter
    if (filters?.provider) {
      const prov = filters.provider.toLowerCase();
      result = result.filter((m) =>
        (m.provider || '').toLowerCase() === prov
      );
    }

    // Price min filter
    if (filters?.priceMin != null) {
      const min = Number(filters.priceMin);
      if (!Number.isNaN(min)) {
        result = result.filter(
          (m) => m.pricing?.prompt != null && m.pricing.prompt >= min
        );
      }
    }

    // Price max filter
    if (filters?.priceMax != null) {
      const max = Number(filters.priceMax);
      if (!Number.isNaN(max)) {
        result = result.filter(
          (m) => m.pricing?.prompt != null && m.pricing.prompt <= max
        );
      }
    }

    // Modality filter
    if (filters?.modality) {
      const mod = filters.modality.toLowerCase();
      result = result.filter((m) => {
        if (!Array.isArray(m.modalities)) return false;
        return m.modalities.some((m2) => m2.toLowerCase() === mod);
      });
    }

    // Context window filter (minimum)
    if (filters?.ctxWindow != null) {
      const minCtx = Number(filters.ctxWindow);
      if (!Number.isNaN(minCtx)) {
        result = result.filter(
          (m) => m.contextWindow != null && m.contextWindow >= minCtx
        );
      }
    }

    // Sort
    const sorted = [...result];
    switch (sortBy) {
      case 'price_asc':
        sorted.sort(
          (a, b) => (a.pricing?.prompt ?? Infinity) - (b.pricing?.prompt ?? Infinity)
        );
        break;
      case 'price_desc':
        sorted.sort(
          (a, b) => (b.pricing?.prompt ?? 0) - (a.pricing?.prompt ?? 0)
        );
        break;
      case 'latency_asc':
        sorted.sort(
          (a, b) => (a.latency ?? Infinity) - (b.latency ?? Infinity)
        );
        break;
      case 'quality_desc':
        sorted.sort(
          (a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0)
        );
        break;
      case 'newest':
        sorted.sort(
          (a, b) => new Date(b.created ?? 0) - new Date(a.created ?? 0)
        );
        break;
      case 'popularity':
      default:
        // Default API order — no sort change
        break;
    }

    return sorted;
  }, [models, searchQuery, filters, sortBy]);

  return {
    filters: filters ?? {},
    setFilter,
    clearFilters,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    isFiltered,
    activeFilterCount,
    filteredModels,
  };
}

export default useFilters;
