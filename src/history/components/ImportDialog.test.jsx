import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportDialog from './ImportDialog';

// ── Mock exportUtils ──────────────────────────────────────────────
vi.mock('../../shared/lib/exportUtils', () => ({
  validateImport: vi.fn(),
}));

import { validateImport } from '../../shared/lib/exportUtils';

// ── Fixture ───────────────────────────────────────────────────────

const validHistoryJSON = JSON.stringify({
  type: 'orf-history',
  version: 1,
  records: [
    { id: 'r1', type: 'single', modelId: 'openai/gpt-4o', createdAt: '2026-01-01' },
    { id: 'r2', type: 'compare', models: ['a', 'b'], results: [], createdAt: '2026-01-02' },
  ],
});

// ── Tests ─────────────────────────────────────────────────────────

describe('ImportDialog', () => {
  const onClose = vi.fn();
  const onImport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TC-C05: File upload validates and shows success for valid file
  it('TC-C05: file upload validates and shows success for valid history file', async () => {
    validateImport.mockReturnValue({
      valid: true,
      type: 'orf-history',
      records: [
        { id: 'r1', type: 'single', modelId: 'openai/gpt-4o', createdAt: '2026-01-01' },
      ],
    });

    const user = userEvent.setup();
    render(<ImportDialog open={true} onClose={onClose} onImport={onImport} />);

    // Dialog should be visible
    expect(screen.getByRole('dialog', { name: /import history/i })).toBeInTheDocument();

    // Create a valid JSON file
    const file = new File([validHistoryJSON], 'history.json', { type: 'application/json' });
    const fileInput = screen.getByTestId('import-file-input');

    await user.upload(fileInput, file);

    // Should show success indicator
    await waitFor(() => {
      expect(screen.getByTestId('import-success')).toBeInTheDocument();
    });
    expect(screen.getByTestId('import-success')).toHaveTextContent(/1 valid record/i);
  });

  // TC-C06: Rejects invalid file with error
  it('TC-C06: rejects invalid file with error message', async () => {
    validateImport.mockReturnValue({
      valid: false,
      error: 'Missing or invalid "type" field.',
    });

    const user = userEvent.setup();
    render(<ImportDialog open={true} onClose={onClose} onImport={onImport} />);

    // Create an invalid JSON file (wrong structure)
    const invalidJSON = JSON.stringify({ foo: 'bar' });
    const file = new File([invalidJSON], 'bad.json', { type: 'application/json' });
    const fileInput = screen.getByTestId('import-file-input');

    await user.upload(fileInput, file);

    // Should show error
    await waitFor(() => {
      expect(screen.getByTestId('import-error')).toBeInTheDocument();
    });
    expect(screen.getByTestId('import-error')).toHaveTextContent(/missing or invalid/i);
  });

  // Not rendered when open=false
  it('does not render when open is false', () => {
    render(<ImportDialog open={false} onClose={onClose} onImport={onImport} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // Cancel button calls onClose
  it('Cancel button calls onClose', async () => {
    const user = userEvent.setup();
    render(<ImportDialog open={true} onClose={onClose} onImport={onImport} />);

    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Close button (X) calls onClose
  it('close X button calls onClose', async () => {
    const user = userEvent.setup();
    render(<ImportDialog open={true} onClose={onClose} onImport={onImport} />);

    await user.click(screen.getByLabelText('Close dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Confirm button calls onImport with valid records
  it('Confirm calls onImport with valid records', async () => {
    const records = [
      { id: 'r1', type: 'single', modelId: 'openai/gpt-4o', createdAt: '2026-01-01' },
    ];
    validateImport.mockReturnValue({
      valid: true,
      type: 'orf-history',
      records,
    });

    const user = userEvent.setup();
    render(<ImportDialog open={true} onClose={onClose} onImport={onImport} />);

    const file = new File([validHistoryJSON], 'history.json', { type: 'application/json' });
    await user.upload(screen.getByTestId('import-file-input'), file);

    // Wait for validation to complete
    await waitFor(() => {
      expect(screen.getByTestId('import-success')).toBeInTheDocument();
    });

    // Confirm button should now be enabled
    const confirmBtn = screen.getByRole('button', { name: /^import$/i });
    expect(confirmBtn).toBeEnabled();

    await user.click(confirmBtn);

    expect(onImport).toHaveBeenCalledWith(records);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Paste area validates JSON
  it('paste area validates JSON text', async () => {
    validateImport.mockReturnValue({
      valid: false,
      error: 'Unknown type: "foo".',
    });

    render(<ImportDialog open={true} onClose={onClose} onImport={onImport} />);

    const textarea = screen.getByTestId('import-paste-area');
    // Use fireEvent.change to avoid userEvent keyboard parsing issues with { } characters
    fireEvent.change(textarea, { target: { value: '{"type":"foo","version":1}' } });

    await waitFor(() => {
      expect(screen.getByTestId('import-error')).toBeInTheDocument();
    });
  });

  // Invalid JSON syntax shows parse error
  it('shows parse error for malformed JSON in paste area', async () => {
    render(<ImportDialog open={true} onClose={onClose} onImport={onImport} />);

    const textarea = screen.getByTestId('import-paste-area');
    // Use fireEvent.change to avoid userEvent keyboard parsing issues with { } characters
    fireEvent.change(textarea, { target: { value: 'not valid json{' } });

    await waitFor(() => {
      expect(screen.getByTestId('import-error')).toBeInTheDocument();
    });
    expect(screen.getByTestId('import-error')).toHaveTextContent(/invalid json/i);
  });
});
