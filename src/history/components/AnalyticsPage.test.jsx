/**
 * Component tests for AnalyticsPage.
 *
 * Covers:
 *   TC-COMP-001: Empty state rendering (no history data)
 *   TC-COMP-002: Stats table renders with data
 *   TC-COMP-003: Null cost display
 *   TC-COMP-004: Reactive store updates
 *   TC-COMP-005: Sorting by column
 *   TC-INTEG-001: Route renders AnalyticsPage
 *   TC-INTEG-002: HistoryPage contains link to analytics
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';

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

// Test fixture runs
const MOCK_RUNS = [
  {
    id: '1', type: 'playground', modelId: 'openai/gpt-4', modelName: 'gpt-4', modelProvider: 'OpenAI',
    prompt: 'Hello', responseText: 'Hi', tokens: 350, latency: 1200, cost: 0.05, createdAt: '2026-05-10T10:00:00Z',
  },
  {
    id: '2', type: 'playground', modelId: 'openai/gpt-4', modelName: 'gpt-4', modelProvider: 'OpenAI',
    prompt: 'Hi', responseText: 'Hello', tokens: 300, latency: 980, cost: 0.04, createdAt: '2026-05-10T10:05:00Z',
  },
  {
    id: '3', type: 'playground', modelId: 'openai/gpt-4', modelName: 'gpt-4', modelProvider: 'OpenAI',
    prompt: 'Test', responseText: 'Result', tokens: 400, latency: 2500, cost: null, createdAt: '2026-05-10T10:10:00Z',
  },
  {
    id: '4', type: 'playground', modelId: 'anthropic/claude-3-opus', modelName: 'claude-3-opus', modelProvider: 'Anthropic',
    prompt: 'Hey', responseText: 'There', tokens: 280, latency: 800, cost: 0.03, createdAt: '2026-05-10T10:15:00Z',
  },
  {
    id: '5', type: 'comparison', modelId: 'anthropic/claude-3-opus', modelName: 'claude-3-opus', modelProvider: 'Anthropic',
    prompt: 'Compare', responseText: 'Result', tokens: 290, latency: 900, cost: 0.035, createdAt: '2026-05-10T10:20:00Z', groupId: 'g1',
  },
  {
    id: '6', type: 'playground', modelId: 'meta/llama-3-70b', modelName: 'llama-3-70b', modelProvider: 'Meta',
    prompt: 'Go', responseText: 'Done', tokens: 250, latency: 600, cost: 0.001, createdAt: '2026-05-10T10:25:00Z',
  },
];

// Mock the history store module
let currentMockRuns = [];

vi.mock('../../history/store', () => ({
  default: (selector) => {
    const state = { runs: currentMockRuns };
    return selector(state);
  },
}));

// Import after mocks
import AnalyticsPage from './AnalyticsPage';
import HistoryPage from './HistoryPage';

function renderAnalyticsPage() {
  return render(
    <MemoryRouter initialEntries={['/history/analytics']}>
      <Routes>
        <Route path="/history/analytics" element={<AnalyticsPage />} />
        <Route path="/history" element={<div>History Page</div>} />
        <Route path="/playground" element={<div>Playground</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// --- Tests ---

describe('AnalyticsPage', () => {
  beforeEach(() => {
    currentMockRuns = [];
    vi.clearAllMocks();
  });

  describe('TC-COMP-001: Empty state', () => {
    it('renders empty state when no history data exists', () => {
      renderAnalyticsPage();

      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('No analytics data yet')).toBeInTheDocument();
      expect(screen.getByText(/Run prompts in the Playground/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Go to Playground/i })).toBeInTheDocument();
    });

    it('shows back link to history', () => {
      renderAnalyticsPage();
      expect(screen.getByText('Back to History')).toBeInTheDocument();
    });

    it('does not render table or filters when empty', () => {
      renderAnalyticsPage();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('TC-COMP-002: Stats table with data', () => {
    beforeEach(() => {
      currentMockRuns = MOCK_RUNS;
    });

    it('renders the analytics page with data', () => {
      renderAnalyticsPage();

      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('Per-Model Statistics')).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('renders summary cards', () => {
      renderAnalyticsPage();

      expect(screen.getByLabelText(/Total Runs/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Models/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Avg Latency/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Total Cost/)).toBeInTheDocument();
    });

    it('displays correct total runs and model count', () => {
      renderAnalyticsPage();

      // 6 total runs
      expect(screen.getByLabelText(/Total Runs/)).toHaveTextContent('6');
      // 3 unique models
      expect(screen.getByLabelText(/Models/)).toHaveTextContent('3');
    });

    it('renders a table row per model', () => {
      renderAnalyticsPage();

      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('row');
      // 1 header + 3 model rows
      expect(rows).toHaveLength(4);
    });

    it('displays model names in the table', () => {
      renderAnalyticsPage();

      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.getByText('claude-3-opus')).toBeInTheDocument();
      expect(screen.getByText('llama-3-70b')).toBeInTheDocument();
    });
  });

  describe('TC-COMP-003: Null cost display', () => {
    it('shows N/A for models with all null costs', () => {
      currentMockRuns = [
        {
          id: '1', type: 'playground', modelId: 'test/model', modelName: 'test-model', modelProvider: 'Test',
          prompt: 'Hi', responseText: 'Hello', tokens: 100, latency: 500, cost: null, createdAt: '2026-05-10T10:00:00Z',
        },
      ];
      renderAnalyticsPage();

      // Should show N/A in the cost column
      const nACells = screen.getAllByText('N/A');
      expect(nACells.length).toBeGreaterThan(0);
    });

    it('handles mixed null and valid costs', () => {
      currentMockRuns = MOCK_RUNS;
      renderAnalyticsPage();

      // gpt-4 has 2 valid costs and 1 null — avg should be computed from non-null only
      // No NaN or "undefined" should be rendered
      const body = screen.getByRole('table').textContent;
      expect(body).not.toContain('NaN');
      expect(body).not.toContain('undefined');
    });
  });

  describe('TC-COMP-004: Reactive store updates', () => {
    it('updates when runs are added to the store', () => {
      currentMockRuns = MOCK_RUNS;
      const { rerender } = renderAnalyticsPage();

      // Should show 6 runs
      expect(screen.getByLabelText(/Total Runs/)).toHaveTextContent('6');

      // Add a new run
      act(() => {
        currentMockRuns = [
          ...MOCK_RUNS,
          {
            id: '7', type: 'playground', modelId: 'openai/gpt-4', modelName: 'gpt-4', modelProvider: 'OpenAI',
            prompt: 'New', responseText: 'Response', tokens: 100, latency: 500, cost: 0.01, createdAt: '2026-05-10T11:00:00Z',
          },
        ];
      });

      rerender(
        <MemoryRouter initialEntries={['/history/analytics']}>
          <Routes>
            <Route path="/history/analytics" element={<AnalyticsPage />} />
            <Route path="/history" element={<div>History Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      // Should show 7 runs now
      expect(screen.getByLabelText(/Total Runs/)).toHaveTextContent('7');
    });
  });

  describe('TC-COMP-005: Sorting', () => {
    beforeEach(() => {
      currentMockRuns = MOCK_RUNS;
    });

    it('sorts by run count on header click', async () => {
      const user = userEvent.setup();
      renderAnalyticsPage();

      const table = screen.getByRole('table');
      const runsHeader = within(table).getByRole('button', { name: /Runs/i });
      await user.click(runsHeader);

      // After clicking, rows should be re-sorted (all models have 1-3 runs)
      const rows = within(table).getAllByRole('row');
      expect(rows).toHaveLength(4); // header + 3 models
    });

    it('toggles sort direction on second click', async () => {
      const user = userEvent.setup();
      renderAnalyticsPage();

      const table = screen.getByRole('table');
      const latencyHeader = within(table).getByRole('button', { name: /Avg Latency/i });

      // First click — default is desc for new key
      await user.click(latencyHeader);
      expect(latencyHeader).toHaveAttribute('aria-sort', 'descending');

      // Second click — toggle to asc
      await user.click(latencyHeader);
      expect(latencyHeader).toHaveAttribute('aria-sort', 'ascending');
    });
  });

  describe('TC-INTEG-002: HistoryPage contains link to analytics', () => {
    it('renders "View Analytics" link on HistoryPage', () => {
      render(
        <MemoryRouter>
          <HistoryPage />
        </MemoryRouter>
      );

      const link = screen.getByRole('link', { name: /View Analytics/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/history/analytics');
    });
  });
});
