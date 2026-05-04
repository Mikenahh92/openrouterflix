/**
 * useModelDetail — data-fetching hook for the model detail page.
 *
 * Accepts a modelId param, triggers fetchModel on mount and when ID changes.
 * Returns { model, loading, error, fetchModel } from the detail store.
 */
import { useEffect } from 'react';
import useDetailStore from '../store';

export default function useModelDetail(modelId) {
  const model = useDetailStore((s) => s.model);
  const loading = useDetailStore((s) => s.loading);
  const error = useDetailStore((s) => s.error);
  const fetchModel = useDetailStore((s) => s.fetchModel);

  useEffect(() => {
    if (modelId) {
      fetchModel(modelId);
    }
  }, [modelId, fetchModel]);

  return { model, loading, error, fetchModel };
}
