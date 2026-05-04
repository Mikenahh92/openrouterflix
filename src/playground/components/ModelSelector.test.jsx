/**
 * Component tests for ModelSelector.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModelSelector from './ModelSelector';

const models = [
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'anthropic/claude-3', name: 'Claude 3', provider: 'Anthropic' },
  { id: 'google/gemini-pro', name: 'Gemini Pro', provider: 'Google' },
  { id: 'meta/llama-3', name: 'Llama 3', provider: 'Meta' },
  { id: 'mistral/mistral-large', name: 'Mistral Large', provider: 'Mistral' },
];

describe('ModelSelector', () => {
  it('renders with combobox attributes', () => {
    render(
      <ModelSelector
        models={models}
        selectedModel={null}
        onModelSelect={vi.fn()}
        isLoading={false}
      />
    );
    const combobox = screen.getByRole('combobox');
    expect(combobox).toBeInTheDocument();
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    expect(combobox).toHaveAttribute('aria-autocomplete', 'list');
  });

  it('shows model label', () => {
    render(
      <ModelSelector
        models={models}
        selectedModel={null}
        onModelSelect={vi.fn()}
        isLoading={false}
      />
    );
    expect(screen.getByText('Model')).toBeInTheDocument();
  });

  it('opens dropdown and shows all models on click', async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector
        models={models}
        selectedModel={null}
        onModelSelect={vi.fn()}
        isLoading={false}
      />
    );

    const input = screen.getByPlaceholderText('Search models...');
    await user.click(input);

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();

    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(5);
    expect(options[0]).toHaveTextContent('GPT-4o');
  });

  it('shows provider badges for each model', async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector
        models={models}
        selectedModel={null}
        onModelSelect={vi.fn()}
        isLoading={false}
      />
    );

    await user.click(screen.getByPlaceholderText('Search models...'));

    expect(screen.getAllByText('OpenAI').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Anthropic').length).toBeGreaterThanOrEqual(1);
  });

  it('filters models by search text', async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector
        models={models}
        selectedModel={null}
        onModelSelect={vi.fn()}
        isLoading={false}
      />
    );

    const input = screen.getByPlaceholderText('Search models...');
    await user.click(input);
    await user.type(input, 'claude');

    const listbox = screen.getByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Claude 3');
  });

  it('calls onModelSelect when clicking a model', async () => {
    const onModelSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <ModelSelector
        models={models}
        selectedModel={null}
        onModelSelect={onModelSelect}
        isLoading={false}
      />
    );

    await user.click(screen.getByPlaceholderText('Search models...'));
    await user.click(screen.getByText('GPT-4o'));

    expect(onModelSelect).toHaveBeenCalledWith('openai/gpt-4o');
  });

  it('shows selected model name when a model is selected', () => {
    render(
      <ModelSelector
        models={models}
        selectedModel="openai/gpt-4o"
        onModelSelect={vi.fn()}
        isLoading={false}
      />
    );
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
  });

  it('shows "No models found" when search yields no results', async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector
        models={models}
        selectedModel={null}
        onModelSelect={vi.fn()}
        isLoading={false}
      />
    );

    const input = screen.getByPlaceholderText('Search models...');
    await user.click(input);
    await user.type(input, 'xyznonexistent');

    expect(screen.getByText('No models found')).toBeInTheDocument();
  });

  it('shows "Loading models..." when isLoading is true', async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector
        models={[]}
        selectedModel={null}
        onModelSelect={vi.fn()}
        isLoading={true}
      />
    );

    await user.click(screen.getByPlaceholderText('Search models...'));
    expect(screen.getByText('Loading models...')).toBeInTheDocument();
  });

  it('selects model with Enter key after navigating with ArrowDown', async () => {
    const onModelSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <ModelSelector
        models={models}
        selectedModel={null}
        onModelSelect={onModelSelect}
        isLoading={false}
      />
    );

    const input = screen.getByPlaceholderText('Search models...');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onModelSelect).toHaveBeenCalledWith(models[1].id);
  });

  it('closes dropdown on Escape key', async () => {
    render(
      <ModelSelector
        models={models}
        selectedModel={null}
        onModelSelect={vi.fn()}
        isLoading={false}
      />
    );

    const input = screen.getByPlaceholderText('Search models...');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    // Dropdown should be open
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });

    // Dropdown should be closed
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
