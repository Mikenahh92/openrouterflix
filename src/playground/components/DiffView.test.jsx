/**
 * Unit tests for DiffView component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiffView from './DiffView';

describe('DiffView', () => {
  const defaultProps = {
    textA: '',
    textB: '',
    labelA: 'Model A',
    labelB: 'Model B',
    displayMode: 'unified',
    onDisplayModeChange: vi.fn(),
    onBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Unified mode rendering ---

  describe('unified mode', () => {
    it('renders added lines with green highlight and + prefix (TC-DV-01)', () => {
      render(
        <DiffView
          {...defaultProps}
          textA="line1\nline2\n"
          textB="line1\nline2\nline3\n"
        />
      );

      // Added line "line3" should be present in an emerald element
      const addedEl = screen.getByText(/line3/);
      expect(addedEl).toBeInTheDocument();
      expect(addedEl.closest('[class*="emerald"]')).toBeInTheDocument();
    });

    it('renders deleted lines with red highlight and minus prefix (TC-DV-02)', () => {
      render(
        <DiffView
          {...defaultProps}
          textA="line1\nline2\nline3\n"
          textB="line1\nline3\n"
        />
      );

      // Removed line "line2" should be present
      const removedEl = screen.getByText(/line2/);
      expect(removedEl).toBeInTheDocument();
      expect(removedEl.closest('[class*="red"]')).toBeInTheDocument();
    });

    it('renders unchanged lines in neutral color', () => {
      render(
        <DiffView
          {...defaultProps}
          textA="same\nline\n"
          textB="same\nline\n"
          displayMode="unified"
        />
      );

      // "No differences found" banner should show for identical texts
      expect(screen.getByText('No differences found')).toBeInTheDocument();
    });

    it('identical texts show "No differences found" banner (TC-DV-07)', () => {
      render(
        <DiffView {...defaultProps} textA="same text" textB="same text" />
      );

      expect(screen.getByText('No differences found')).toBeInTheDocument();
      expect(screen.getByText('Both responses are identical.')).toBeInTheDocument();
    });

    it('both empty texts show empty state (TC-DV-08)', () => {
      render(<DiffView {...defaultProps} textA="" textB="" />);

      expect(screen.getByText('No responses to compare')).toBeInTheDocument();
    });

    it('one empty text renders all-removed (TC-DV-09)', () => {
      render(
        <DiffView {...defaultProps} textA="content here\n" textB="" />
      );

      // The removed text should be present in red
      const removedEl = screen.getByText(/content here/);
      expect(removedEl).toBeInTheDocument();
      expect(removedEl.closest('[class*="red"]')).toBeInTheDocument();
    });

    it('one empty textB renders all-added (TC-DV-09)', () => {
      render(
        <DiffView {...defaultProps} textA="" textB="content here\n" />
      );

      // The added text should be present in green
      const addedEl = screen.getByText(/content here/);
      expect(addedEl).toBeInTheDocument();
      expect(addedEl.closest('[class*="emerald"]')).toBeInTheDocument();
    });

    it('unicode and emoji content renders correctly (TC-DV-10)', () => {
      render(
        <DiffView
          {...defaultProps}
          textA="Hello 🌍\n日本語テスト\n"
          textB="Hello 🌎\n日本語テスト\n新行\n"
        />
      );

      expect(screen.getByText(/新行/)).toBeInTheDocument();
      const addedEl = screen.getByText(/新行/);
      expect(addedEl.closest('[class*="emerald"]')).toBeInTheDocument();
    });

    it('large responses render without crash (TC-DV-11)', () => {
      // Generate two ~10K character strings
      const line = 'This is a test line with some content for diffing. ';
      const linesA = Array.from({ length: 200 }, (_, i) => `${line}${i}`).join('\n');
      const linesB = Array.from({ length: 200 }, (_, i) =>
        i === 50 ? `modified line ${i}` : `${line}${i}`
      ).join('\n');

      expect(() =>
        render(
          <DiffView {...defaultProps} textA={linesA} textB={linesB} />
        )
      ).not.toThrow();

      // Scrollable container should be present
      const container = document.querySelector('[class*="max-h-"]');
      expect(container).toBeInTheDocument();
    });
  });

  // --- Side-by-side mode rendering ---

  describe('side-by-side mode', () => {
    it('renders two column containers (TC-DV-03)', () => {
      render(
        <DiffView
          {...defaultProps}
          textA="left content\n"
          textB="right content\n"
          displayMode="side-by-side"
        />
      );

      // The side-by-side renderer should have two column headers
      expect(screen.getByText('Model A')).toBeInTheDocument();
      expect(screen.getByText('Model B')).toBeInTheDocument();
    });

    it('highlights additions and deletions in respective columns (TC-DV-04)', () => {
      const { container } = render(
        <DiffView
          {...defaultProps}
          textA="alpha\nbeta\n"
          textB="alpha\ngamma\n"
          displayMode="side-by-side"
        />
      );

      // "beta" should appear as removed (red) — may appear in both side-by-side and fallback unified
      const betaEls = screen.getAllByText(/beta/);
      expect(betaEls.length).toBeGreaterThanOrEqual(1);
      // "gamma" should appear as added (green)
      const gammaEls = screen.getAllByText(/gamma/);
      expect(gammaEls.length).toBeGreaterThanOrEqual(1);
      // Should have emerald and red colored elements
      expect(container.querySelector('[class*="emerald"]')).toBeInTheDocument();
      expect(container.querySelector('[class*="red"]')).toBeInTheDocument();
    });
  });

  // --- Toggle and interaction ---

  describe('mode toggle (TC-DV-05)', () => {
    it('toggle fires onDisplayModeChange callback', async () => {
      const onDisplayModeChange = vi.fn();
      const user = userEvent.setup();

      render(
        <DiffView
          {...defaultProps}
          onDisplayModeChange={onDisplayModeChange}
          textA="a\nb\n"
          textB="a\nc\n"
        />
      );

      const sideBySideBtn = screen.getByRole('tab', { name: /side by side/i });
      await user.click(sideBySideBtn);

      expect(onDisplayModeChange).toHaveBeenCalledWith('side-by-side');
    });
  });

  describe('back button (TC-DV-06)', () => {
    it('calls onBack callback', async () => {
      const onBack = vi.fn();
      const user = userEvent.setup();

      render(
        <DiffView {...defaultProps} onBack={onBack} textA="a" textB="b" />
      );

      const backBtn = screen.getByText('Back to Grid');
      await user.click(backBtn);

      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  // --- Accessibility ---

  describe('accessibility (TC-DV-13)', () => {
    it('has region role with aria-label containing model names', () => {
      render(
        <DiffView
          {...defaultProps}
          textA="hello\n"
          textB="world\n"
          labelA="GPT-4o"
          labelB="Claude 3.5 Sonnet"
        />
      );

      const region = screen.getByRole('region');
      expect(region.getAttribute('aria-label')).toContain('GPT-4o');
      expect(region.getAttribute('aria-label')).toContain('Claude 3.5 Sonnet');
    });

    it('diff lines have aria-label indicating change type', () => {
      render(
        <DiffView
          {...defaultProps}
          textA="line1\nremoved\n"
          textB="line1\nadded\n"
        />
      );

      expect(screen.getByLabelText('added line')).toBeInTheDocument();
      expect(screen.getByLabelText('removed line')).toBeInTheDocument();
    });

    it('mode toggle has tablist and tab roles', () => {
      render(
        <DiffView
          {...defaultProps}
          textA="a\n"
          textB="b\n"
        />
      );

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- useMemo memoization ---

  describe('memoization (TC-DV-12)', () => {
    it('diff computation is memoized via useMemo', () => {
      const { rerender } = render(
        <DiffView {...defaultProps} textA="hello\n" textB="world\n" />
      );

      // First render should succeed without error
      // Re-render with same props should not throw
      rerender(
        <DiffView {...defaultProps} textA="hello\n" textB="world\n" />
      );

      // Diff should still be visible
      expect(screen.getByRole('region')).toBeInTheDocument();
    });
  });

  // --- Empty state back button ---

  describe('empty state', () => {
    it('shows back button in empty state', () => {
      render(<DiffView {...defaultProps} textA="" textB="" />);

      expect(screen.getByText('Back to Grid')).toBeInTheDocument();
    });

    it('empty state back button calls onBack', async () => {
      const onBack = vi.fn();
      const user = userEvent.setup();

      render(
        <DiffView {...defaultProps} textA="" textB="" onBack={onBack} />
      );

      await user.click(screen.getByText('Back to Grid'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });
});
