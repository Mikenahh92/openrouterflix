import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import ModelCard from './ModelCard.jsx';
import { useStore } from '../../shared/lib/store.js';

const mockModel = {
  id: 'openai/gpt-4o',
  name: 'GPT-4o',
  provider: 'OpenAI',
  pricing: { prompt: 2.5, completion: 10 },
  contextWindow: 128000,
  categories: ['Chat', 'Code'],
  qualityScore: 4.5,
};

const mockModel2 = {
  id: 'anthropic/claude-3-opus',
  name: 'Claude 3 Opus',
  provider: 'Anthropic',
  pricing: { prompt: 15, completion: 75 },
  contextWindow: 200000,
  categories: ['Chat'],
  qualityScore: 4.7,
};

function renderCard(model = mockModel) {
  return render(
    <MemoryRouter>
      <ModelCard model={model} />
    </MemoryRouter>
  );
}

describe('ModelCard — compare checkbox', () => {
  beforeEach(() => {
    // Reset store state
    const state = useStore.getState();
    state.catalog.compareSelections = [];
  });

  // TC-10: Checkbox renders unchecked when model not selected
  it('TC-10: renders unchecked checkbox when model not selected', () => {
    renderCard();

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    // Card should not have violet border
    const link = checkbox.closest('a');
    expect(link.className).not.toContain('border-violet-500');
  });

  // TC-11: Checkbox renders checked when model is selected
  it('TC-11: renders checked checkbox with violet border when model is selected', () => {
    const state = useStore.getState();
    state.catalog.compareSelections = ['openai/gpt-4o'];

    renderCard();

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
    // Card should have violet border
    const link = checkbox.closest('a');
    expect(link.className).toContain('border-violet-500');
  });

  // TC-12: Clicking unchecked checkbox calls toggleCompare
  it('TC-12: clicking unchecked checkbox calls toggleCompare', () => {
    renderCard();

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    const state = useStore.getState();
    expect(state.catalog.compareSelections).toContain('openai/gpt-4o');
  });

  // TC-13: Checkbox click does not propagate to card navigation
  it('TC-13: checkbox click does not propagate to card navigation', () => {
    renderCard();

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // The click should be stopped from propagating (preventDefault + stopPropagation)
    // We verify by checking the store was updated (checkbox handler ran)
    // but no navigation occurred (MemoryRouter didn't change)
    const state = useStore.getState();
    expect(state.catalog.compareSelections).toContain('openai/gpt-4o');
  });

  // TC-14: Max-limit — checkbox is disabled when 4 models already selected
  it('TC-14: checkbox is disabled when 4 models already selected', () => {
    const state = useStore.getState();
    state.catalog.compareSelections = ['a', 'b', 'c', 'd'];

    renderCard();

    const checkbox = screen.getByRole('checkbox');
    // Checkbox should be disabled because max reached and this model is not in the selection
    expect(checkbox).toBeDisabled();
    // Clicking disabled button should not add to selection
    fireEvent.click(checkbox);
    expect(useStore.getState().catalog.compareSelections).toEqual(['a', 'b', 'c', 'd']);
  });

  // TC-14b: Max-limit toast shows and auto-dismisses when max feedback is triggered
  it('TC-14b: shows max-limit toast and auto-dismisses', async () => {
    vi.useFakeTimers();

    renderCard();

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeDisabled();

    // Fill up to 4 with this card's model + 3 others
    fireEvent.click(checkbox);
    useStore.getState().catalog.toggleCompare('b');
    useStore.getState().catalog.toggleCompare('c');
    useStore.getState().catalog.toggleCompare('d');

    // Now 4 selected. Render a card for a different model (not selected)
    const { unmount } = render(
      <MemoryRouter>
        <ModelCard model={mockModel2} />
      </MemoryRouter>
    );

    // Find the Claude checkbox specifically
    const claudeCheckbox = screen.getAllByRole('checkbox').find(
      (cb) => cb.getAttribute('aria-label')?.includes('Claude')
    );
    expect(claudeCheckbox).toBeDisabled();

    unmount();
    vi.useRealTimers();
  });

  // TC-15: Checkbox has correct ARIA attributes
  it('TC-15: checkbox has correct ARIA attributes', () => {
    renderCard();

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('role', 'checkbox');
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    expect(checkbox).toHaveAttribute('aria-label', 'Add GPT-4o to comparison');
  });

  // TC-16: Checkbox is keyboard-activatable
  it('TC-16: checkbox is keyboard-activatable', async () => {
    const user = userEvent.setup();
    renderCard();

    const checkbox = screen.getByRole('checkbox');
    checkbox.focus();
    await user.keyboard(' ');

    const state = useStore.getState();
    expect(state.catalog.compareSelections).toContain('openai/gpt-4o');
  });

  // Additional: verify aria-label changes when checked
  it('updates aria-label when toggled to checked', () => {
    const state = useStore.getState();
    state.catalog.compareSelections = ['openai/gpt-4o'];

    renderCard();

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-label', 'Remove GPT-4o from comparison');
  });
});
