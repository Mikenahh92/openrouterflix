import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComparisonCard from './ComparisonCard';

// ── Fixture data ────────────────────────────────────────────────────

const mockModel = {
  id: 'openai/gpt-4o',
  name: 'GPT-4o',
  provider: 'openai',
  categories: ['chat', 'multimodal'],
  modalities: ['text', 'image'],
};

const minimalModel = {
  id: 'test/model',
  name: 'Test Model',
  provider: null,
  categories: [],
  modalities: [],
};

// ── Tests ───────────────────────────────────────────────────────────

describe('ComparisonCard', () => {
  const mockOnRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TC-CARD-01: Renders model name
  it('TC-CARD-01: renders model name', () => {
    render(
      <table>
        <thead>
          <tr>
            <ComparisonCard model={mockModel} onRemove={mockOnRemove} />
          </tr>
        </thead>
      </table>
    );

    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
  });

  // TC-CARD-02: Renders provider badge
  it('TC-CARD-02: renders provider badge', () => {
    render(
      <table>
        <thead>
          <tr>
            <ComparisonCard model={mockModel} onRemove={mockOnRemove} />
          </tr>
        </thead>
      </table>
    );

    // CSS uppercase is visual only — DOM text remains lowercase
    expect(screen.getByText('openai')).toBeInTheDocument();
  });

  // TC-CARD-03: Renders category pills
  it('TC-CARD-03: renders category pills', () => {
    render(
      <table>
        <thead>
          <tr>
            <ComparisonCard model={mockModel} onRemove={mockOnRemove} />
          </tr>
        </thead>
      </table>
    );

    expect(screen.getByText('chat')).toBeInTheDocument();
    expect(screen.getByText('multimodal')).toBeInTheDocument();
  });

  // TC-CARD-04: Remove button fires callback
  it('TC-CARD-04: remove button fires onRemove callback with model ID', async () => {
    const user = userEvent.setup();
    render(
      <table>
        <thead>
          <tr>
            <ComparisonCard model={mockModel} onRemove={mockOnRemove} />
          </tr>
        </thead>
      </table>
    );

    const removeBtn = screen.getByRole('button', { name: /remove gpt-4o from comparison/i });
    await user.click(removeBtn);

    expect(mockOnRemove).toHaveBeenCalledWith('openai/gpt-4o');
  });

  // TC-CARD-05: Truncates long model names
  it('TC-CARD-05: truncates long model names with max-w', () => {
    const longNameModel = {
      ...mockModel,
      name: 'This Is A Very Long Model Name That Should Be Truncated With Ellipsis',
    };

    render(
      <table>
        <thead>
          <tr>
            <ComparisonCard model={longNameModel} onRemove={mockOnRemove} />
          </tr>
        </thead>
      </table>
    );

    const nameEl = screen.getByText('This Is A Very Long Model Name That Should Be Truncated With Ellipsis');
    expect(nameEl.className).toContain('truncate');
    expect(nameEl.className).toContain('max-w-[180px]');
  });

  // Null provider: no badge rendered (remove button still present)
  it('does not render provider badge when provider is null', () => {
    render(
      <table>
        <thead>
          <tr>
            <ComparisonCard model={minimalModel} onRemove={mockOnRemove} />
          </tr>
        </thead>
      </table>
    );

    // Provider badge should not be rendered — no uppercase-styled span with provider text
    expect(screen.queryByText('test')).not.toBeInTheDocument();
    // Remove button should still be present
    expect(screen.getByRole('button', { name: /remove test model from comparison/i })).toBeInTheDocument();
  });

  // Null model: returns null (no th rendered)
  it('returns null when model is null', () => {
    const { container } = render(
      <table>
        <thead>
          <tr>
            <ComparisonCard model={null} onRemove={mockOnRemove} />
          </tr>
        </thead>
      </table>
    );

    // Component returns null, so no <th> should be in the DOM
    expect(container.querySelector('th')).toBeNull();
  });

  // Uses scope="col"
  it('renders as a th element with scope="col"', () => {
    render(
      <table>
        <thead>
          <tr>
            <ComparisonCard model={mockModel} onRemove={mockOnRemove} />
          </tr>
        </thead>
      </table>
    );

    const th = screen.getByRole('columnheader');
    expect(th).toBeInTheDocument();
  });
});
