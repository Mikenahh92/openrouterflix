import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SavePresetDialog from './SavePresetDialog.jsx';

// ── Mock Modal ──────────────────────────────────────────────────────
vi.mock('../../shared/components/Modal.jsx', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, title, children, footer }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div data-testid="modal-title">{title}</div>
        <div data-testid="modal-body">{children}</div>
        <div data-testid="modal-footer">{footer}</div>
      </div>
    );
  },
}));

// ── Render helper ───────────────────────────────────────────────────
function renderDialog(props = {}) {
  const {
    isOpen = true,
    onClose = vi.fn(),
    onSave = vi.fn(),
    existingNames = [],
  } = props;

  return render(
    <SavePresetDialog
      isOpen={isOpen}
      onClose={onClose}
      onSave={onSave}
      existingNames={existingNames}
    />
  );
}

// ── Tests ───────────────────────────────────────────────────────────

describe('SavePresetDialog', () => {
  it('TC-UI-03: renders modal with preset name input', () => {
    renderDialog();
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Save Preset')).toBeInTheDocument();
    expect(screen.getByTestId('preset-name-input')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.?g\.?, GPT-4o/i)).toBeInTheDocument();
  });

  it('TC-UI-03: Save button is disabled when input is empty', () => {
    renderDialog();
    const saveBtn = screen.getByText('Save');
    expect(saveBtn).toBeDisabled();
  });

  it('TC-UI-03: Save button enables with valid name', async () => {
    const user = userEvent.setup();
    renderDialog();

    const input = screen.getByTestId('preset-name-input');
    await user.type(input, 'My Preset');

    const saveBtn = screen.getByText('Save');
    expect(saveBtn).not.toBeDisabled();
  });

  it('TC-UI-03: calls onSave with trimmed name when Save clicked', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onSave });

    await user.type(screen.getByTestId('preset-name-input'), '  Test Preset  ');
    await user.click(screen.getByText('Save'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('Test Preset');
  });

  it('TC-UI-03: calls onSave on Enter key', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onSave });

    await user.type(screen.getByTestId('preset-name-input'), 'Quick Save{Enter}');

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('Quick Save');
  });

  it('TC-UI-04: shows duplicate name error', async () => {
    const user = userEvent.setup();
    renderDialog({ existingNames: ['Existing Preset'] });

    await user.type(screen.getByTestId('preset-name-input'), 'Existing Preset');

    expect(screen.getByText('A preset with this name already exists.')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeDisabled();
  });

  it('TC-UI-04: duplicate check is case-insensitive', async () => {
    const user = userEvent.setup();
    renderDialog({ existingNames: ['My Preset'] });

    await user.type(screen.getByTestId('preset-name-input'), 'my preset');

    expect(screen.getByText('A preset with this name already exists.')).toBeInTheDocument();
  });

  it('TC-UI-04: shows name too long error', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByTestId('preset-name-input'), 'a'.repeat(51));

    expect(screen.getByText('Name too long (max 50 characters).')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeDisabled();
  });

  it('does not render when isOpen is false', () => {
    renderDialog({ isOpen: false });
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('renders Cancel button', () => {
    renderDialog();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows (1-50 characters) hint', () => {
    renderDialog();
    expect(screen.getByText('(1–50 characters)')).toBeInTheDocument();
  });

  it('accepts name at exactly 50 characters', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup({ delay: null });
    renderDialog({ onSave });

    await user.type(screen.getByTestId('preset-name-input'), 'a'.repeat(50));
    expect(screen.getByText('Save')).not.toBeDisabled();
  });
});
