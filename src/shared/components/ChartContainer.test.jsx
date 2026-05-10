/**
 * Tests for ChartContainer component.
 * TC-COMP-001 through TC-COMP-018, TC-INTEG-001, TC-INTEG-002
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ChartContainer from './ChartContainer';
import { chartTheme } from '../lib/chartTheme';

/* ------------------------------------------------------------------ */
/*  matchMedia mock (jsdom does not support it)                       */
/* ------------------------------------------------------------------ */

const originalMatchMedia = window.matchMedia;

function mockMatchMedia(matches = false) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query === '(prefers-reduced-motion: reduce)' ? matches : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('ChartContainer', () => {
  const defaultProps = (overrides = {}) => ({
    ariaLabel: 'Test chart',
    children: <div data-testid="child">Chart content</div>,
    ...overrides,
  });

  beforeEach(() => {
    cleanup();
    mockMatchMedia(false); // reduced-motion OFF by default
  });

  afterEach(() => {
    cleanup();
    window.matchMedia = originalMatchMedia;
  });

  // --- Rendering ---

  it('renders children correctly (TC-COMP-001)', () => {
    render(<ChartContainer {...defaultProps()} />);
    expect(screen.getByTestId('child')).toBeDefined();
    expect(screen.getByTestId('child').textContent).toBe('Chart content');
  });

  it('applies role="img" to wrapper (TC-COMP-002)', () => {
    render(<ChartContainer {...defaultProps()} />);
    const wrapper = screen.getByRole('img');
    expect(wrapper).toBeDefined();
  });

  it('propagates aria-label from ariaLabel prop (TC-COMP-003)', () => {
    render(<ChartContainer {...defaultProps()} ariaLabel="Model latency comparison" />);
    const wrapper = screen.getByRole('img');
    expect(wrapper.getAttribute('aria-label')).toBe('Model latency comparison');
  });

  it('applies aria-busy="true" when loading={true} (TC-COMP-004)', () => {
    render(<ChartContainer {...defaultProps()} loading={true} />);
    const wrapper = screen.getByRole('img');
    expect(wrapper.getAttribute('aria-busy')).toBe('true');
  });

  it('does NOT apply aria-busy when loading={false} (TC-COMP-005)', () => {
    render(<ChartContainer {...defaultProps()} loading={false} />);
    const wrapper = screen.getByRole('img');
    expect(wrapper.hasAttribute('aria-busy')).toBe(false);
  });

  // --- Loading state ---

  it('renders skeleton placeholder when loading={true} (TC-COMP-006)', () => {
    render(<ChartContainer {...defaultProps()} loading={true} />);
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).not.toBeNull();
    expect(screen.queryByTestId('child')).toBeNull();
  });

  it('hides skeleton and shows children when loading={false} (TC-COMP-007)', () => {
    render(<ChartContainer {...defaultProps()} loading={false} />);
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeNull();
    expect(screen.getByTestId('child')).toBeDefined();
  });

  // --- Error state ---

  it('displays error fallback when error prop is set (TC-COMP-008)', () => {
    render(<ChartContainer {...defaultProps()} error="Failed to load" />);
    expect(screen.getByText('Failed to load')).toBeDefined();
    expect(screen.queryByTestId('child')).toBeNull();
  });

  it('error boundary catches child render throws (TC-COMP-009)', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const BadChild = () => { throw new Error('boom'); };

    render(
      <ChartContainer ariaLabel="test">
        <BadChild />
      </ChartContainer>
    );

    expect(screen.getByText('Unable to load chart')).toBeDefined();
    consoleSpy.mockRestore();
  });

  it('error fallback displays "Unable to load chart" text (TC-COMP-010)', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const BadChild = () => { throw new Error('kaboom'); };

    render(
      <ChartContainer ariaLabel="test">
        <BadChild />
      </ChartContainer>
    );

    expect(screen.getByText('Unable to load chart')).toBeDefined();
    consoleSpy.mockRestore();
  });

  // --- Layout ---

  it('container has w-full class (TC-COMP-011)', () => {
    render(<ChartContainer {...defaultProps()} />);
    const wrapper = screen.getByRole('img');
    expect(wrapper.className).toContain('w-full');
  });

  it('respects aspectRatio prop (TC-COMP-012)', () => {
    render(<ChartContainer {...defaultProps()} aspectRatio="16/9" />);
    const chartArea = screen.getByTestId('child').parentElement;
    expect(chartArea.style.aspectRatio).toBe('16/9');
  });

  // --- Title / Subtitle ---

  it('renders title when provided (TC-COMP-013)', () => {
    render(<ChartContainer {...defaultProps()} title="Latency Trend" />);
    expect(screen.getByText('Latency Trend')).toBeDefined();
  });

  it('renders subtitle when provided (TC-COMP-014)', () => {
    render(<ChartContainer {...defaultProps()} title="Trend" subtitle="Last 30 days" />);
    expect(screen.getByText('Last 30 days')).toBeDefined();
  });

  it('does not render title/subtitle when omitted (TC-COMP-015)', () => {
    const { container } = render(<ChartContainer {...defaultProps()} />);
    expect(container.querySelector('h3')).toBeNull();
    expect(container.querySelector('p')).toBeNull();
  });

  // --- Animation ---

  it('entry animation applied by default (TC-COMP-016)', () => {
    render(<ChartContainer {...defaultProps()} />);
    const wrapper = screen.getByRole('img');
    expect(wrapper.className).toContain('animate-fadeIn');
  });

  it('entry animation skipped when prefers-reduced-motion: reduce (TC-COMP-017)', () => {
    mockMatchMedia(true); // reduced-motion ON
    render(<ChartContainer {...defaultProps()} />);
    const wrapper = screen.getByRole('img');
    expect(wrapper.className).not.toContain('animate-fadeIn');
  });
});
