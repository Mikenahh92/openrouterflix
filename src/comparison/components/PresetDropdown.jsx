/**
 * PresetDropdown — Preset selector dropdown with "Save Current" button and delete action.
 *
 * Placed in the ComparisonPage header area. Uses native <select> element for preset list.
 * Selecting a preset triggers onLoadPreset(modelIds) which updates URL params.
 *
 * Props:
 *   currentModelIds — string[] of currently compared model IDs
 *   onLoadPreset    — (modelIds: string[]) => void — called when a preset is selected
 */
import { useState, useCallback } from 'react';
import { BookmarkPlus, Trash2 } from 'lucide-react';
import { useComparisonPresetsStore } from '../store.js';
import SavePresetDialog from './SavePresetDialog.jsx';

export default function PresetDropdown({ currentModelIds = [], onLoadPreset }) {
  const presets = useComparisonPresetsStore((s) => s.presets);
  const addPreset = useComparisonPresetsStore((s) => s.addPreset);
  const deletePreset = useComparisonPresetsStore((s) => s.deletePreset);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const existingNames = presets.map((p) => p.name);
  const isAtMax = presets.length >= 50;
  const hasEnoughModels = currentModelIds.length >= 2;

  // Find if current model IDs match a saved preset (for auto-selection)
  const currentIdsKey = [...currentModelIds].sort().join(',');
  const matchedPresetId = presets.find(
    (p) => [...p.modelIds].sort().join(',') === currentIdsKey
  )?.id;

  const handleSelectChange = useCallback(
    (e) => {
      const presetId = e.target.value;
      if (!presetId) return;

      const preset = presets.find((p) => p.id === presetId);
      if (preset) {
        onLoadPreset(preset.modelIds);
      }
    },
    [presets, onLoadPreset]
  );

  const handleSave = useCallback(
    (name) => {
      const preset = addPreset(name, currentModelIds);
      if (preset) {
        setDialogOpen(false);
        onLoadPreset(preset.modelIds);
      }
    },
    [addPreset, currentModelIds, onLoadPreset]
  );

  const handleDeleteClick = useCallback(() => {
    if (deleteConfirmId) {
      deletePreset(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, deletePreset]);

  return (
    <div className="flex items-center gap-2" data-testid="preset-dropdown">
      {/* Preset selector */}
      <label className="flex items-center">
        <select
          value={matchedPresetId || ''}
          onChange={handleSelectChange}
          aria-label="Saved Presets"
          data-testid="preset-select"
          className="bg-surface-base border border-slate-800 rounded-lg text-sm text-slate-100 px-3 py-2 w-56 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 outline-none cursor-pointer appearance-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
            paddingRight: '32px',
          }}
        >
          <option value="" disabled>
            {presets.length === 0 ? 'No saved presets' : 'Saved Presets'}
          </option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </label>

      {/* Save Current button */}
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        disabled={!hasEnoughModels || isAtMax}
        title={
          !hasEnoughModels
            ? 'Select at least 2 models to save'
            : isAtMax
              ? 'Maximum 50 presets reached. Delete one first.'
              : 'Save current comparison as a preset'
        }
        aria-label="Save current comparison as a preset"
        data-testid="save-current-btn"
        className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors cursor-pointer bg-surface-raised border border-slate-800 hover:border-violet-500 text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <BookmarkPlus className="w-4 h-4" />
        Save Current
      </button>

      {/* Delete icon — visible when a preset is matched */}
      {matchedPresetId && !deleteConfirmId && (
        <button
          type="button"
          onClick={() => setDeleteConfirmId(matchedPresetId)}
          title="Delete this preset"
          aria-label="Delete this preset"
          data-testid="delete-preset-btn"
          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {/* Inline delete confirmation */}
      {deleteConfirmId && (
        <div
          className="flex items-center gap-2 text-xs text-slate-400 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2"
          role="alert"
          data-testid="delete-confirm"
        >
          <span>Delete this preset?</span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setDeleteConfirmId(null)}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
              data-testid="delete-cancel-btn"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteClick}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors cursor-pointer"
              data-testid="delete-confirm-btn"
            >
              Yes, delete
            </button>
          </div>
        </div>
      )}

      {/* Max presets warning */}
      {isAtMax && (
        <div
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-amber-500/5 border border-amber-500/15 text-amber-500"
          role="status"
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Maximum 50 presets reached. Delete one first.
        </div>
      )}

      {/* Save dialog */}
      <SavePresetDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        existingNames={existingNames}
      />
    </div>
  );
}
