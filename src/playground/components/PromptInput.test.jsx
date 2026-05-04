/**
 * Component tests for PromptInput.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PromptInput from './PromptInput';

describe('PromptInput', () => {
  const defaultProps = {
    prompt: '',
    onPromptChange: vi.fn(),
    onSend: vi.fn(),
    onClear: vi.fn(),
    isLoading: false,
    isDisabled: false,
  };

  it('renders textarea and buttons', () => {
    render(<PromptInput {...defaultProps} />);
    expect(screen.getByLabelText('Prompt input')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('shows "Prompt" label', () => {
    render(<PromptInput {...defaultProps} />);
    expect(screen.getByText('Prompt')).toBeInTheDocument();
  });

  it('calls onPromptChange when typing', async () => {
    const onPromptChange = vi.fn();
    const user = userEvent.setup();
    render(<PromptInput {...defaultProps} onPromptChange={onPromptChange} />);

    const textarea = screen.getByLabelText('Prompt input');
    await user.type(textarea, 'H');

    expect(onPromptChange).toHaveBeenCalledWith('H');
  });

  it('displays character count', () => {
    render(<PromptInput {...defaultProps} prompt="Hello world" />);
    expect(screen.getByText('11 chars')).toBeInTheDocument();
  });

  it('disables Send button when prompt is empty', () => {
    render(<PromptInput {...defaultProps} prompt="" />);
    const sendBtn = screen.getByLabelText('Send prompt');
    expect(sendBtn).toBeDisabled();
  });

  it('disables Send button when prompt is whitespace only', () => {
    render(<PromptInput {...defaultProps} prompt="   " />);
    const sendBtn = screen.getByLabelText('Send prompt');
    expect(sendBtn).toBeDisabled();
  });

  it('disables Send button when isLoading is true', () => {
    render(<PromptInput {...defaultProps} prompt="test" isLoading={true} />);
    const sendBtn = screen.getByLabelText('Send prompt');
    expect(sendBtn).toBeDisabled();
  });

  it('disables Send button when isDisabled is true', () => {
    render(<PromptInput {...defaultProps} prompt="test" isDisabled={true} />);
    const sendBtn = screen.getByLabelText('Send prompt');
    expect(sendBtn).toBeDisabled();
  });

  it('enables Send button when prompt is non-empty and not loading', () => {
    render(<PromptInput {...defaultProps} prompt="test" />);
    const sendBtn = screen.getByLabelText('Send prompt');
    expect(sendBtn).not.toBeDisabled();
  });

  it('calls onSend on Ctrl+Enter', () => {
    const onSend = vi.fn();
    render(<PromptInput {...defaultProps} prompt="test" onSend={onSend} />);

    const textarea = screen.getByLabelText('Prompt input');
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('does not call onSend on Ctrl+Enter when prompt is empty', () => {
    const onSend = vi.fn();
    render(<PromptInput {...defaultProps} prompt="" onSend={onSend} />);

    const textarea = screen.getByLabelText('Prompt input');
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it('calls onClear when Clear button is clicked', async () => {
    const onClear = vi.fn();
    const onPromptChange = vi.fn();
    const user = userEvent.setup();
    render(
      <PromptInput
        {...defaultProps}
        prompt="some text"
        onClear={onClear}
        onPromptChange={onPromptChange}
      />
    );

    await user.click(screen.getByLabelText('Clear prompt and response'));
    expect(onPromptChange).toHaveBeenCalledWith('');
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('shows Ctrl+Enter hint', () => {
    render(<PromptInput {...defaultProps} />);
    expect(screen.getByText('Ctrl+Enter to send')).toBeInTheDocument();
  });
});
