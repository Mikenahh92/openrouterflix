/**
 * SavePresetDialog — Modal dialog for naming a new comparison preset.
 *
 * Uses shared Modal component. Provides real-time validation:
 *   - Empty name → Save disabled
 *   - Duplicate name → warning + Save disabled
 *   - >50 chars → warning + Save disabled
 *   - Valid → Save enabled (violet-500 primary)
 *
 * Props:
 *   isOpen      — boolean
 *   onClose     — () => void
 *   onSave      — (name: string) => void
 *   existingNames — string[] (for duplicate check)
 */
import { useState, useEffect, useRef } from 'react';
import Modal from '../../shared/components/Modal.jsx';

const MAX_NAME_LENGTH = 50;

export default function SavePresetDialog({ isOpen, onClose, onSave, existingNames = [] }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  // Reset and focus when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const trimmedName = name.trim();
  const isEmpty = trimmedName.length === 0;
  const isTooLong = trimmedName.length > MAX_NAME_LENGTH;
  const isDuplicate = !isEmpty && !isTooLong && existingNames.some(
    (n) => n.toLowerCase() === trimmedName.toLowerCase()
  );
  const isValid = !isEmpty && !isTooLong && !isDuplicate;

  const handleSave = () => {
    if (!isValid) return;
    onSave(trimmedName);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && isValid) {
      handleSave();
    }
  };

  // Error state for border styling
  const inputBorderClass = isDuplicate
    ? 'border-red-500'
    : isTooLong
      ? 'border-amber-500'
      : name.length > 0
        ? 'border-violet-500'
        : 'border-slate-800';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Save Preset"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </>
      }
    >
      <div>
        <label
          htmlFor="preset-name-input"
          className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2"
        >
          Preset Name
        </label>
        <input
          ref={inputRef}
          id="preset-name-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., GPT-4o vs Claude 3.5"
          maxLength={100}
          className={`w-full bg-surface-base ${inputBorderClass} rounded-lg px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 outline-none transition-colors`}
          data-testid="preset-name-input"
        />
        <p className="text-xs text-slate-500 mt-1.5">(1–50 characters)</p>

        {isDuplicate && (
          <div className="flex items-center gap-1.5 mt-2" role="alert" aria-live="polite">
            <svg className="w-3.5 h-3.5 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-xs text-red-400">A preset with this name already exists.</span>
          </div>
        )}

        {isTooLong && (
          <div className="flex items-center gap-1.5 mt-2" role="alert" aria-live="polite">
            <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-xs text-amber-500">Name too long (max 50 characters).</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
