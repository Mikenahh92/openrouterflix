/**
 * Tests for ComparisonGrid component — including diff integration (ORF-025).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComparisonGrid from './ComparisonGrid';

const mockModels = [
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'google/gemini-pro', name: 'Gemini Pro', provider: 'Google' },
];

const mockCompareResults2 = [
  {
    model: 'openai/gpt-4o',
    text: 'Response from GPT-4o with some content.',
    tokens: 150,
    latency: 1200,
    cost: 0.003,
  },
  {
    model: 'anthropic/claude-3.5-sonnet',
    text: 'Response from Claude with different content.',
    tokens: 180,
    latency: 950,
    cost: 0.0025,
  },
];

const mockCompareResults3 = [
  ...mockCompareResults2,
  {
    model: 'google/gemini-pro',
    text: 'Response from Gemini with yet more content.',
    tokens: 200,
    latency: 800,
    cost: 0.0015,
  },
];

function renderGrid(overrides = {}) {
  const defaults = {
    models: mockModels,
    selectedModels: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
    compareResults: mockCompareResults2,
    compareErrors: [],
    isCompareLoading: false,
    onRetry: vi.fn(),
  };
  return render(<ComparisonGrid {...defaults} {...overrides} />);
}

describe('ComparisonGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Diff button visibility (TC-CG-01) ---

  describe('Diff button visibility (TC-CG-01)', () => {
    it('shows Diff button when compareResults.length >= 2', () => {
      renderGrid({ compareResults: mockCompareResults2 });

      expect(screen.getByText('Diff')).toBeInTheDocument();
    });

    it('hides Diff button when compareResults.length < 2', () => {
      renderGrid({
        compareResults: [mockCompareResults2[0]],
      });

      expect(screen.queryByText('Diff')).not.toBeInTheDocument();
    });

    it('hides Diff button when no compareResults exist', () => {
      renderGrid({ compareResults: [] });

      expect(screen.queryByText('Diff')).not.toBeInTheDocument();
    });

    it('hides Diff button while compare is loading', () => {
      renderGrid({ isCompareLoading: true });

      expect(screen.queryByText('Diff')).not.toBeInTheDocument();
    });
  });

  // --- Diff view activation with 2 results (TC-CG-02) ---

  describe('Diff activation with 2 results (TC-CG-02)', () => {
    it('opens DiffView immediately when clicking Diff with 2 results', async () => {
      const user = userEvent.setup();
      renderGrid({ compareResults: mockCompareResults2 });

      await user.click(screen.getByText('Diff'));

      // DiffView should be rendered (Back to Grid button is visible)
      expect(screen.getByText('Back to Grid')).toBeInTheDocument();
      // Grid cards should no longer be visible
      expect(screen.queryByText('Select 2–4 models')).not.toBeInTheDocument();
    });

    it('passes correct model names as labels to DiffView', async () => {
      const user = userEvent.setup();
      renderGrid({ compareResults: mockCompareResults2 });

      await user.click(screen.getByText('Diff'));

      // The diff region should have model names in aria-label
      const region = screen.getByRole('region');
      expect(region).toHaveAttribute(
        'aria-label',
        'Text comparison between GPT-4o and Claude 3.5 Sonnet'
      );
    });
  });

  // --- Pair selector with 3+ results (TC-CG-03) ---

  describe('Pair selector with 3+ results (TC-CG-03)', () => {
    it('shows pair selector when 3+ results and Diff clicked', async () => {
      const user = userEvent.setup();
      renderGrid({
        compareResults: mockCompareResults3,
        selectedModels: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro'],
      });

      await user.click(screen.getByText('Diff'));

      // Pair selector dropdowns should be present
      expect(screen.getByLabelText('Select first model to compare')).toBeInTheDocument();
      expect(screen.getByLabelText('Select second model to compare')).toBeInTheDocument();
    });

    it('defaults to first two results in pair selector', async () => {
      const user = userEvent.setup();
      renderGrid({
        compareResults: mockCompareResults3,
        selectedModels: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro'],
      });

      await user.click(screen.getByText('Diff'));

      const firstSelect = screen.getByLabelText('Select first model to compare');
      expect(firstSelect.value).toBe('openai/gpt-4o');

      const secondSelect = screen.getByLabelText('Select second model to compare');
      expect(secondSelect.value).toBe('anthropic/claude-3.5-sonnet');
    });

    it('changing pair updates the diff view', async () => {
      const user = userEvent.setup();
      renderGrid({
        compareResults: mockCompareResults3,
        selectedModels: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro'],
      });

      await user.click(screen.getByText('Diff'));

      // Change second model to Gemini
      const secondSelect = screen.getByLabelText('Select second model to compare');
      await user.selectOptions(secondSelect, 'google/gemini-pro');

      // DiffView region should now show Gemini
      const region = screen.getByRole('region');
      expect(region).toHaveAttribute(
        'aria-label',
        'Text comparison between GPT-4o and Gemini Pro'
      );
    });
  });

  // --- Back button navigation (TC-CG-04) ---

  describe('Back button (TC-CG-04)', () => {
    it('returns to grid view when Back to Grid clicked', async () => {
      const user = userEvent.setup();
      renderGrid({ compareResults: mockCompareResults2 });

      // Open diff
      await user.click(screen.getByText('Diff'));
      expect(screen.getByText('Back to Grid')).toBeInTheDocument();

      // Go back
      await user.click(screen.getByText('Back to Grid'));

      // Grid should be restored — Diff button should be visible again
      expect(screen.getByText('Diff')).toBeInTheDocument();
      // DiffView should be gone
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });
  });

  // --- Error handling (TC-CG-05) ---

  describe('Diff button hidden with errors only (TC-CG-05)', () => {
    it('hides Diff button when all results are errors', () => {
      renderGrid({
        compareResults: [],
        compareErrors: [
          { model: 'openai/gpt-4o', error: 'Rate limit' },
          { model: 'anthropic/claude-3.5-sonnet', error: 'Timeout' },
        ],
      });

      expect(screen.queryByText('Diff')).not.toBeInTheDocument();
    });
  });

  // --- Mixed success/error (TC-CG-06) ---

  describe('Mixed success/error (TC-CG-06)', () => {
    it('shows Diff button when at least 2 successful results exist', () => {
      renderGrid({
        compareResults: mockCompareResults2,
        compareErrors: [{ model: 'google/gemini-pro', error: 'Failed' }],
        selectedModels: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro'],
      });

      expect(screen.getByText('Diff')).toBeInTheDocument();
    });
  });

  // --- Diff state resets on unmount (TC-CG-07) ---

  describe('Diff state resets on unmount (TC-CG-07)', () => {
    it('diff state is not sticky across re-mounts', async () => {
      const user = userEvent.setup();
      const { unmount } = renderGrid({ compareResults: mockCompareResults2 });

      // Open diff
      await user.click(screen.getByText('Diff'));
      expect(screen.getByRole('region')).toBeInTheDocument();

      // Unmount
      unmount();

      // Re-mount — diff should NOT be open
      renderGrid({ compareResults: mockCompareResults2 });

      // Grid should be shown, not DiffView
      expect(screen.getByText('Diff')).toBeInTheDocument();
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });
  });

  // --- Existing ComparisonGrid behavior preserved ---

  describe('existing grid behavior', () => {
    it('renders empty state when no models selected', () => {
      renderGrid({
        selectedModels: [],
        compareResults: [],
        isCompareLoading: false,
      });

      expect(
        screen.getByText('Select 2–4 models and send a prompt to compare responses.')
      ).toBeInTheDocument();
    });

    it('renders error count when some models failed', () => {
      renderGrid({
        compareResults: mockCompareResults2,
        compareErrors: [{ model: 'google/gemini-pro', error: 'Failed' }],
        selectedModels: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro'],
      });

      expect(screen.getByText('1 model failed')).toBeInTheDocument();
    });

    it('renders "All models failed" when no results and has errors', () => {
      renderGrid({
        compareResults: [],
        compareErrors: [
          { model: 'openai/gpt-4o', error: 'Fail 1' },
          { model: 'anthropic/claude-3.5-sonnet', error: 'Fail 2' },
        ],
      });

      expect(screen.getByText('All models failed')).toBeInTheDocument();
    });
  });
});
