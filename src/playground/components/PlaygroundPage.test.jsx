/**
 * Integration tests for PlaygroundPage.
 *
 * Tests the full flow: select model → type prompt → submit → response display.
 * Also tests multi-model comparison mode and deep-link behavior.
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

function renderPlaygroundPage(initialEntry = '/playground') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/playground" element={<PlaygroundPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PlaygroundPage integration — single model', () => {
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

describe('PlaygroundPage integration — compare mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlaygroundStore.getState().clearAll();
    usePlaygroundStore.setState({ modelsLoaded: false, models: [] });
    api.get.mockResolvedValue({ data: { data: mockModels } });
  });

  it('switches to compare mode when Compare tab is clicked', async () => {
    const user = userEvent.setup();
    renderPlaygroundPage();

    await waitFor(() => expect(api.get).toHaveBeenCalled());

    // Click the Compare tab
    await user.click(screen.getByText('Compare'));

    // Should show multi-model selector
    expect(
      screen.getByPlaceholderText('Search models to add...')
    ).toBeInTheDocument();
    // Should show comparison grid empty state
    expect(
      screen.getByText('Select 2–4 models and send a prompt to compare responses.')
    ).toBeInTheDocument();
  });

  it('adds models, types prompt, submits, and shows comparison results', async () => {
    const user = userEvent.setup();

    // Parallel frontend calls — each model gets its own sendPlaygroundPrompt call
    api.sendPlaygroundPrompt
      .mockResolvedValueOnce({
        text: 'Response from GPT-4o',
        tokens: 100,
        latency: 1500,
        cost: 0.0025,
      })
      .mockResolvedValueOnce({
        text: 'Response from Claude 3',
        tokens: 80,
        latency: 1200,
        cost: 0.0018,
      });

    renderPlaygroundPage();

    await waitFor(() => expect(api.get).toHaveBeenCalled());

    // Switch to compare mode
    await user.click(screen.getByText('Compare'));

    // Add first model
    const input = screen.getByPlaceholderText('Search models to add...');
    await user.click(input);
    await user.click(screen.getByText('GPT-4o'));

    // Add second model
    await user.click(screen.getByPlaceholderText('Search models to add...'));
    await user.click(screen.getByText('Claude 3'));

    // Type prompt
    const textarea = screen.getByLabelText('Prompt input');
    await user.type(textarea, 'Compare test');

    // Click Send
    await user.click(screen.getByLabelText('Send prompt'));

    // Verify parallel calls to the single-model endpoint
    expect(api.sendPlaygroundPrompt).toHaveBeenCalledTimes(2);
    expect(api.sendPlaygroundPrompt).toHaveBeenCalledWith(
      'openai/gpt-4o',
      'Compare test'
    );
    expect(api.sendPlaygroundPrompt).toHaveBeenCalledWith(
      'anthropic/claude-3',
      'Compare test'
    );

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Response from GPT-4o')).toBeInTheDocument();
    });
    expect(screen.getByText('Response from Claude 3')).toBeInTheDocument();

    // Check metadata
    expect(screen.getByText(/100 tokens/)).toBeInTheDocument();
    expect(screen.getByText(/80 tokens/)).toBeInTheDocument();
  });

  it('shows partial failure in compare mode', async () => {
    const user = userEvent.setup();

    // First model succeeds, second fails
    api.sendPlaygroundPrompt
      .mockResolvedValueOnce({
        text: 'Success response',
        tokens: 50,
        latency: 800,
        cost: 0.001,
      })
      .mockRejectedValueOnce({ message: 'Rate limit exceeded' });

    renderPlaygroundPage();

    await waitFor(() => expect(api.get).toHaveBeenCalled());

    // Switch to compare mode
    await user.click(screen.getByText('Compare'));

    // Add models
    await user.click(screen.getByPlaceholderText('Search models to add...'));
    await user.click(screen.getByText('GPT-4o'));
    await user.click(screen.getByPlaceholderText('Search models to add...'));
    await user.click(screen.getByText('Claude 3'));

    // Type prompt and send
    const textarea = screen.getByLabelText('Prompt input');
    await user.type(textarea, 'Test partial fail');
    await user.click(screen.getByLabelText('Send prompt'));

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Success response')).toBeInTheDocument();
    });

    // Check partial failure indicator
    expect(screen.getByText('1 model failed')).toBeInTheDocument();
    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
  });

  it('Send is disabled with fewer than 2 models selected', async () => {
    const user = userEvent.setup();
    renderPlaygroundPage();

    await waitFor(() => expect(api.get).toHaveBeenCalled());

    // Switch to compare mode
    await user.click(screen.getByText('Compare'));

    // Add only 1 model
    await user.click(screen.getByPlaceholderText('Search models to add...'));
    await user.click(screen.getByText('GPT-4o'));

    // Type prompt
    const textarea = screen.getByLabelText('Prompt input');
    await user.type(textarea, 'Test');

    // Send should be disabled
    const sendBtn = screen.getByLabelText('Send prompt');
    expect(sendBtn).toBeDisabled();
  });

  it('switches back to single mode correctly', async () => {
    const user = userEvent.setup();
    renderPlaygroundPage();

    await waitFor(() => expect(api.get).toHaveBeenCalled());

    // Switch to compare mode
    await user.click(screen.getByText('Compare'));
    expect(
      screen.getByPlaceholderText('Search models to add...')
    ).toBeInTheDocument();

    // Switch back
    await user.click(screen.getByText('Single Model'));
    expect(
      screen.getByPlaceholderText('Search models...')
    ).toBeInTheDocument();
  });
});

describe('PlaygroundPage deep link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlaygroundStore.getState().clearAll();
    usePlaygroundStore.setState({ modelsLoaded: false, models: [] });
    api.get.mockResolvedValue({ data: { data: mockModels } });
  });

  it('pre-selects model from ?model= query param after models load', async () => {
    const user = userEvent.setup();
    renderPlaygroundPage('/playground?model=openai/gpt-4o');

    // Wait for the model to be pre-selected — the selector shows the model name
    // as a button (collapsed state) instead of the search input placeholder
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Search models...')).toBeNull();
    }, { timeout: 3000 });

    // Verify the selected model is displayed in the selector
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();

    // Verify the full flow works: type a prompt and send
    api.sendPlaygroundPrompt.mockResolvedValue({
      text: 'Deep link response',
      tokens: 42,
      latency: 200,
      cost: 0.001,
    });

    const textarea = screen.getByLabelText('Prompt input');
    await user.type(textarea, 'Test from deep link');
    await user.click(screen.getByLabelText('Send prompt'));

    expect(api.sendPlaygroundPrompt).toHaveBeenCalledWith(
      'openai/gpt-4o',
      'Test from deep link'
    );

    await waitFor(() => {
      expect(screen.getByText('Deep link response')).toBeInTheDocument();
    });
  });

  it('does not pre-select if model ID is not in the model list', async () => {
    renderPlaygroundPage('/playground?model=nonexistent/model');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/models');
    });

    // Wait for models to be loaded and verify no model was selected
    await waitFor(() => {
      const state = usePlaygroundStore.getState();
      expect(state.modelsLoaded).toBe(true);
      expect(state.selectedModel).toBeNull();
    });

    // The search input placeholder should still be visible (no model selected)
    expect(screen.getByPlaceholderText('Search models...')).toBeInTheDocument();
  });

  it('does not override an existing selection when model param is present', async () => {
    usePlaygroundStore.setState({
      selectedModel: 'anthropic/claude-3',
      modelsLoaded: true,
      models: mockModels,
    });

    renderPlaygroundPage('/playground?model=openai/gpt-4o');

    await waitFor(() => {
      expect(screen.getByText('Claude 3')).toBeInTheDocument();
    });

    expect(usePlaygroundStore.getState().selectedModel).toBe('anthropic/claude-3');
  });
});
