import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useNavigate, useParams } from 'react-router';
import DetailPage from './DetailPage';

// ── Mock useModelDetail hook ────────────────────────────────────────
const mockFetchModel = vi.fn();
let mockHookReturn = {
  model: null,
  loading: false,
  error: null,
  fetchModel: mockFetchModel,
};

const mockUseModelDetail = vi.fn(() => mockHookReturn);

vi.mock('../hooks/useModelDetail', () => ({
  __esModule: true,
  default: (...args) => mockUseModelDetail(...args),
}));

// ── Mock useStore (global catalog store) ────────────────────────────
let mockCatalogModels = [];

vi.mock('../../shared/lib/store.js', () => ({
  useStore: (selector) => selector({ catalog: { models: mockCatalogModels } }),
}));

// ── Mock only useNavigate (keep real routing) ───────────────────────
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// ── Fixture data ────────────────────────────────────────────────────

const fullModel = {
  id: 'openai/gpt-4o',
  name: 'GPT-4o',
  description: 'Flagship multimodal model by OpenAI',
  provider: 'openai',
  pricing: { prompt: 5, completion: 15, currency: 'USD' },
  contextWindow: 128000,
  maxOutput: 16384,
  modalities: ['text', 'image'],
  qualityScore: 4.5,
  latency: 450,
  parameters: '1760B',
  archived: false,
  categories: ['chat', 'multimodal'],
  created: '2024-05-13T00:00:00.000Z',
};

const freeModel = {
  id: 'meta/llama-3-free',
  name: 'Llama 3 Free',
  provider: 'meta',
  pricing: { prompt: 0, completion: 0, currency: 'USD' },
  contextWindow: 8192,
  maxOutput: 4096,
  modalities: ['text'],
  qualityScore: 3.2,
  latency: 200,
  parameters: '8B',
  archived: false,
  categories: ['chat'],
};

// ── Render helper ───────────────────────────────────────────────────

function renderDetailPage(modelId = 'openai/gpt-4o') {
  return render(
    <MemoryRouter initialEntries={[`/models/${modelId}`]}>
      <Routes>
        <Route path="/models/*" element={<DetailPage />} />
        <Route path="/" element={<div>Catalog</div>} />
        <Route path="/playground" element={<div>Playground</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// ── Tests ───────────────────────────────────────────────────────────

describe('DetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookReturn = {
      model: null,
      loading: false,
      error: null,
      fetchModel: mockFetchModel,
    };
  });

  // TC-04: Shows skeleton while loading (loading=true, no model)
  it('TC-04: shows skeleton while loading', () => {
    mockHookReturn.loading = true;
    mockHookReturn.model = null;

    renderDetailPage();

    expect(screen.getByTestId('detail-skeleton')).toBeInTheDocument();
  });

  // TC-05: Renders model name in hero section
  it('TC-05: renders model name in the hero section', () => {
    mockHookReturn.model = fullModel;
    mockHookReturn.loading = false;

    renderDetailPage();

    expect(screen.getByTestId('model-name')).toHaveTextContent('GPT-4o');
  });

  // TC-06: Shows "Try this Model" CTA linking to playground with model id
  it('TC-06: shows Try this Model CTA with correct link', () => {
    mockHookReturn.model = fullModel;
    mockHookReturn.loading = false;

    renderDetailPage();

    const cta = screen.getByTestId('try-model-cta');
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveTextContent('Try this Model');
    expect(cta.getAttribute('href')).toBe('/playground?model=openai%2Fgpt-4o');
  });

  // TC-07: Displays error panel when fetch fails
  it('TC-07: displays error panel with retry button on fetch failure', () => {
    mockHookReturn.error = 'Network error';
    mockHookReturn.model = null;
    mockHookReturn.loading = false;

    renderDetailPage();

    expect(screen.getByTestId('error-panel')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/failed to load/i);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  // TC-07b: Not-found error shows "Model not found" and "Back to Catalog"
  it('TC-07b: shows not-found state for 404 errors', () => {
    mockHookReturn.error = 'Model not found';
    mockHookReturn.model = null;
    mockHookReturn.loading = false;

    renderDetailPage();

    expect(screen.getByTestId('error-panel')).toBeInTheDocument();
    expect(screen.getByText(/model not found/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to catalog/i })).toBeInTheDocument();
  });

  // TC-08: Retry button calls fetchModel again
  it('TC-08: retry button invokes fetchModel with the model id', async () => {
    const user = userEvent.setup();
    mockHookReturn.error = 'Network error';
    mockHookReturn.model = null;
    mockHookReturn.loading = false;

    renderDetailPage('openai/gpt-4o');

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    await user.click(retryBtn);

    expect(mockFetchModel).toHaveBeenCalledWith('openai/gpt-4o');
  });

  // TC-09: Renders stats grid with quality score, latency, context window, max output
  it('TC-09: renders stats grid with formatted stat values', () => {
    mockHookReturn.model = fullModel;
    mockHookReturn.loading = false;

    renderDetailPage();

    expect(screen.getByText('4.5/5')).toBeInTheDocument();
    expect(screen.getByText('450ms')).toBeInTheDocument();
    expect(screen.getByText(/128K tokens/)).toBeInTheDocument();
    expect(screen.getByText(/16K tokens/)).toBeInTheDocument();
  });

  // TC-10: Renders pricing section correctly for paid models
  it('TC-10: renders pricing section with prompt and completion prices', () => {
    mockHookReturn.model = fullModel;
    mockHookReturn.loading = false;

    renderDetailPage();

    expect(screen.getByText('$5.00')).toBeInTheDocument();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
    expect(screen.getByText(/input.*1m/i)).toBeInTheDocument();
    expect(screen.getByText(/output.*1m/i)).toBeInTheDocument();
  });

  // TC-10b: Shows "Free" badge for zero-pricing models
  it('TC-10b: shows Free badge for models with zero pricing', () => {
    mockHookReturn.model = freeModel;
    mockHookReturn.loading = false;

    renderDetailPage();

    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  // TC-20: Displays modalities badges
  it('TC-20: renders supported modalities as badges', () => {
    mockHookReturn.model = fullModel;
    mockHookReturn.loading = false;

    renderDetailPage();

    expect(screen.getByText('Supported Modalities')).toBeInTheDocument();
    expect(screen.getByText('text')).toBeInTheDocument();
    expect(screen.getByText('image')).toBeInTheDocument();
  });

  // Additional coverage: details card renders provider, parameters, model ID
  it('renders details card with provider, parameters, and model ID', () => {
    mockHookReturn.model = fullModel;
    mockHookReturn.loading = false;

    renderDetailPage();

    expect(screen.getByText('1760B')).toBeInTheDocument();
    expect(screen.getByText('openai/gpt-4o')).toBeInTheDocument();
  });

  // Additional coverage: categories pills render
  it('renders category pills', () => {
    mockHookReturn.model = fullModel;
    mockHookReturn.loading = false;

    renderDetailPage();

    expect(screen.getByText('chat')).toBeInTheDocument();
    expect(screen.getByText('multimodal')).toBeInTheDocument();
  });

  // Additional coverage: archived badge
  it('shows Archived badge for archived models', () => {
    mockHookReturn.model = { ...fullModel, archived: true };
    mockHookReturn.loading = false;

    renderDetailPage();

    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  // Additional coverage: shows skeleton when no model and no loading/error
  it('shows skeleton when model is null and not loading', () => {
    mockHookReturn.model = null;
    mockHookReturn.loading = false;
    mockHookReturn.error = null;

    renderDetailPage();

    expect(screen.getByTestId('detail-skeleton')).toBeInTheDocument();
  });

  // Additional coverage: shows dash placeholders for null stat values
  it('shows dash placeholders for null stat values', () => {
    const sparseModel = {
      id: 'test/sparse',
      name: 'Sparse Model',
      pricing: { prompt: null, completion: null, currency: 'USD' },
    };
    mockHookReturn.model = sparseModel;

    renderDetailPage();

    // Stats grid should have dashes for null values
    const statCards = screen.getAllByText('—');
    expect(statCards.length).toBeGreaterThanOrEqual(2);
  });

  // Regression: model ID with slash is extracted correctly from splat route
  it('correctly passes slash-containing model ID to useModelDetail hook', () => {
    mockHookReturn.loading = true;
    mockHookReturn.model = null;

    renderDetailPage('anthropic/claude-3-opus');

    expect(mockUseModelDetail).toHaveBeenCalledWith('anthropic/claude-3-opus');
  });

  // ORF-037: Pricing Percentile Bar
  describe('pricing percentile bar', () => {
    beforeEach(() => {
      mockCatalogModels = [
        { id: 'a', pricing: { prompt: 1 } },
        { id: 'b', pricing: { prompt: 2 } },
        { id: 'c', pricing: { prompt: 3 } },
        { id: 'd', pricing: { prompt: 5 } },
        { id: 'e', pricing: { prompt: 10 } },
      ];
    });

    it('renders percentile bar for paid models', () => {
      mockHookReturn.model = fullModel; // pricing.prompt = 5
      renderDetailPage();

      // 3 out of 5 have lower price (1, 2, 3) → 60th percentile
      expect(screen.getByText('More expensive than 60% of models')).toBeInTheDocument();
      expect(screen.getByText('60th percentile')).toBeInTheDocument();
    });

    it('shows "Free — cheapest tier" for free models', () => {
      mockHookReturn.model = freeModel; // pricing.prompt = 0
      renderDetailPage();

      expect(screen.getByText('Free — cheapest tier')).toBeInTheDocument();
    });

    it('hides percentile bar when catalog models are empty', () => {
      mockCatalogModels = [];
      mockHookReturn.model = fullModel;
      renderDetailPage();

      expect(screen.queryByText(/percentile/)).not.toBeInTheDocument();
      expect(screen.queryByText(/More expensive than/)).not.toBeInTheDocument();
    });

    it('hides percentile bar for null pricing', () => {
      const nullPricingModel = {
        ...fullModel,
        pricing: { prompt: null, completion: null },
      };
      mockHookReturn.model = nullPricingModel;
      renderDetailPage();

      expect(screen.queryByText(/percentile/)).not.toBeInTheDocument();
    });

    it('shows "Among the cheapest" for 0th percentile', () => {
      const cheapModel = { ...fullModel, pricing: { prompt: 0.5, completion: 1 } };
      mockHookReturn.model = cheapModel;
      renderDetailPage();

      // 0 out of 5 have lower price → 0th percentile
      expect(screen.getByText('Among the cheapest models')).toBeInTheDocument();
    });

    it('shows "Most expensive" for 100th percentile', () => {
      const expensiveModel = { ...fullModel, pricing: { prompt: 20, completion: 50 } };
      mockHookReturn.model = expensiveModel;
      renderDetailPage();

      // All 5 have lower price → 100th percentile
      expect(screen.getByText('Most expensive model')).toBeInTheDocument();
    });
  });
});
