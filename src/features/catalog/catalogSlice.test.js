import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { catalogSlice } from './catalogSlice';
import { api } from '../../shared/lib/api';

// Mock the api module
vi.mock('../../shared/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

function createTestStore() {
  return create((set, get) => ({
    catalog: catalogSlice(set, get),
  }));
}

const mockCategories = [
  { id: 'chat', name: 'Chat', modelCount: 2 },
  { id: 'coding', name: 'Coding', modelCount: 1 },
];

const mockModels = [
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    categories: ['chat'],
    pricing: { prompt: 5, completion: 15 },
    contextWindow: 128000,
    modalities: ['text', 'image'],
    qualityScore: 4.5,
    latency: 450,
    archived: false,
  },
  {
    id: 'meta/llama-3',
    name: 'Llama 3',
    provider: 'meta',
    categories: ['chat', 'coding'],
    pricing: { prompt: 0.5, completion: 1 },
    contextWindow: 8192,
    modalities: ['text'],
    qualityScore: 3.8,
    latency: 200,
    archived: false,
  },
  {
    id: 'archived/old-model',
    name: 'Old Model',
    provider: 'test',
    categories: ['chat'],
    pricing: { prompt: 1, completion: 2 },
    contextWindow: 4096,
    archived: true,
  },
];

describe('catalogSlice', () => {
  let useTestStore;

  beforeEach(() => {
    vi.clearAllMocks();
    useTestStore = createTestStore();
  });

  // TC-001: Initial state
  it('TC-001: has correct initial state', () => {
    const state = useTestStore.getState().catalog;
    expect(state.categories).toEqual([]);
    expect(state.models).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.filters).toEqual({
      category: null,
      provider: null,
      priceMin: null,
      priceMax: null,
      modality: null,
      ctxWindow: null,
    });
    expect(state.sortBy).toBe('popularity');
    expect(state.searchQuery).toBe('');
  });

  // TC-002: setFilter updates a single filter key
  it('TC-002: setFilter updates a single filter key', () => {
    const { setFilter } = useTestStore.getState().catalog;
    setFilter('category', 'chat');

    const state = useTestStore.getState().catalog;
    expect(state.filters.category).toBe('chat');
    // Other filters remain null
    expect(state.filters.provider).toBeNull();
    expect(state.filters.priceMin).toBeNull();
  });

  // TC-003: setFilter can be called multiple times
  it('TC-003: setFilter supports multiple filter updates', () => {
    const { setFilter } = useTestStore.getState().catalog;
    setFilter('category', 'chat');
    setFilter('provider', 'openai');
    setFilter('priceMin', 1);

    const state = useTestStore.getState().catalog;
    expect(state.filters.category).toBe('chat');
    expect(state.filters.provider).toBe('openai');
    expect(state.filters.priceMin).toBe(1);
  });

  // TC-004: setSortBy updates sort
  it('TC-004: setSortBy updates sort value', () => {
    const { setSortBy } = useTestStore.getState().catalog;
    setSortBy('price_asc');

    expect(useTestStore.getState().catalog.sortBy).toBe('price_asc');
  });

  // TC-005: setSearchQuery updates search query
  it('TC-005: setSearchQuery updates search query', () => {
    const { setSearchQuery } = useTestStore.getState().catalog;
    setSearchQuery('gpt');

    expect(useTestStore.getState().catalog.searchQuery).toBe('gpt');
  });

  // TC-006: clearFilters resets all filters, sort, and search
  it('TC-006: clearFilters resets filters, sort, and search', () => {
    const store = useTestStore.getState().catalog;
    store.setFilter('category', 'chat');
    store.setFilter('provider', 'openai');
    store.setSortBy('price_asc');
    store.setSearchQuery('gpt');

    useTestStore.getState().catalog.clearFilters();

    const state = useTestStore.getState().catalog;
    expect(state.filters).toEqual({
      category: null,
      provider: null,
      priceMin: null,
      priceMax: null,
      modality: null,
      ctxWindow: null,
    });
    expect(state.sortBy).toBe('popularity');
    expect(state.searchQuery).toBe('');
  });

  // TC-007: fetchCatalog success
  it('TC-007: fetchCatalog success loads categories and models', async () => {
    api.get.mockImplementation((route) => {
      if (route === '/categories') return Promise.resolve({ data: { data: mockCategories } });
      if (route === '/models') return Promise.resolve({ data: { data: mockModels } });
      return Promise.reject(new Error('Unknown route'));
    });

    const { fetchCatalog } = useTestStore.getState().catalog;
    await fetchCatalog();

    const state = useTestStore.getState().catalog;
    expect(state.categories).toEqual(mockCategories);
    expect(state.models).toEqual(mockModels);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  // TC-008: fetchCatalog sets loading during request
  it('TC-008: fetchCatalog sets loading=true during request', async () => {
    let resolveCategories, resolveModels;
    api.get.mockImplementation((route) => {
      if (route === '/categories') return new Promise((r) => { resolveCategories = r; });
      if (route === '/models') return new Promise((r) => { resolveModels = r; });
      return Promise.reject(new Error('Unknown route'));
    });

    const { fetchCatalog } = useTestStore.getState().catalog;
    const promise = fetchCatalog();

    expect(useTestStore.getState().catalog.loading).toBe(true);

    resolveCategories({ data: { data: mockCategories } });
    resolveModels({ data: { data: mockModels } });
    await promise;

    expect(useTestStore.getState().catalog.loading).toBe(false);
  });

  // TC-009: fetchCatalog error sets error message
  it('TC-009: fetchCatalog error sets error message', async () => {
    api.get.mockRejectedValue({ message: 'Server error' });

    const { fetchCatalog } = useTestStore.getState().catalog;
    await fetchCatalog();

    const state = useTestStore.getState().catalog;
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Server error');
  });

  // TC-010: fetchCatalog with no .message uses fallback
  it('TC-010: fetchCatalog error without message uses fallback string', async () => {
    api.get.mockRejectedValue({});

    const { fetchCatalog } = useTestStore.getState().catalog;
    await fetchCatalog();

    const state = useTestStore.getState().catalog;
    expect(state.error).toBe('Failed to load catalog');
  });

  // TC-011: fetchCatalog skips if already loading
  it('TC-011: fetchCatalog skips if already loading', async () => {
    // Set loading manually
    useTestStore.setState((s) => ({
      catalog: { ...s.catalog, loading: true },
    }));

    const { fetchCatalog } = useTestStore.getState().catalog;
    await fetchCatalog();

    expect(api.get).not.toHaveBeenCalled();
  });

  // TC-012: fetchCatalog handles null data gracefully
  it('TC-012: fetchCatalog handles null data fields gracefully', async () => {
    api.get.mockImplementation((route) => {
      if (route === '/categories') return Promise.resolve({ data: {} });
      if (route === '/models') return Promise.resolve({ data: {} });
      return Promise.reject(new Error('Unknown route'));
    });

    const { fetchCatalog } = useTestStore.getState().catalog;
    await fetchCatalog();

    const state = useTestStore.getState().catalog;
    expect(state.categories).toEqual([]);
    expect(state.models).toEqual([]);
  });

  // TC-013: setFilter with null value clears that filter
  it('TC-013: setFilter with null clears that filter', () => {
    const store = useTestStore.getState().catalog;
    store.setFilter('category', 'chat');
    expect(useTestStore.getState().catalog.filters.category).toBe('chat');

    store.setFilter('category', null);
    expect(useTestStore.getState().catalog.filters.category).toBeNull();
  });

  // TC-014: numeric filter values
  it('TC-014: setFilter handles numeric values for price/ctx', () => {
    const { setFilter } = useTestStore.getState().catalog;
    setFilter('priceMin', 0.5);
    setFilter('priceMax', 10);
    setFilter('ctxWindow', 128000);

    const state = useTestStore.getState().catalog;
    expect(state.filters.priceMin).toBe(0.5);
    expect(state.filters.priceMax).toBe(10);
    expect(state.filters.ctxWindow).toBe(128000);
  });
});
