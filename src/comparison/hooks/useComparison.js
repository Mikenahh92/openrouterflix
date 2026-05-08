/**
 * useComparison — data-fetching hook for the comparison page.
 *
 * Reads model IDs from URL search params (?ids=id1,id2,...),
 * calls fetchModels on the comparison Zustand slice,
 * and exposes removeModel / addModels actions that update URL params.
 *
 * Feature isolation: this hook does NOT import from catalog, playground, or detail features.
 */
import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useStore } from '../../shared/lib/store.js';

/**
 * Custom hook for comparison page data management.
 * @returns {{ models: Array, loading: boolean, error: string|null, removeModel: Function, ids: string[] }}
 */
export default function useComparison() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read model IDs from URL query params
  const idsParam = searchParams.get('ids') || '';
  const ids = idsParam
    .split(',')
    .map((id) => decodeURIComponent(id.trim()))
    .filter(Boolean);

  const models = useStore((s) => s.comparison.models);
  const loading = useStore((s) => s.comparison.loading);
  const error = useStore((s) => s.comparison.error);
  const fetchModels = useStore((s) => s.comparison.fetchModels);

  // Fetch models when IDs change and we have 2-4 valid IDs
  useEffect(() => {
    if (ids.length >= 2 && ids.length <= 4) {
      fetchModels(ids);
    }
  }, [ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Remove a model from the comparison.
   * Updates URL params (source of truth), which triggers a re-fetch via the effect above.
   *
   * @param {string} modelId — the model ID to remove
   */
  const removeModel = useCallback(
    (modelId) => {
      const remaining = ids.filter((id) => id !== modelId);
      if (remaining.length === 0) {
        // Remove the ids param entirely
        searchParams.delete('ids');
        setSearchParams(searchParams, { replace: true });
      } else {
        setSearchParams({ ids: remaining.join(',') }, { replace: true });
      }
    },
    [ids, searchParams, setSearchParams]
  );

  return { models, loading, error, removeModel, ids };
}
