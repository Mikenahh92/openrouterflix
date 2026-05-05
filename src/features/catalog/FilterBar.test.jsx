import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { create } from 'zustand';
import { catalogSlice } from './catalogSlice';
import FilterBar from './FilterBar.jsx';

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
    categories: ['chat'],
    archived: false,
  },
  {
    id: 'meta/llama-3',
    name: 'Llama 3',
    provider: 'meta',
    categories: ['chat', 'coding'],
    archived: false,
  },
  {
    id: 'anthropic/claude-3',
    name: 'Claude 3',
    provider: 'anthropic',
    categories: ['chat'],
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

function renderFilterBar(store) {
  mockUseStore.mockImplementation((selector) => selector(store.getState()));

  return render(
    <MemoryRouter>
      <FilterBar />
    </MemoryRouter>
  );
}

// ── Tests ───────────────────────────────────────────────────────────
describe('FilterBar', () => {
  let store;

  beforeEach(() => {
    vi.clearAllMocks();
    store = createTestStore();
  });

  it('renders filter toggle button', () => {
    renderFilterBar(store);
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('renders sort dropdown', () => {
    renderFilterBar(store);
    expect(screen.getByLabelText('Sort models')).toBeInTheDocument();
  });

  it('toggle button has aria-expanded=false initially', () => {
    renderFilterBar(store);
    const btn = screen.getByText('Filters').closest('button');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggle button has aria-controls attribute', () => {
    renderFilterBar(store);
    const btn = screen.getByText('Filters').closest('button');
    expect(btn).toHaveAttribute('aria-controls', 'filter-panel');
  });

  it('clicking toggle expands filter panel', async () => {
    const user = userEvent.setup();
    renderFilterBar(store);

    const btn = screen.getByText('Filters').closest('button');
    await user.click(btn);

    expect(btn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Filter controls' })).toBeInTheDocument();
  });

  it('expanded panel has role="region" and aria-label', async () => {
    const user = userEvent.setup();
    renderFilterBar(store);

    const btn = screen.getByText('Filters').closest('button');
    await user.click(btn);

    const panel = screen.getByRole('region', { name: 'Filter controls' });
    expect(panel).toBeInTheDocument();
  });

  it('shows category dropdown when expanded', async () => {
    const user = userEvent.setup();
    renderFilterBar(store);

    await user.click(screen.getByText('Filters').closest('button'));
    expect(screen.getByLabelText('Filter by category')).toBeInTheDocument();
  });

  it('shows provider dropdown when expanded', async () => {
    const user = userEvent.setup();
    renderFilterBar(store);

    await user.click(screen.getByText('Filters').closest('button'));
    expect(screen.getByLabelText('Filter by provider')).toBeInTheDocument();
  });

  it('shows modality dropdown when expanded', async () => {
    const user = userEvent.setup();
    renderFilterBar(store);

    await user.click(screen.getByText('Filters').closest('button'));
    expect(screen.getByLabelText('Filter by modality')).toBeInTheDocument();
  });

  it('shows context window input when expanded', async () => {
    const user = userEvent.setup();
    renderFilterBar(store);

    await user.click(screen.getByText('Filters').closest('button'));
    expect(screen.getByLabelText('Filter by minimum context window')).toBeInTheDocument();
  });

  it('shows price min/max inputs when expanded', async () => {
    const user = userEvent.setup();
    renderFilterBar(store);

    await user.click(screen.getByText('Filters').closest('button'));
    expect(screen.getByLabelText('Filter by minimum price')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by maximum price')).toBeInTheDocument();
  });

  it('shows active filter count badge when filters are active', () => {
    store.getState().catalog.setFilter('category', 'chat');
    renderFilterBar(store);

    const badge = screen.getByText('1');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('aria-label', '1 active filter');
  });

  it('badge has aria-label with plural when count > 1', () => {
    store.getState().catalog.setFilter('category', 'chat');
    store.getState().catalog.setFilter('provider', 'openai');
    renderFilterBar(store);

    const badge = screen.getByText('2');
    expect(badge).toHaveAttribute('aria-label', '2 active filters');
  });

  it('shows Clear all button when filters active', () => {
    store.getState().catalog.setFilter('category', 'chat');
    renderFilterBar(store);
    expect(screen.getByLabelText('Clear all filters')).toBeInTheDocument();
  });

  it('Clear all button resets filters', async () => {
    const user = userEvent.setup();
    store.getState().catalog.setFilter('category', 'chat');
    renderFilterBar(store);

    await user.click(screen.getByLabelText('Clear all filters'));

    expect(store.getState().catalog.filters.category).toBeNull();
    expect(store.getState().catalog.searchQuery).toBe('');
  });

  it('does not show Clear all when no filters active', () => {
    renderFilterBar(store);
    expect(screen.queryByLabelText('Clear all filters')).not.toBeInTheDocument();
  });

  it('does not show badge when no filters active', () => {
    renderFilterBar(store);
    // Badge should not be present
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('sort change updates store', async () => {
    const user = userEvent.setup();
    renderFilterBar(store);

    const select = screen.getByLabelText('Sort models');
    await user.selectOptions(select, 'price_asc');

    expect(store.getState().catalog.sortBy).toBe('price_asc');
  });

  it('category filter change updates store', async () => {
    const user = userEvent.setup();
    renderFilterBar(store);

    await user.click(screen.getByText('Filters').closest('button'));
    const select = screen.getByLabelText('Filter by category');
    await user.selectOptions(select, 'chat');

    expect(store.getState().catalog.filters.category).toBe('chat');
  });

  it('provider filter change updates store', async () => {
    const user = userEvent.setup();
    renderFilterBar(store);

    await user.click(screen.getByText('Filters').closest('button'));
    const select = screen.getByLabelText('Filter by provider');
    await user.selectOptions(select, 'openai');

    expect(store.getState().catalog.filters.provider).toBe('openai');
  });

  it('clicking toggle twice collapses panel', async () => {
    const user = userEvent.setup();
    renderFilterBar(store);

    const btn = screen.getByText('Filters').closest('button');
    await user.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');

    await user.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });
});
