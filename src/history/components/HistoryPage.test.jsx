/**
 * Component tests for HistoryPage.
 *
 * Covers:
 *   - TC-PAGE-01: Page renders with correct structure (title, filters, clear button, records)
 *   - TC-PAGE-02: Empty state with CTA link to Playground
 *   - TC-PAGE-03: Record row displays correct data (collapsed)
 *   - TC-PAGE-04: Record row expands on click
 *   - TC-PAGE-05: Accordion — only one expanded at a time
 *   - TC-PAGE-06: Delete single record
 *   - TC-PAGE-07: Clear all with confirmation
 *   - TC-PAGE-08: Clear all cancelled
 *   - TC-FILTER-02: Model filter text search
 *   - TC-FILTER-05: No matching filters shows empty message
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

// --- Mocks ---

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock crypto
vi.stubGlobal('crypto', {
  randomUUID: () => `uuid-${Math.random().toString(36).slice(2, 9)}`,
});

// Mock the history store module
const mockRuns = [];
const mockStoreActions = {
  addRun: vi.fn(),
  addComparisonRun: vi.fn(),
  deleteRun: vi.fn(),
  clearAll: vi.fn(),
};

vi.mock('../../history/store', () => ({
  default: {
    getState: () => ({
      runs: mockRuns,
      ...mockStoreActions,
    }),
    setState: vi.fn(),
    subscribe: vi.fn(),
  },
}));

// Mock useHistory hook
vi.mock('../../history/hooks/useHistory', () => ({
  default: () => ({
    runs: mockRuns,
    ...mockStoreActions,
  }),
}));

// Need to import after mocks
import HistoryPage from './HistoryPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <HistoryPage />
    </MemoryRouter>
  );
}

function makeRun(overrides = {}) {
  return {
    id: `run-${Math.random().toString(36).slice(2, 7)}`,
    type: 'playground',
    modelId: 'openai/gpt-4o',
    modelName: 'GPT-4o',
    modelProvider: 'OpenAI',
    prompt: 'Explain quantum computing in simple terms',
    responseText: 'Quantum computing uses qubits that can be both 0 and 1.',
    tokens: 245,
    latency: 1200,
    cost: 0.0012,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('HistoryPage', () => {
  beforeEach(() => {
    mockRuns.length = 0;
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  // TC-PAGE-01: Page renders with correct structure
  it('renders page title, clear button (hidden when empty), and empty state', () => {
    renderPage();
    expect(screen.getByText('Run History')).toBeInTheDocument();
    expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
    expect(screen.getByText('No run history yet')).toBeInTheDocument();
  });

  // TC-PAGE-02: Empty state with CTA link
  it('shows empty state with CTA link to Playground', () => {
    renderPage();
    expect(screen.getByText('No run history yet')).toBeInTheDocument();
    expect(
      screen.getByText(/Go to Playground/)
    ).toBeInTheDocument();
  });

  // TC-PAGE-03: Record row displays correct data
  it('renders records with model name, type badge, and metadata badges', () => {
    mockRuns.push(makeRun());
    renderPage();

    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    // "Playground" appears in both the type filter dropdown option and the badge
    expect(screen.getAllByText('Playground').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/245 tokens/)).toBeInTheDocument();
    expect(screen.getByText('1.2s')).toBeInTheDocument();
    expect(screen.getByText('$0.0012')).toBeInTheDocument();
  });

  // TC-PAGE-04: Record row expands on click
  it('expands a record row on click to show full details', async () => {
    const user = userEvent.setup();
    mockRuns.push(makeRun());
    renderPage();

    // Initially, response text and "Prompt"/"Response" labels should not be visible
    expect(screen.queryByText('Prompt')).not.toBeInTheDocument();
    expect(screen.queryByText('Quantum computing uses qubits that can be both 0 and 1.')).not.toBeInTheDocument();

    // Click the record row to expand — find by aria-expanded attribute
    const row = document.querySelector('[aria-expanded="false"]');
    await user.click(row);

    // Full prompt and response should now be visible
    expect(screen.getByText('Prompt')).toBeInTheDocument();
    expect(screen.getByText('Response')).toBeInTheDocument();
    expect(screen.getByText('Quantum computing uses qubits that can be both 0 and 1.')).toBeInTheDocument();
    expect(screen.getByText('Collapse')).toBeInTheDocument();
  });

  // TC-PAGE-05: Accordion — only one expanded at a time
  it('collapses previous record when expanding another', async () => {
    const user = userEvent.setup();
    mockRuns.push(
      makeRun({ id: 'run-1', modelName: 'GPT-4o', prompt: 'This is a very long first prompt that exceeds eighty characters to be truncated in collapsed mode' }),
      makeRun({ id: 'run-2', modelName: 'Claude 3', prompt: 'This is a very long second prompt that exceeds eighty characters to be truncated in collapsed mode' })
    );
    renderPage();

    const rows = document.querySelectorAll('[aria-expanded]');
    // Expand first record row
    await user.click(rows[0]);
    // Full prompt should be visible (Prompt label visible when expanded)
    expect(screen.getAllByText('Prompt').length).toBe(1);

    // Expand second record row
    await user.click(rows[1]);
    // Only one Prompt label visible (second expanded, first collapsed)
    expect(screen.getAllByText('Prompt').length).toBe(1);
  });

  // TC-PAGE-06: Delete single record
  it('deletes a record when delete button is clicked', async () => {
    const user = userEvent.setup();
    mockRuns.push(makeRun({ id: 'run-del' }));
    renderPage();

    const deleteBtn = screen.getByLabelText('Delete this run record');
    await user.click(deleteBtn);
    expect(mockStoreActions.deleteRun).toHaveBeenCalledWith('run-del');
  });

  // TC-PAGE-07: Clear all with confirmation
  it('clears all records after confirmation', async () => {
    const user = userEvent.setup();
    mockRuns.push(makeRun(), makeRun());
    renderPage();

    // Click "Clear all" button
    const clearBtn = screen.getByRole('button', { name: /Clear all/ });
    await user.click(clearBtn);

    // Confirmation bar should appear
    expect(screen.getByText(/Clear all run history\?/)).toBeInTheDocument();

    // Confirm
    const confirmBtn = screen.getAllByRole('button').find(
      (b) => b.textContent === 'Clear all' && b.closest('[role="alertdialog"]')
    );
    expect(confirmBtn).toBeDefined();
    await user.click(confirmBtn);

    expect(mockStoreActions.clearAll).toHaveBeenCalledTimes(1);
  });

  // TC-PAGE-08: Clear all cancelled
  it('does not clear records when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    mockRuns.push(makeRun(), makeRun());
    renderPage();

    // Click "Clear all"
    const clearBtn = screen.getByRole('button', { name: /Clear all/ });
    await user.click(clearBtn);

    // Cancel
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelBtn);

    expect(mockStoreActions.clearAll).not.toHaveBeenCalled();
  });

  // TC-FILTER-02: Model filter
  it('filters records by model name', async () => {
    const user = userEvent.setup();
    mockRuns.push(
      makeRun({ id: 'run-1', modelName: 'GPT-4o' }),
      makeRun({ id: 'run-2', modelName: 'Claude 3' })
    );
    renderPage();

    // Both should be visible
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    expect(screen.getByText('Claude 3')).toBeInTheDocument();

    // Filter by model
    const input = screen.getByPlaceholderText('Filter by model...');
    await user.type(input, 'gpt');

    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    expect(screen.queryByText('Claude 3')).not.toBeInTheDocument();
  });

  // TC-FILTER-05: No matching filters
  it('shows no-match message when filters exclude all records', async () => {
    const user = userEvent.setup();
    mockRuns.push(makeRun({ modelName: 'GPT-4o' }));
    renderPage();

    const input = screen.getByPlaceholderText('Filter by model...');
    await user.type(input, 'nonexistent');

    expect(screen.getByText('No records match your filters')).toBeInTheDocument();
    expect(screen.getByText('Clear filters')).toBeInTheDocument();
  });

  // TC-PAGE-01b: Clear button visible when records exist
  it('shows Clear all button when records exist', () => {
    mockRuns.push(makeRun());
    renderPage();
    expect(screen.getByRole('button', { name: /Clear all/ })).toBeInTheDocument();
  });

  // TC-FILTER-03: Type filter
  it('filters records by type', async () => {
    const user = userEvent.setup();
    mockRuns.push(
      makeRun({ id: 'run-1', type: 'playground', modelName: 'GPT-4o' }),
      makeRun({ id: 'run-2', type: 'comparison', modelName: 'Claude 3' })
    );
    renderPage();

    // Select "Playground" from type dropdown
    const select = screen.getByDisplayValue('All types');
    await user.selectOptions(select, 'playground');

    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    expect(screen.queryByText('Claude 3')).not.toBeInTheDocument();
  });

  // A11Y: aria-expanded
  it('toggles aria-expanded on record expand/collapse', async () => {
    const user = userEvent.setup();
    mockRuns.push(makeRun());
    renderPage();

    const row = document.querySelector('[aria-expanded]');
    expect(row).toHaveAttribute('aria-expanded', 'false');

    await user.click(row);
    expect(row).toHaveAttribute('aria-expanded', 'true');

    await user.click(row);
    expect(row).toHaveAttribute('aria-expanded', 'false');
  });
});
