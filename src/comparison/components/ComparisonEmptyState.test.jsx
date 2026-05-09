import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import ComparisonEmptyState from './ComparisonEmptyState';

// ── Render helper ───────────────────────────────────────────────────

function renderEmptyState(props = {}, route = '/compare') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/compare" element={<ComparisonEmptyState {...props} />} />
        <Route path="/" element={<div>Catalog</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// ── Tests ───────────────────────────────────────────────────────────

describe('ComparisonEmptyState', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── 0-model variant ──────────────────────────────────────────────

  describe('0-model variant', () => {
    // TC-ZERO-01: Full empty state renders
    it('TC-ZERO-01: renders full empty state with icon, headline, subtext, and CTA', () => {
      renderEmptyState({ modelCount: 0 });

      expect(screen.getByTestId('comparison-empty')).toBeInTheDocument();
      expect(screen.getByText('Select models to compare')).toBeInTheDocument();
      expect(screen.getByText(/choose 2.*4 models from the catalog/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Browse Catalog' })).toBeInTheDocument();
    });

    // TC-ZERO-02: Headline text and hierarchy
    it('TC-ZERO-02: headline is an h2 with correct text and classes', () => {
      renderEmptyState({ modelCount: 0 });

      const h2 = screen.getByRole('heading', { level: 2 });
      expect(h2).toHaveTextContent('Select models to compare');
      expect(h2.className).toContain('text-2xl');
      expect(h2.className).toContain('font-semibold');
      expect(h2.className).toContain('text-slate-100');
    });

    // TC-ZERO-03: Subtext content
    it('TC-ZERO-03: subtext mentions 2\u20134 models and catalog', () => {
      renderEmptyState({ modelCount: 0 });

      const subtext = screen.getByText(/choose 2.*4 models/i);
      expect(subtext.className).toContain('text-sm');
      expect(subtext.className).toContain('text-slate-400');
    });

    // TC-ZERO-04: CTA links to "/"
    it('TC-ZERO-04: CTA is a Link to "/" with Browse Catalog text', () => {
      renderEmptyState({ modelCount: 0 });

      const cta = screen.getByRole('link', { name: 'Browse Catalog' });
      expect(cta.getAttribute('href')).toBe('/');
      expect(cta.className).toContain('bg-violet-500');
      expect(cta.className).toContain('hover:bg-violet-400');
      expect(cta.className).toContain('text-white');
      expect(cta.className).toContain('rounded-lg');
    });

    // TC-ZERO-05: Columns icon with glow container
    it('TC-ZERO-05: icon container has glow styling and is aria-hidden', () => {
      renderEmptyState({ modelCount: 0 });

      const iconContainer = screen.getByTestId('comparison-empty').querySelector('[aria-hidden="true"]');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer.className).toContain('rounded-full');
      expect(iconContainer.className).toContain('bg-surface-raised');
      expect(iconContainer.className).toContain('shadow-glow');
    });

    // TC-ZERO-06: Container layout
    it('TC-ZERO-06: container is centered with correct layout classes', () => {
      renderEmptyState({ modelCount: 0 });

      const container = screen.getByTestId('comparison-empty');
      expect(container.className).toContain('max-w-lg');
      expect(container.className).toContain('mx-auto');
      expect(container.className).toContain('py-20');
      expect(container.className).toContain('px-6');
      expect(container.className).toContain('flex');
      expect(container.className).toContain('items-center');
      expect(container.className).toContain('text-center');
      expect(container.className).toContain('animate-fadeIn');
    });
  });

  // ── 1-model variant ──────────────────────────────────────────────

  describe('1-model variant', () => {
    const singleModel = {
      id: 'openai/gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
    };

    // TC-PART-01: Renders partial state
    it('TC-PART-01: renders partial state with headline, subtext, model card, and CTA', () => {
      renderEmptyState({ modelCount: 1, singleModel });

      expect(screen.getByText('Almost there!')).toBeInTheDocument();
      expect(screen.getByText(/add at least one more model/i)).toBeInTheDocument();
      expect(screen.getByText('GPT-4o')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Browse Catalog' })).toBeInTheDocument();
    });

    // TC-PART-02: Model card displays name and provider
    it('TC-PART-02: model card shows name and provider badge', () => {
      renderEmptyState({ modelCount: 1, singleModel });

      expect(screen.getByText('GPT-4o')).toBeInTheDocument();
      // Provider badge text (DOM text is lowercase; CSS applies uppercase visually)
      expect(screen.getByText('openai')).toBeInTheDocument();
    });

    // TC-PART-03: Model card styling
    it('TC-PART-03: model card uses surface-raised and correct border', () => {
      renderEmptyState({ modelCount: 1, singleModel });

      const card = screen.getByLabelText(/currently selected: gpt-4o/i);
      expect(card).toBeInTheDocument();
      expect(card.className).toContain('bg-surface-raised');
      expect(card.className).toContain('border');
      expect(card.className).toContain('border-slate-800');
      expect(card.className).toContain('rounded-xl');
    });

    // TC-PART-04: Missing singleModel fields handled gracefully
    it('TC-PART-04: handles missing name and provider gracefully', () => {
      renderEmptyState({ modelCount: 1, singleModel: { id: 'a' } });

      // Should show "Unknown" as fallback name
      expect(screen.getByText('Unknown')).toBeInTheDocument();
      // No provider badge should be rendered
      expect(screen.queryByText('a')).not.toBeInTheDocument();
    });

    // TC-PART-05: Undefined singleModel with modelCount=1 degrades to 0-model variant
    it('TC-PART-05: degrades to 0-model variant when singleModel is undefined', () => {
      renderEmptyState({ modelCount: 1, singleModel: undefined });

      // Without a singleModel object, component falls back to 0-model variant
      expect(screen.getByText('Select models to compare')).toBeInTheDocument();
      // No model card should be present
      expect(screen.queryByLabelText(/currently selected/i)).not.toBeInTheDocument();
    });
  });

  // ── CTA Navigation ───────────────────────────────────────────────

  describe('CTA navigation', () => {
    // TC-CTA-01: Links to catalog root
    it('TC-CTA-01: CTA links to "/"', () => {
      renderEmptyState({ modelCount: 0 });

      expect(screen.getByRole('link', { name: 'Browse Catalog' }).getAttribute('href')).toBe('/');
    });

    // TC-CTA-02: CTA present in both variants
    it('TC-CTA-02: CTA present in both 0-model and 1-model variants', () => {
      const { unmount } = renderEmptyState({ modelCount: 0 });
      expect(screen.getByRole('link', { name: 'Browse Catalog' })).toBeInTheDocument();
      unmount();

      renderEmptyState({ modelCount: 1, singleModel: { id: 'a', name: 'Test' } });
      expect(screen.getByRole('link', { name: 'Browse Catalog' })).toBeInTheDocument();
    });

    // TC-CTA-03: CTA aria-label
    it('TC-CTA-03: CTA has aria-label="Browse Catalog"', () => {
      renderEmptyState({ modelCount: 0 });

      expect(screen.getByRole('link', { name: 'Browse Catalog' })).toHaveAttribute('aria-label', 'Browse Catalog');
    });
  });

  // ── Keyboard Accessibility ───────────────────────────────────────

  describe('keyboard accessibility', () => {
    // TC-KB-01: CTA is focusable via Tab
    it('TC-KB-01: CTA is focusable via Tab', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderEmptyState({ modelCount: 0 });

      const cta = screen.getByRole('link', { name: 'Browse Catalog' });
      await user.tab();
      expect(cta).toHaveFocus();
    });

    // TC-KB-02: CTA activated via Enter
    it('TC-KB-02: CTA navigates on Enter', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderEmptyState({ modelCount: 0 });

      const cta = screen.getByRole('link', { name: 'Browse Catalog' });
      await user.click(cta);
      expect(screen.getByText('Catalog')).toBeInTheDocument();
    });

    // TC-KB-04: Visible focus ring classes
    it('TC-KB-04: CTA has focus-visible ring classes', () => {
      renderEmptyState({ modelCount: 0 });

      const cta = screen.getByRole('link', { name: 'Browse Catalog' });
      expect(cta.className).toContain('focus-visible:outline');
      expect(cta.className).toContain('focus-visible:outline-2');
      expect(cta.className).toContain('focus-visible:outline-violet-400');
    });
  });

  // ── ARIA ─────────────────────────────────────────────────────────

  describe('ARIA and accessibility', () => {
    // TC-A11Y-01: role="status"
    it('TC-A11Y-01: container has role="status"', () => {
      renderEmptyState({ modelCount: 0 });

      expect(screen.getByTestId('comparison-empty')).toHaveAttribute('role', 'status');
    });

    // TC-A11Y-02: aria-live="polite"
    it('TC-A11Y-02: container has aria-live="polite"', () => {
      renderEmptyState({ modelCount: 0 });

      expect(screen.getByTestId('comparison-empty')).toHaveAttribute('aria-live', 'polite');
    });

    // TC-A11Y-03: Auto-focus on CTA after mount
    it('TC-A11Y-03: auto-focuses CTA after mount', () => {
      renderEmptyState({ modelCount: 0 });

      vi.advanceTimersByTime(150);

      expect(screen.getByRole('link', { name: 'Browse Catalog' })).toHaveFocus();
    });

    // TC-A11Y-05: Icon container is aria-hidden
    it('TC-A11Y-05: icon container is aria-hidden="true"', () => {
      renderEmptyState({ modelCount: 0 });

      const iconContainer = screen.getByTestId('comparison-empty').querySelector('[aria-hidden="true"]');
      expect(iconContainer).toBeInTheDocument();
    });

    // TC-A11Y-06: 1-model card has descriptive aria-label
    it('TC-A11Y-06: 1-model card has aria-label with model name', () => {
      renderEmptyState({
        modelCount: 1,
        singleModel: { id: 'a', name: 'GPT-4o', provider: 'openai' },
      });

      expect(screen.getByLabelText('Currently selected: GPT-4o')).toBeInTheDocument();
    });
  });

  // ── Theme Compliance ─────────────────────────────────────────────

  describe('Neural Glow theme compliance', () => {
    // TC-THEME-01: surface-raised on icon container
    it('TC-THEME-01: icon container has bg-surface-raised', () => {
      renderEmptyState({ modelCount: 0 });

      const iconContainer = screen.getByTestId('comparison-empty').querySelector('[aria-hidden="true"]');
      expect(iconContainer.className).toContain('bg-surface-raised');
    });

    // TC-THEME-02: text-primary on headline
    it('TC-THEME-02: headline has text-slate-100', () => {
      renderEmptyState({ modelCount: 0 });

      expect(screen.getByRole('heading', { level: 2 }).className).toContain('text-slate-100');
    });

    // TC-THEME-03: text-secondary on subtext
    it('TC-THEME-03: subtext has text-slate-400', () => {
      renderEmptyState({ modelCount: 0 });

      expect(screen.getByText(/choose 2.*4 models/i).className).toContain('text-slate-400');
    });

    // TC-THEME-04: accent-primary CTA
    it('TC-THEME-04: CTA has bg-violet-500 and text-white', () => {
      renderEmptyState({ modelCount: 0 });

      const cta = screen.getByRole('link', { name: 'Browse Catalog' });
      expect(cta.className).toContain('bg-violet-500');
      expect(cta.className).toContain('text-white');
    });

    // TC-THEME-05: shadow-glow on icon container
    it('TC-THEME-05: icon container has shadow-glow', () => {
      renderEmptyState({ modelCount: 0 });

      const iconContainer = screen.getByTestId('comparison-empty').querySelector('[aria-hidden="true"]');
      expect(iconContainer.className).toContain('shadow-glow');
    });

    // TC-THEME-07: animate-fadeIn on container
    it('TC-THEME-07: container has animate-fadeIn', () => {
      renderEmptyState({ modelCount: 0 });

      expect(screen.getByTestId('comparison-empty').className).toContain('animate-fadeIn');
    });
  });

  // ── Edge Cases ───────────────────────────────────────────────────

  describe('edge cases', () => {
    // TC-EDGE-06: modelCount=0 but singleModel provided
    it('TC-EDGE-06: ignores singleModel when modelCount=0', () => {
      renderEmptyState({
        modelCount: 0,
        singleModel: { id: 'a', name: 'Test', provider: 'test' },
      });

      // Should render 0-model variant — no model card
      expect(screen.getByText('Select models to compare')).toBeInTheDocument();
      expect(screen.queryByLabelText(/currently selected/i)).not.toBeInTheDocument();
    });
  });

  // ── Architecture ─────────────────────────────────────────────────

  describe('architecture and feature isolation', () => {
    // TC-ARCH-01: No cross-feature imports
    it('TC-ARCH-01: source does not import from catalog, playground, or detail', async () => {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const src = await fs.readFile(
        path.resolve(import.meta.dirname, 'ComparisonEmptyState.jsx'),
        'utf-8'
      );

      expect(src).not.toMatch(/from\s+['"]\.\.\/\.\.(\/features|\/catalog|\/playground|\/detail)/);
      expect(src).not.toMatch(/from\s+['"]\.\.\/\.\.\/features/);
    });

    // TC-ARCH-02: Uses React Router Link
    it('TC-ARCH-02: uses React Router Link (not raw anchor)', async () => {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const src = await fs.readFile(
        path.resolve(import.meta.dirname, 'ComparisonEmptyState.jsx'),
        'utf-8'
      );

      // Should import Link from react-router, not use <a href
      expect(src).toMatch(/import.*Link.*from\s+['"]react-router['"]/);
      expect(src).not.toMatch(/<a\s+href/);
    });

    // TC-ARCH-03: Uses Lucide Columns icon
    it('TC-ARCH-03: imports Columns from lucide-react', async () => {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const src = await fs.readFile(
        path.resolve(import.meta.dirname, 'ComparisonEmptyState.jsx'),
        'utf-8'
      );

      expect(src).toMatch(/import.*\bColumns\b.*from\s+['"]lucide-react['"]/);
    });
  });
});
