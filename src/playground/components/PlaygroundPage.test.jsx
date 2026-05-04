/**
 * Integration tests for PlaygroundPage.
 *
 * Tests the full flow: select model → type prompt → submit → response display.
 * Uses mocked API to avoid backend dependency.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import PlaygroundPage from './PlaygroundPage';

// Mock the api module
vi.mock('../../shared/lib/api', () => ({
  api: {
    get: vi.fn(),
    sendPlaygroundPrompt: vi.fn(),
  },
}));

import { api } from '../../shared/lib/api';

// Import store to reset between tests
import usePlaygroundStore from '../store';

const mockModels = [
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'anthropic/claude-3', name: 'Claude 3', provider: 'Anthropic' },
  { id: 'google/gemini-pro', name: 'Gemini Pro', provider: 'Google' },
];

function renderPlaygroundPage() {
  return render(
    <MemoryRouter initialEntries={['/playground']}>
      <Routes>
        <Route path="/playground" element={<PlaygroundPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PlaygroundPage integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlaygroundStore.getState().clearAll();
    // Reset modelsLoaded so it fetches fresh
    usePlaygroundStore.setState({ modelsLoaded: false, models: [] });

    // Default: models fetch succeeds
    api.get.mockResolvedValue({ data: { data: mockModels } });
  });

  it('renders the playground page with all sections', async () => {
    renderPlaygroundPage();

    await waitFor(() => {
      expect(screen.getByText('Playground')).toBeInTheDocument();
    });

    expect(screen.getByText('Model')).toBeInTheDocument();
    expect(screen.getByText('Prompt')).toBeInTheDocument();
    expect(screen.getByText('Response')).toBeInTheDocument();
  });

  it('select model → type prompt → submit → shows success response', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      text: 'This is the AI response.',
      tokens: 100,
      latency: 1500,
      cost: 0.0025,
    };
    api.sendPlaygroundPrompt.mockResolvedValue(mockResponse);

    renderPlaygroundPage();

    // Wait for models to load
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/models');
    });

    // Select model
    await user.click(screen.getByPlaceholderText('Search models...'));
    await user.click(screen.getByText('GPT-4o'));

    // Type prompt
    const textarea = screen.getByLabelText('Prompt input');
    await user.type(textarea, 'Hello world');

    // Click Send
    await user.click(screen.getByLabelText('Send prompt'));

    // Verify loading state appeared (API called)
    expect(api.sendPlaygroundPrompt).toHaveBeenCalledWith(
      'openai/gpt-4o',
      'Hello world'
    );

    // Wait for response to render
    await waitFor(() => {
      expect(screen.getByText('This is the AI response.')).toBeInTheDocument();
    });

    // Verify metadata badges (use regex for locale-safe token matching)
    expect(screen.getByText(/100 tokens/)).toBeInTheDocument();
    expect(screen.getByText('1.5s')).toBeInTheDocument();
    expect(screen.getByText('$0.0025')).toBeInTheDocument();
  });

  it('submit → error → retry → success', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      text: 'Success after retry',
      tokens: 50,
      latency: 800,
      cost: 0.001,
    };

    // First call fails, second succeeds
    api.sendPlaygroundPrompt
      .mockRejectedValueOnce({ status: 429, message: 'Rate limit exceeded' })
      .mockResolvedValueOnce(mockResponse);

    renderPlaygroundPage();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    // Select model and type prompt
    await user.click(screen.getByPlaceholderText('Search models...'));
    await user.click(screen.getByText('GPT-4o'));
    await user.type(screen.getByLabelText('Prompt input'), 'Test');

    // Send
    await user.click(screen.getByLabelText('Send prompt'));

    // Wait for error to show
    await waitFor(() => {
      expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
    });

    // Click Retry
    await user.click(screen.getByText('Retry'));

    // Wait for success
    await waitFor(() => {
      expect(screen.getByText('Success after retry')).toBeInTheDocument();
    });
  });

  it('clear resets prompt and response', async () => {
    const user = userEvent.setup();
    api.sendPlaygroundPrompt.mockResolvedValue({
      text: 'Response text from AI',
      tokens: 10,
      latency: 100,
      cost: 0,
    });

    renderPlaygroundPage();

    await waitFor(() => expect(api.get).toHaveBeenCalled());

    // Select model and type prompt
    await user.click(screen.getByPlaceholderText('Search models...'));
    await user.click(screen.getByText('GPT-4o'));
    await user.type(screen.getByLabelText('Prompt input'), 'Test');

    // Send
    await user.click(screen.getByLabelText('Send prompt'));

    await waitFor(() => {
      expect(screen.getByText('Response text from AI')).toBeInTheDocument();
    });

    // Click Clear
    await user.click(screen.getByLabelText('Clear prompt and response'));

    // Prompt should be empty
    expect(screen.getByLabelText('Prompt input')).toHaveValue('');

    // Response panel should show empty state
    expect(
      screen.getByText('Enter a prompt and click Send to test a model.')
    ).toBeInTheDocument();

    // Model selection should be preserved
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
  });

  it('Send button is disabled when no model is selected', async () => {
    renderPlaygroundPage();

    await waitFor(() => expect(api.get).toHaveBeenCalled());

    const sendBtn = screen.getByLabelText('Send prompt');
    expect(sendBtn).toBeDisabled();
  });
});
