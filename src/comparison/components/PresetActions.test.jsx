import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Mock exportUtils ──────────────────────────────────────────────
vi.mock('../../shared/lib/exportUtils', () => ({
  exportPresetJSON: vi.fn(() => '{"type":"orf-preset","version":1,"ids":["a","b"]}'),
  downloadFile: vi.fn(),
  encodePresetToBase64: vi.fn(() => 'eyJpZHMiOlsiYSIsImIiXX0='),
  isPresetTooLarge: vi.fn(() => false),
}));

import PresetActions from './PresetActions';
import { exportPresetJSON, downloadFile, encodePresetToBase64, isPresetTooLarge } from '../../shared/lib/exportUtils';

// ── Tests ─────────────────────────────────────────────────────────

describe('PresetActions', () => {
  let clipboardSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default mock implementations
    exportPresetJSON.mockReturnValue('{"type":"orf-preset","version":1,"ids":["a","b"]}');
    downloadFile.mockImplementation(() => {});
    encodePresetToBase64.mockReturnValue('eyJpZHMiOlsiYSIsImIiXX0=');
    isPresetTooLarge.mockReturnValue(false);

    // Spy on navigator.clipboard.writeText
    if (navigator.clipboard && navigator.clipboard.writeText) {
      clipboardSpy = vi.spyOn(navigator.clipboard, 'writeText');
    } else {
      // If clipboard doesn't exist, define it
      clipboardSpy = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: clipboardSpy },
        configurable: true,
        writable: true,
      });
    }
  });

  afterEach(() => {
    if (clipboardSpy) {
      clipboardSpy.mockRestore();
    }
  });

  // TC-C07: Export preset JSON triggers download
  it('TC-C07: export preset JSON triggers download', async () => {
    const user = userEvent.setup();
    const ids = ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'];
    render(<PresetActions ids={ids} prompt="test prompt" />);

    const exportBtn = screen.getByTitle(/export.*json/i);
    expect(exportBtn).toBeInTheDocument();
    expect(exportBtn).toBeEnabled();

    await user.click(exportBtn);

    expect(exportPresetJSON).toHaveBeenCalledWith({ ids, prompt: 'test prompt' });
    expect(downloadFile).toHaveBeenCalled();
    const [content, filename, mimeType] = downloadFile.mock.calls[0];
    expect(mimeType).toBe('application/json');
    expect(filename).toMatch(/orf-preset-\d{4}-\d{2}-\d{2}\.json$/);
  });

  // TC-C08: Share via URL copies to clipboard
  it('TC-C08: share copies URL to clipboard and shows success', async () => {
    clipboardSpy.mockResolvedValue(undefined);

    const user = userEvent.setup();
    const ids = ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'];
    render(<PresetActions ids={ids} prompt="test prompt" />);

    const shareBtn = screen.getByTitle(/share/i);
    expect(shareBtn).toBeInTheDocument();
    expect(shareBtn).toBeEnabled();

    await user.click(shareBtn);

    expect(encodePresetToBase64).toHaveBeenCalledWith({ ids, prompt: 'test prompt' });
    expect(isPresetTooLarge).toHaveBeenCalledWith('eyJpZHMiOlsiYSIsImIiXX0=');
    expect(clipboardSpy).toHaveBeenCalled();

    // Should show success feedback
    await waitFor(() => {
      expect(screen.getByText(/url copied to clipboard/i)).toBeInTheDocument();
    });
  });

  // TC-C09: Share disabled for large payloads
  it('TC-C09: share shows error for large payloads', async () => {
    isPresetTooLarge.mockReturnValue(true);

    const user = userEvent.setup();
    const ids = ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'];
    render(<PresetActions ids={ids} />);

    const shareBtn = screen.getByTitle(/share/i);
    await user.click(shareBtn);

    expect(encodePresetToBase64).toHaveBeenCalled();
    expect(isPresetTooLarge).toHaveBeenCalled();

    // Should show error feedback about payload size
    await waitFor(() => {
      expect(screen.getByText(/too large for url sharing/i)).toBeInTheDocument();
    });
  });

  // Buttons disabled when no IDs
  it('buttons are disabled when no IDs provided', () => {
    render(<PresetActions ids={[]} />);

    const exportBtn = screen.getByTitle(/export.*json/i);
    const shareBtn = screen.getByTitle(/share/i);
    expect(exportBtn).toBeDisabled();
    expect(shareBtn).toBeDisabled();
  });

  // Share fallback when clipboard API fails
  it('share shows URL as fallback when clipboard API fails', async () => {
    clipboardSpy.mockRejectedValue(new Error('Clipboard denied'));

    const user = userEvent.setup();
    const ids = ['openai/gpt-4o'];
    render(<PresetActions ids={ids} />);

    await user.click(screen.getByTitle(/share/i));

    // Should show URL as feedback instead of "copied"
    await waitFor(() => {
      const status = screen.getByRole('status');
      expect(status).toHaveTextContent(/compare\?config=/i);
    });
  });

  // Renders both buttons
  it('renders Export Preset and Share buttons', () => {
    render(<PresetActions ids={['a', 'b']} />);

    expect(screen.getByText('Export Preset')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
  });
});
