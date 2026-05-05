import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { create } from 'zustand';
import { catalogSlice } from './catalogSlice';
import SearchBar from './SearchBar.jsx';

// ── Mock the shared store ───────────────────────────────────────────
// We create a fresh test store for each test and inject it.
const mockUseStore = vi.fn();

vi.mock('../../shared/lib/store.js', () => ({
  get useStore() {
    return mockUseStore;
  },
}));

// ── Test data ───────────────────────────────────────────────────────
function createTestStore() {
  return create((set, get) => ({
    catalog: catalogSlice(set, get),
  }));
}

function renderSearchBar(store) {
  // Make useStore behave like the real one
  mockUseStore.mockImplementation((selector) => selector(store.getState()));

  // Subscribe to store changes and re-render when they occur
  const result = render(
    <MemoryRouter>
      <SearchBar />
    </MemoryRouter>
  );

  return result;
}

// ── Tests ───────────────────────────────────────────────────────────
describe('SearchBar', () => {
  let store;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    store = createTestStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search input with placeholder text', () => {
    renderSearchBar(store);
    expect(screen.getByLabelText('Search models')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search models/i)).toBeInTheDocument();
  });

  it('shows search icon', () => {
    renderSearchBar(store);
    const input = screen.getByLabelText('Search models');
    const container = input.parentElement;
    // The Search icon is rendered with aria-hidden
    const icon = container.querySelector('[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  });

  it('typing updates local input value', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSearchBar(store);

    const input = screen.getByLabelText('Search models');
    await user.type(input, 'gpt');

    expect(input).toHaveValue('gpt');
  });

  it('debounced value updates store searchQuery', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSearchBar(store);

    const input = screen.getByLabelText('Search models');
    await user.type(input, 'gpt');

    // Advance past debounce delay (300ms)
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(store.getState().catalog.searchQuery).toBe('gpt');
  });

  it('shows clear button when input has value', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSearchBar(store);

    const input = screen.getByLabelText('Search models');
    await user.type(input, 'test');

    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('clear button resets input and store', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSearchBar(store);

    const input = screen.getByLabelText('Search models');
    await user.type(input, 'gpt');

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(store.getState().catalog.searchQuery).toBe('gpt');

    const clearBtn = screen.getByLabelText('Clear search');
    await user.click(clearBtn);

    expect(input).toHaveValue('');
    expect(store.getState().catalog.searchQuery).toBe('');
  });

  it('Escape key clears search', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSearchBar(store);

    const input = screen.getByLabelText('Search models');
    await user.type(input, 'test');

    act(() => {
      vi.advanceTimersByTime(350);
    });

    await user.keyboard('{Escape}');

    expect(input).toHaveValue('');
    expect(store.getState().catalog.searchQuery).toBe('');
  });

  it('does not show clear button when input is empty', () => {
    renderSearchBar(store);
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('syncs external store changes to input', () => {
    renderSearchBar(store);

    // Simulate external clearFilters
    act(() => {
      store.getState().catalog.setSearchQuery('');
    });

    const input = screen.getByLabelText('Search models');
    expect(input).toHaveValue('');
  });
});
