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

  // TC-D01: "View on OpenRouter" CTA renders with correct href and opens in new tab
  it('TC-D01: renders View on OpenRouter CTA with correct href and target', () => {
    mockHookReturn.model = fullModel;
    mockHookReturn.loading = false;

    renderDetailPage();

    const cta = screen.getByTestId('view-on-openrouter-cta');
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveTextContent('View on OpenRouter');
    expect(cta.getAttribute('href')).toBe('https://openrouter.ai/models/openai/gpt-4o');
    expect(cta.getAttribute('target')).toBe('_blank');
    expect(cta.getAttribute('rel')).toBe('noopener noreferrer');
  });

  // TC-D02: Referral URL correctly encodes model ID with slash
  it('TC-D02: referral URL contains correct model ID for slash-containing IDs', () => {
    const slashModel = {
      ...fullModel,
      id: 'meta-llama/llama-3.1-70b-instruct',
      name: 'Llama 3.1 70B',
    };
    mockHookReturn.model = slashModel;
    mockHookReturn.loading = false;

    renderDetailPage('meta-llama/llama-3.1-70b-instruct');

    const cta = screen.getByTestId('view-on-openrouter-cta');
    expect(cta.getAttribute('href')).toBe('https://openrouter.ai/models/meta-llama/llama-3.1-70b-instruct');
  });

  // TC-D06: Referral CTA works for free models
  it('TC-D06: renders View on OpenRouter CTA for free models', () => {
    mockHookReturn.model = freeModel;
    mockHookReturn.loading = false;

    renderDetailPage('meta/llama-3-free');

    expect(screen.getByTestId('view-on-openrouter-cta')).toBeInTheDocument();
    expect(screen.getByTestId('view-on-openrouter-cta').getAttribute('href')).toBe(
      'https://openrouter.ai/models/meta/llama-3-free'
    );
  });
});
