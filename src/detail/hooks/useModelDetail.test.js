import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import useDetailStore from '../store';

// Mock the store
vi.mock('../store', () => ({
  __esModule: true,
  default: vi.fn(),
}));

import useModelDetail from './useModelDetail';

// Helper to set up the mock store selector
function mockStoreState(state) {
  useDetailStore.mockImplementation((selector) => selector(state));
}

describe('useModelDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TC-03: Calls fetchModel on mount with modelId
  it('TC-03: calls fetchModel on mount with the provided modelId', () => {
    const fetchModel = vi.fn();
    mockStoreState({
      model: null,
      loading: false,
      error: null,
      fetchModel,
    });

    renderHook(() => useModelDetail('openai/gpt-4o'));

    expect(fetchModel).toHaveBeenCalledTimes(1);
    expect(fetchModel).toHaveBeenCalledWith('openai/gpt-4o');
  });

  // TC-12: Does NOT call fetchModel when modelId is falsy
  it('TC-12: does not call fetchModel when modelId is falsy', () => {
    const fetchModel = vi.fn();
    mockStoreState({
      model: null,
      loading: false,
      error: null,
      fetchModel,
    });

    renderHook(() => useModelDetail(null));
    expect(fetchModel).not.toHaveBeenCalled();

    vi.clearAllMocks();
    mockStoreState({
      model: null,
      loading: false,
      error: null,
      fetchModel,
    });

    renderHook(() => useModelDetail(undefined));
    expect(fetchModel).not.toHaveBeenCalled();
  });

  it('re-fetches when modelId changes', () => {
    const fetchModel = vi.fn();
    mockStoreState({
      model: null,
      loading: false,
      error: null,
      fetchModel,
    });

    const { rerender } = renderHook(
      ({ id }) => useModelDetail(id),
      { initialProps: { id: 'model-a' } }
    );

    expect(fetchModel).toHaveBeenCalledWith('model-a');

    rerender({ id: 'model-b' });
    expect(fetchModel).toHaveBeenCalledWith('model-b');
    expect(fetchModel).toHaveBeenCalledTimes(2);
  });

  it('returns model, loading, error, and fetchModel from the store', () => {
    const storeModel = { id: 'test/model', name: 'Test' };
    const fetchModel = vi.fn();
    mockStoreState({
      model: storeModel,
      loading: true,
      error: 'some error',
      fetchModel,
    });

    const { result } = renderHook(() => useModelDetail('test/model'));

    expect(result.current.model).toBe(storeModel);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe('some error');
    expect(result.current.fetchModel).toBe(fetchModel);
  });
});
