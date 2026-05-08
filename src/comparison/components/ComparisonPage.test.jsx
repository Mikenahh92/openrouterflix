import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import ComparisonPage from './ComparisonPage';

// ── Mock useComparison hook ────────────────────────────────────────
const mockRemoveModel = vi.fn();
let mockHookReturn = {
  models: [],
  loading: false,
  error: null,
  removeModel: mockRemoveModel,
  ids: [],
};

vi.mock('../hooks/useComparison', () => ({
  __esModule: true,
  default: () => mockHookReturn,
}));

// ── Fixture data ────────────────────────────────────────────────────

const mockModels = [
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    pricing: { prompt: 5, completion: 15, currency: 'USD' },
    contextWindow: 128000,
    maxOutput: 16384,
    modalities: ['text', 'image'],
    qualityScore: 4.5,
    latency: 450,
    categories: ['chat'],
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    pricing: { prompt: 3, completion: 15, currency: 'USD' },
    contextWindow: 200000,
    maxOutput: 8192,
    modalities: ['text'],
    qualityScore: 4.8,
    latency: 350,
    categories: ['chat', 'reasoning'],
  },
];

// ── Render helper ───────────────────────────────────────────────────

function renderComparisonPage(initialEntry = '/compare?ids=a,b') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/compare" element={<ComparisonPage />} />
        <Route path="/" element={<div>Catalog</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// ── Tests ───────────────────────────────────────────────────────────

describe('ComparisonPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookReturn = {
      models: [],
      loading: false,
      error: null,
      removeModel: mockRemoveModel,
      ids: ['a', 'b'],
    };
  });

  // TC-URL-05: Empty state when no IDs
  it('TC-URL-05: shows empty state when fewer than 2 IDs', () => {
    mockHookReturn.ids = [];
    mockHookReturn.loading = false;

    renderComparisonPage('/compare');

    expect(screen.getByTestId('comparison-empty')).toBeInTheDocument();
    expect(screen.getByText('Select models to compare')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse catalog/i })).toBeInTheDocument();
  });

  // TC-URL-06: Empty state with single ID
  it('TC-URL-06: shows empty state with single ID', () => {
    mockHookReturn.ids = ['only-one'];
    mockHookReturn.loading = false;

    renderComparisonPage('/compare?ids=only-one');

    expect(screen.getByTestId('comparison-empty')).toBeInTheDocument();
  });

  // TC-LOAD-01: Loading skeleton displayed
  it('TC-LOAD-01: shows loading skeleton while fetching', () => {
    mockHookReturn.loading = true;
    mockHookReturn.models = [];
    mockHookReturn.ids = ['a', 'b'];

    renderComparisonPage();

    expect(screen.getByTestId('comparison-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('comparison-skeleton')).toHaveAttribute('aria-busy', 'true');
  });

  // TC-LOAD-03: Loading ARIA
  it('TC-LOAD-03: skeleton has aria-busy="true"', () => {
    mockHookReturn.loading = true;
    mockHookReturn.ids = ['a', 'b'];

    renderComparisonPage();

    const skeleton = screen.getByTestId('comparison-skeleton');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
  });

  // TC-ERR-01: Error state displayed
  it('TC-ERR-01: shows error state on API failure', () => {
    mockHookReturn.error = 'Network error — unable to reach the server';
    mockHookReturn.models = [];
    mockHookReturn.ids = ['a', 'b'];

    renderComparisonPage();

    expect(screen.getByTestId('comparison-error')).toBeInTheDocument();
    expect(screen.getByText(/failed to load comparison/i)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  // TC-ERR-07: Error state back link
  it('TC-ERR-07: error state has Back to Catalog link', () => {
    mockHookReturn.error = 'Server error';
    mockHookReturn.ids = ['a', 'b'];

    renderComparisonPage();

    expect(screen.getByRole('link', { name: /back to catalog/i })).toBeInTheDocument();
  });

  // TC-URL-01: Renders table with 2 models
  it('TC-URL-01: renders comparison table with 2 models', () => {
    mockHookReturn.models = mockModels;
    mockHookReturn.ids = ['a', 'b'];

    renderComparisonPage();

    expect(screen.getByText(/comparison \(2 models\)/i)).toBeInTheDocument();
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    expect(screen.getByText('Claude 3.5 Sonnet')).toBeInTheDocument();
    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByText('Input Price')).toBeInTheDocument();
  });

  // TC-URL-02: Renders table with 3 models
  it('TC-URL-02: renders table with 3 models', () => {
    mockHookReturn.models = [
      ...mockModels,
      {
        id: 'google/gemini-pro',
        name: 'Gemini Pro',
        provider: 'google',
        pricing: { prompt: 1.25, completion: 5, currency: 'USD' },
        contextWindow: 128000,
        maxOutput: 16384,
        modalities: ['text'],
        qualityScore: 4.2,
        latency: 180,
        categories: ['chat'],
      },
    ];
    mockHookReturn.ids = ['a', 'b', 'c'];

    renderComparisonPage();

    expect(screen.getByText(/comparison \(3 models\)/i)).toBeInTheDocument();
    expect(screen.getByText('Gemini Pro')).toBeInTheDocument();
  });

  // TC-ACTN-04: Add model navigates to catalog
  it('TC-ACTN-04: Add model link navigates to /', () => {
    mockHookReturn.models = mockModels;
    mockHookReturn.ids = ['a', 'b'];

    renderComparisonPage();

    const addLink = screen.getByRole('link', { name: /add model/i });
    expect(addLink).toBeInTheDocument();
    expect(addLink.getAttribute('href')).toBe('/');
  });

  // Back to Catalog link
  it('has Back to Catalog link in header', () => {
    mockHookReturn.models = mockModels;

    renderComparisonPage();

    const backLink = screen.getByRole('link', { name: /back to catalog/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink.getAttribute('href')).toBe('/');
  });

  // Partial success: models loaded but with error
  it('shows error banner for partial success alongside table', () => {
    mockHookReturn.models = [mockModels[0]];
    mockHookReturn.error = 'Some models could not be loaded: invalid-model';
    mockHookReturn.ids = ['a', 'b'];

    renderComparisonPage();

    // Table should still render
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    // Error banner should show
    expect(screen.getByText(/some models could not be loaded/i)).toBeInTheDocument();
  });

  // TC-EMPTY-03: Empty state ARIA
  it('TC-EMPTY-03: empty state has role="status"', () => {
    mockHookReturn.ids = [];

    renderComparisonPage();

    const emptyState = screen.getByTestId('comparison-empty');
    expect(emptyState).toHaveAttribute('role', 'status');
  });

  // TC-ERR-06: Error state ARIA
  it('TC-ERR-06: error state has role="alert"', () => {
    mockHookReturn.error = 'Test error';
    mockHookReturn.ids = ['a', 'b'];

    renderComparisonPage();

    const errorState = screen.getByTestId('comparison-error');
    expect(errorState).toHaveAttribute('role', 'alert');
  });
});
