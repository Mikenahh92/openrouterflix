import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import AppLayout from './AppLayout';

// ── Render helper ───────────────────────────────────────────────────

function renderWithRoute(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<div>Catalog Page</div>} />
          <Route path="/compare" element={<div>Compare Page</div>} />
          <Route path="/playground" element={<div>Playground Page</div>} />
          <Route path="/history" element={<div>History Page</div>} />
          <Route path="/templates" element={<div>Templates Page</div>} />
          <Route path="/models/*" element={<div>Detail Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

// ── Tests ───────────────────────────────────────────────────────────

describe('AppLayout', () => {
  // TC-F01: Footer renders on page
  it('TC-F01: renders footer element', () => {
    renderWithRoute('/');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  // TC-F03: Footer contains "Powered by OpenRouter" attribution
  it('TC-F03: footer contains Powered by OpenRouter text', () => {
    renderWithRoute('/');
    expect(screen.getByText(/powered by/i)).toBeInTheDocument();
    expect(screen.getByText('OpenRouter', { selector: 'footer a' })).toBeInTheDocument();
  });

  // TC-F04: "Powered by OpenRouter" links to openrouter.ai
  it('TC-F04: Powered by OpenRouter link points to openrouter.ai and opens in new tab', () => {
    renderWithRoute('/');
    const link = screen.getByText('OpenRouter', { selector: 'footer a' });
    expect(link.getAttribute('href')).toBe('https://openrouter.ai');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  // TC-F02: Footer contains donation link
  it('TC-F02: footer contains Support Us donation link with external attributes', () => {
    renderWithRoute('/');
    const supportLink = screen.getByText(/support us/i);
    expect(supportLink).toBeInTheDocument();
    expect(supportLink.getAttribute('href')).toMatch(/^https:\/\//);
    expect(supportLink.getAttribute('target')).toBe('_blank');
    expect(supportLink.getAttribute('rel')).toBe('noopener noreferrer');
  });

  // TC-F05: Footer visible on all routes
  it('TC-F05: footer renders on all application routes', () => {
    const routes = ['/', '/compare', '/playground', '/history', '/templates', '/models/test-model'];

    for (const route of routes) {
      const { unmount } = renderWithRoute(route);
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      unmount();
    }
  });

  // TC-R03: App layout structure preserved (Header → Main → Footer → CompareBar)
  it('TC-R03: maintains correct layout structure order', () => {
    const { container } = renderWithRoute('/');
    const layout = container.firstChild;
    const children = Array.from(layout.children);

    const tags = children.map((el) => el.tagName.toLowerCase());
    expect(tags).toEqual(['header', 'main', 'footer', 'div']); // CompareBar renders as div
  });
});
