import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PresetDropdown from './PresetDropdown.jsx';

// ── Mock presets store ──────────────────────────────────────────────
const ALL_DIMS = [
  'provider', 'pricing.prompt', 'pricing.completion', 'latency',
  'contextWindow', 'qualityScore', 'maxOutput', 'modalities', 'categories',
];

const storeRef = {
  current: {
    presets: [],
    visibleDimensions: [...ALL_DIMS],
    addPreset: vi.fn(),
    deletePreset: vi.fn(),
  },
};

vi.mock('../store.js', () => ({
  useComparisonPresetsStore: (selector) => selector(storeRef.current),
}));

// ── Render helper ───────────────────────────────────────────────────
function renderDropdown(props = {}) {
  const {
    currentModelIds = ['a', 'b'],
    onLoadPreset = vi.fn(),
  } = props;

  return render(
    <PresetDropdown
      currentModelIds={currentModelIds}
      onLoadPreset={onLoadPreset}
    />
  );
}

// ── Tests ───────────────────────────────────────────────────────────

describe('PresetDropdown', () => {
  beforeEach(() => {
    storeRef.current = {
      presets: [],
      visibleDimensions: [...ALL_DIMS],
      addPreset: vi.fn().mockReturnValue(null),
      deletePreset: vi.fn(),
    };
  });

  it('TC-UI-09: shows "No saved presets" when empty', () => {
    renderDropdown();
    expect(screen.getByText('No saved presets')).toBeInTheDocument();
  });

  it('TC-UI-05: renders saved presets in select dropdown', () => {
    storeRef.current.presets = [
      { id: 'preset-1', name: 'Preset A', modelIds: ['a', 'b'] },
      { id: 'preset-2', name: 'Preset B', modelIds: ['c', 'd'] },
      { id: 'preset-3', name: 'Preset C', modelIds: ['e', 'f'] },
    ];

    renderDropdown();
    expect(screen.getByTestId('preset-select')).toBeInTheDocument();
    expect(screen.getByText('Preset A')).toBeInTheDocument();
    expect(screen.getByText('Preset B')).toBeInTheDocument();
    expect(screen.getByText('Preset C')).toBeInTheDocument();
  });

  it('TC-UI-01: Save Current button is enabled with 2+ models', () => {
    renderDropdown({ currentModelIds: ['a', 'b'] });
    expect(screen.getByTestId('save-current-btn')).not.toBeDisabled();
  });

  it('TC-UI-02: Save Current button is disabled with < 2 models', () => {
    renderDropdown({ currentModelIds: ['a'] });
    expect(screen.getByTestId('save-current-btn')).toBeDisabled();
  });

  it('TC-UI-11: Save Current button is disabled at max presets', () => {
    storeRef.current.presets = Array.from({ length: 50 }, (_, i) => ({
      id: `preset-${i}`,
      name: `Preset ${i}`,
      modelIds: [`a${i}`, `b${i}`],
    }));

    renderDropdown();
    expect(screen.getByTestId('save-current-btn')).toBeDisabled();
    expect(screen.getByText(/Maximum 50 presets reached/)).toBeInTheDocument();
  });

  it('TC-UI-10: delete icon appears when a preset matches current IDs', () => {
    storeRef.current.presets = [
      { id: 'preset-1', name: 'Match', modelIds: ['a', 'b'] },
      { id: 'preset-2', name: 'No Match', modelIds: ['c', 'd'] },
    ];

    renderDropdown({ currentModelIds: ['a', 'b'] });
    expect(screen.getByTestId('delete-preset-btn')).toBeInTheDocument();
  });

  it('TC-UI-10: delete confirmation appears and calls deletePreset', async () => {
    const user = userEvent.setup();
    storeRef.current.presets = [
      { id: 'preset-1', name: 'Match', modelIds: ['a', 'b'] },
    ];

    renderDropdown({ currentModelIds: ['a', 'b'] });

    await user.click(screen.getByTestId('delete-preset-btn'));
    expect(screen.getByTestId('delete-confirm')).toBeInTheDocument();
    expect(screen.getByText('Delete this preset?')).toBeInTheDocument();

    await user.click(screen.getByTestId('delete-confirm-btn'));
    expect(storeRef.current.deletePreset).toHaveBeenCalledWith('preset-1');
  });

  it('delete confirmation can be cancelled', async () => {
    const user = userEvent.setup();
    storeRef.current.presets = [
      { id: 'preset-1', name: 'Match', modelIds: ['a', 'b'] },
    ];

    renderDropdown({ currentModelIds: ['a', 'b'] });

    await user.click(screen.getByTestId('delete-preset-btn'));
    expect(screen.getByTestId('delete-confirm')).toBeInTheDocument();

    await user.click(screen.getByTestId('delete-cancel-btn'));
    expect(screen.queryByTestId('delete-confirm')).not.toBeInTheDocument();
    expect(storeRef.current.deletePreset).not.toHaveBeenCalled();
  });

  it('TC-UI-06: selecting a preset calls onLoadPreset with model IDs', async () => {
    const onLoadPreset = vi.fn();
    const user = userEvent.setup();

    storeRef.current.presets = [
      { id: 'preset-1', name: 'Test Preset', modelIds: ['x', 'y', 'z'] },
    ];

    renderDropdown({ currentModelIds: ['a', 'b'], onLoadPreset });

    await user.selectOptions(screen.getByTestId('preset-select'), 'preset-1');
    expect(onLoadPreset).toHaveBeenCalledWith(['x', 'y', 'z']);
  });

  it('renders the PresetDropdown container', () => {
    renderDropdown();
    expect(screen.getByTestId('preset-dropdown')).toBeInTheDocument();
  });

  it('Save Current button has correct aria-label', () => {
    renderDropdown();
    expect(screen.getByTestId('save-current-btn')).toHaveAttribute(
      'aria-label',
      'Save current comparison as a preset'
    );
  });
});
