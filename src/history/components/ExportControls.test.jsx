import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportControls from './ExportControls';

// ── Mock exportUtils ──────────────────────────────────────────────
vi.mock('../../shared/lib/exportUtils', () => ({
  recordsToCSV: vi.fn(() => 'id,type,modelId\n1,test,m1'),
  downloadFile: vi.fn(),
  exportHistoryJSON: vi.fn(() => '{"type":"orf-history"}'),
}));

import { recordsToCSV, downloadFile, exportHistoryJSON } from '../../shared/lib/exportUtils';

// ── Fixture ───────────────────────────────────────────────────────

const mockRecords = [
  { id: '1', type: 'single', modelId: 'openai/gpt-4o', modelName: 'GPT-4o', prompt: 'Hello' },
  { id: '2', type: 'compare', modelId: 'anthropic/claude-3.5-sonnet', modelName: 'Claude', prompt: 'Hi' },
];

// ── Tests ─────────────────────────────────────────────────────────

describe('ExportControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TC-C01: Renders CSV and JSON buttons
  it('TC-C01: renders CSV and JSON export buttons', () => {
    render(<ExportControls records={mockRecords} />);

    expect(screen.getByTitle(/export.*csv/i)).toBeInTheDocument();
    expect(screen.getByTitle(/export.*json/i)).toBeInTheDocument();
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
    expect(screen.getByText('Export JSON')).toBeInTheDocument();
  });

  // TC-C02: CSV triggers download
  it('TC-C02: CSV button triggers download with CSV content', async () => {
    const user = userEvent.setup();
    render(<ExportControls records={mockRecords} />);

    await user.click(screen.getByTitle(/export.*csv/i));

    expect(recordsToCSV).toHaveBeenCalledWith(mockRecords);
    expect(downloadFile).toHaveBeenCalled();
    const [content, filename, mimeType] = downloadFile.mock.calls[0];
    expect(mimeType).toBe('text/csv');
    expect(filename).toMatch(/orf-history-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  // TC-C03: JSON triggers download
  it('TC-C03: JSON button triggers download with JSON content', async () => {
    const user = userEvent.setup();
    render(<ExportControls records={mockRecords} />);

    await user.click(screen.getByTitle(/export.*json/i));

    expect(exportHistoryJSON).toHaveBeenCalledWith(mockRecords);
    expect(downloadFile).toHaveBeenCalled();
    const [content, filename, mimeType] = downloadFile.mock.calls[0];
    expect(mimeType).toBe('application/json');
    expect(filename).toMatch(/orf-history-\d{4}-\d{2}-\d{2}\.json$/);
  });

  // TC-C04: Disabled when no records
  it('TC-C04: buttons disabled when no records', () => {
    render(<ExportControls records={[]} disabled={true} />);

    const csvBtn = screen.getByTitle(/export.*csv/i);
    const jsonBtn = screen.getByTitle(/export.*json/i);
    expect(csvBtn).toBeDisabled();
    expect(jsonBtn).toBeDisabled();
  });

  // Import button rendered when onImportClick provided
  it('renders Import button when onImportClick prop is provided', () => {
    const onImportClick = vi.fn();
    render(<ExportControls records={mockRecords} onImportClick={onImportClick} />);

    expect(screen.getByTitle(/import history/i)).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
  });

  // Import button NOT rendered when onImportClick not provided
  it('does not render Import button when onImportClick is not provided', () => {
    render(<ExportControls records={mockRecords} />);

    expect(screen.queryByText('Import')).not.toBeInTheDocument();
  });

  // Import button calls onImportClick
  it('Import button calls onImportClick on click', async () => {
    const user = userEvent.setup();
    const onImportClick = vi.fn();
    render(<ExportControls records={mockRecords} onImportClick={onImportClick} />);

    await user.click(screen.getByTitle(/import history/i));
    expect(onImportClick).toHaveBeenCalledTimes(1);
  });
});
