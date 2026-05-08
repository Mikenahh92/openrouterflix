import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import useComparison from './useComparison';

// Mock the store
const mockFetchModels = vi.fn();
vi.mock('../../shared/lib/store.js', () => ({
  useStore: (selector) => {
    const state = {
      comparison: {
        models: [],
        loading: false,
        error: null,
        fetchModels: mockFetchModels,
      },
    };
    return selector(state);
  },
}));

// ── Render helper with Router context ───────────────────────────────

function renderWithRouter(initialEntry = '/compare?ids=a,b,c') {
  return renderHook(() => useComparison(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[initialEntry]}>
        {children}
      </MemoryRouter>
    ),
  });
}

// ── Tests ───────────────────────────────────────────────────────────

describe('useComparison', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TC-HOOK-01: Parses IDs from URL searchParams
  it('TC-HOOK-01: parses IDs from URL searchParams', () => {
    const { result } = renderWithRouter('/compare?ids=a,b,c');

    expect(result.current.ids).toEqual(['a', 'b', 'c']);
  });

  // TC-HOOK-02: Handles URL-encoded IDs
  it('TC-HOOK-02: handles URL-encoded IDs with slashes', () => {
    const { result } = renderWithRouter(
      '/compare?ids=openai%2Fgpt-4o,anthropic%2Fclaude-3.5-sonnet'
    );

    expect(result.current.ids).toEqual(['openai/gpt-4o', 'anthropic/claude-3.5-sonnet']);
  });

  // TC-HOOK-03: removeModel returns function (URL update is tested via integration)
  it('TC-HOOK-03: removeModel is a function', () => {
    const { result } = renderWithRouter('/compare?ids=a,b,c');

    expect(typeof result.current.removeModel).toBe('function');
  });

  // TC-HOOK-04: Empty IDs does not fetch
  it('TC-HOOK-04: with 1 ID, fetchModels is not called on mount', () => {
    renderWithRouter('/compare?ids=only-one');

    // With only 1 ID, the hook should not call fetchModels
    expect(mockFetchModels).not.toHaveBeenCalled();
  });

  // TC-HOOK-05: Returns correct shape
  it('TC-HOOK-05: returns correct shape', () => {
    const { result } = renderWithRouter('/compare?ids=a,b');

    expect(result.current).toHaveProperty('models');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('removeModel');
    expect(result.current).toHaveProperty('ids');
  });

  // With 2 IDs, fetchModels is called
  it('calls fetchModels with parsed IDs when 2+ IDs are present', () => {
    renderWithRouter('/compare?ids=model-a,model-b');

    expect(mockFetchModels).toHaveBeenCalledWith(['model-a', 'model-b']);
  });

  // With no IDs, returns empty array
  it('returns empty ids array when no ids param', () => {
    const { result } = renderWithRouter('/compare');

    expect(result.current.ids).toEqual([]);
  });
});
