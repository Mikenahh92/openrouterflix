import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { create } from 'zustand';
import { catalogSlice } from './catalogSlice';
import CatalogPage from './CatalogPage.jsx';

// ── Mock the shared store ───────────────────────────────────────────
const mockUseStore = vi.fn();

vi.mock('../../shared/lib/store.js', () => ({
  get useStore() {
    return mockUseStore;
  },
}));

// ── Test data ───────────────────────────────────────────────────────
const mockCategories = [
  { id: 'chat', name: 'Chat', modelCount: 2 },
  { id: 'coding', name: 'Coding', modelCount: 1 },
];

const mockModels = [
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Flagship multimodal model',
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
    description: 'Open source model',
    categories: ['chat', 'coding'],
    pricing: { prompt: 0.5, completion: 1 },
    contextWindow: 8192,
    modalities: ['text'],
    qualityScore: 3.8,
    latency: 200,
    archived: false,
  },
  {
    id: 'anthropic/claude-3',
    name: 'Claude 3',
    provider: 'anthropic',
    description: 'Constitutional AI',
    categories: ['chat'],
    pricing: { prompt: 3, completion: 15 },
    contextWindow: 200000,
    modalities: ['text', 'image'],
    qualityScore: 4.2,
    latency: 500,
    archived: false,
  },
];

function createTestStore() {
  return create((set, get) => ({
    catalog: {
      ...catalogSlice(set, get).catalog,
      models: mockModels,
      categories: mockCategories,
    },
  }));
}

function renderCatalogPage(store) {
  mockUseStore.mockImplementation((selector) => selector(store.getState()));

  return render(
    <MemoryRouter>
      <CatalogPage />
    </MemoryRouter>
  );
}

// ── Tests ───────────────────────────────────────────────────────────
describe('CatalogPage', () => {
  let store;

  beforeEach(() => {
    vi.clearAllMocks();
    store = createTestStore();
  });

  it('renders Model Catalog heading', () => {
    renderCatalogPage(store);
    expect(screen.getByText('Model Catalog')).toBeInTheDocument();
  });

  it('renders SearchBar', () => {
    renderCatalogPage(store);
    expect(screen.getByLabelText('Search models')).toBeInTheDocument();
  });

  it('renders FilterBar', () => {
    renderCatalogPage(store);
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    store.setState((s) => ({
      catalog: { ...s.catalog, loading: true },
    }));
    renderCatalogPage(store);

    expect(screen.getByText('Model Catalog')).toBeInTheDocument();
    // Loading skeletons should be present
    expect(screen.getAllByText('Model Catalog')).toHaveLength(1);
  });

  it('shows error state', () => {
    store.setState((s) => ({
      catalog: { ...s.catalog, loading: false, error: 'Network error' },
    }));
    renderCatalogPage(store);

    expect(screen.getByText(/failed to load catalog/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows category rows in unfiltered default view', () => {
    renderCatalogPage(store);
    // Category rows should appear
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Coding')).toBeInTheDocument();
  });

  it('shows filtered view when search query is active', () => {
    store.getState().catalog.setSearchQuery('gpt');
    renderCatalogPage(store);

    expect(screen.getByText(/model.*found/i)).toBeInTheDocument();
  });

  it('shows empty state when filters match no models', () => {
    store.getState().catalog.setSearchQuery('nonexistent');
    renderCatalogPage(store);

    expect(screen.getByText(/no models match your filters/i)).toBeInTheDocument();
  });

  it('Clear all filters button works in empty state', async () => {
    const user = userEvent.setup();
    store.getState().catalog.setSearchQuery('nonexistent');
    renderCatalogPage(store);

    const clearBtn = screen.getByRole('button', { name: /clear all filters/i });
    await user.click(clearBtn);

    expect(store.getState().catalog.searchQuery).toBe('');
  });

  it('shows model cards in filtered view', () => {
    store.getState().catalog.setSearchQuery('gpt');
    renderCatalogPage(store);

    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
  });

  it('shows count of filtered models', () => {
    store.getState().catalog.setSearchQuery('chat');
    renderCatalogPage(store);

    // Should show "X models found" since search matches by description
    expect(screen.getByText(/models? found/i)).toBeInTheDocument();
  });
});
