/**
 * DimensionToggle — Popover for toggling comparison table dimension visibility.
 *
 * Uses global user preference from useComparisonPresetsStore.visibleDimensions.
 * Minimum 1 dimension must remain visible.
 *
 * Props: none (reads/writes directly from presets store)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Columns3, RotateCcw } from 'lucide-react';
import { useComparisonPresetsStore, ALL_DIMENSION_KEYS } from '../store.js';

/** Dimension config for the toggle UI (label + icon). Must match ComparisonTable DIMENSIONS. */
const DIMENSION_INFO = [
  { key: 'provider', label: 'Provider', Icon: null },
  { key: 'pricing.prompt', label: 'Input Price', Icon: null },
  { key: 'pricing.completion', label: 'Output Price', Icon: null },
  { key: 'latency', label: 'Latency', Icon: null },
  { key: 'contextWindow', label: 'Context Window', Icon: null },
  { key: 'qualityScore', label: 'Quality Score', Icon: null },
  { key: 'maxOutput', label: 'Max Output', Icon: null },
  { key: 'modalities', label: 'Modalities', Icon: null },
  { key: 'categories', label: 'Categories', Icon: null },
];

export default function DimensionToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  const visibleDimensions = useComparisonPresetsStore((s) => s.visibleDimensions);
  const setVisibleDimensions = useComparisonPresetsStore((s) => s.setVisibleDimensions);
  const resetVisibleDimensions = useComparisonPresetsStore((s) => s.resetVisibleDimensions);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const handleToggle = useCallback(
    (key) => {
      const isVisible = visibleDimensions.includes(key);
      if (isVisible) {
        // Prevent removing last dimension
        if (visibleDimensions.length <= 1) return;
        setVisibleDimensions(visibleDimensions.filter((k) => k !== key));
      } else {
        setVisibleDimensions([...visibleDimensions, key]);
      }
    },
    [visibleDimensions, setVisibleDimensions]
  );

  const handleReset = useCallback(() => {
    resetVisibleDimensions();
  }, [resetVisibleDimensions]);

  const isAllVisible = visibleDimensions.length === ALL_DIMENSION_KEYS.length;
  const isLastDimension = visibleDimensions.length === 1;

  return (
    <div className="relative" ref={popoverRef} data-testid="dimension-toggle">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Toggle dimensions"
        aria-label="Toggle dimensions"
        aria-expanded={isOpen}
        data-testid="dimension-toggle-btn"
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-surface-overlay transition-colors cursor-pointer"
      >
        <Columns3 className="w-5 h-5" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-56 bg-surface-raised border border-slate-800 rounded-xl shadow-xl py-2 z-40"
          role="menu"
          aria-label="Toggle dimension visibility"
        >
          {DIMENSION_INFO.map((dim) => {
            const isVisible = visibleDimensions.includes(dim.key);
            const isLast = isLastDimension && isVisible;

            return (
              <button
                key={dim.key}
                type="button"
                role="menuitemcheckbox"
                aria-checked={isVisible}
                onClick={() => handleToggle(dim.key)}
                disabled={isLast}
                title={isLast ? 'At least one dimension must be visible' : undefined}
                className={`flex items-center gap-2 px-3 py-2 text-sm w-full text-left rounded-md mx-1 transition-colors cursor-pointer ${
                  isVisible
                    ? 'text-slate-100 hover:bg-surface-overlay'
                    : 'text-slate-500 hover:bg-surface-overlay'
                } ${isLast ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    isVisible
                      ? 'bg-violet-600 border-violet-600'
                      : 'border-slate-600'
                  }`}
                >
                  {isVisible && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </span>
                {dim.label}
              </button>
            );
          })}

          <div className="border-t border-slate-800/50 mt-1 pt-1 mx-2">
            <button
              type="button"
              role="menuitem"
              onClick={handleReset}
              disabled={isAllVisible}
              className={`flex items-center gap-1.5 px-2 py-1.5 text-xs w-full text-left transition-colors cursor-pointer rounded-md ${
                isAllVisible
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-violet-400 hover:underline'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              Reset all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
