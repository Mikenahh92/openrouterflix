import { useState, useCallback } from 'react';
import { Link } from 'react-router';
import { Square, CheckSquare } from 'lucide-react';
import { useStore } from '../../shared/lib/store.js';

/**
 * Format a pricing value (per-1M tokens) to a human-readable string.
 * @param {number|null} value - Price per 1M tokens in USD
 * @returns {string} Formatted price string
 */
function formatPrice(value) {
  if (value == null) return '—';
  if (value === 0) return 'Free';
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(2)}`;
}

/**
 * Format context window size to a human-readable string.
 * @param {number|null} tokens - Context length in tokens
 * @returns {string} Formatted context string
 */
function formatContext(tokens) {
  if (tokens == null) return '—';
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`;
  return String(tokens);
}

/**
 * Highlight matching text with a colored span.
 * Case-insensitive matching; wraps all occurrences of the query.
 *
 * @param {string} text - Original text
 * @param {string} query - Search query to highlight
 * @returns {Array|string} React-compatible array of strings/elements, or original string
 */
function highlightText(text, query) {
  if (!text || !query) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return text;

  const parts = [];
  let lastIndex = 0;

  let searchFrom = 0;
  while (searchFrom < lowerText.length) {
    const foundAt = lowerText.indexOf(lowerQuery, searchFrom);
    if (foundAt === -1) break;

    if (foundAt > lastIndex) {
      parts.push(text.slice(lastIndex, foundAt));
    }
    parts.push(
      <mark
        key={foundAt}
        className="bg-violet-500/30 text-violet-200 rounded-sm px-0.5"
      >
        {text.slice(foundAt, foundAt + query.length)}
      </mark>
    );
    lastIndex = foundAt + query.length;
    searchFrom = lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

/**
 * Toast notification for max selection limit.
 * @param {object} props
 * @param {boolean} props.visible - Whether to show the toast
 */
function MaxLimitToast({ visible }) {
  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed top-6 right-6 z-50 bg-[#131625] border border-slate-800 rounded-lg shadow-xl px-4 py-3
        text-sm text-slate-100 flex items-center gap-2 animate-[slideInRight_200ms_ease-out]"
    >
      <span className="text-amber-400">⚠</span>
      Maximum 4 models for comparison
    </div>
  );
}

/**
 * Netflix-style model card with hero gradient, provider badge, spec rows,
 * category pills, hover effects, search highlighting, and compare checkbox.
 * Includes a "Try this model" CTA that deep-links to the playground.
 *
 * @param {object} props
 * @param {object} props.model - Normalized model object
 */
export default function ModelCard({ model }) {
  const {
    id,
    name,
    provider,
    pricing,
    contextWindow,
    categories,
    qualityScore,
  } = model;

  // Get active search query for highlighting
  const searchQuery = useStore((s) => s.catalog?.searchQuery ?? '');

  const [showMaxToast, setShowMaxToast] = useState(false);

  const isSelected = useStore(
    (s) => s.catalog?.compareSelections?.includes(id) ?? false
  );
  const toggleCompare = useStore((s) => s.catalog?.toggleCompare);
  const compareSelections = useStore((s) => s.catalog?.compareSelections ?? []);

  const handleCompareClick = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      const result = toggleCompare?.(id);
      if (result === false) {
        // Max reached — show toast
        setShowMaxToast(true);
        setTimeout(() => setShowMaxToast(false), 2500);
      }
    },
    [toggleCompare, id]
  );

  const isMaxReached = !isSelected && compareSelections.length >= 4;

  return (
    <>
      <Link
        to={`/models/${encodeURIComponent(id)}`}
        className={`group relative flex flex-col min-w-[260px] max-w-[260px] bg-surface-raised rounded-xl overflow-hidden
          transition-all duration-200 ease-out hover:scale-[1.04] hover:shadow-glow
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400
          ${isSelected ? 'border-2 border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]' : 'border-2 border-transparent'}`}
      >
        {/* Hero gradient header */}
        <div className="relative h-24 bg-gradient-to-br from-violet-600/40 via-fuchsia-500/20 to-surface-raised">
          {/* Provider badge */}
          {provider && (
            <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider
              bg-surface-base/70 backdrop-blur-sm rounded-md text-slate-300 border border-slate-700/50">
              {highlightText(provider, searchQuery)}
            </span>
          )}
          {/* Quality score badge */}
          {qualityScore != null && (
            <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-semibold
              bg-violet-500/30 backdrop-blur-sm rounded-md text-violet-200 border border-violet-400/30">
              ★ {qualityScore}
            </span>
          )}

          {/* Try this model CTA — appears on hover */}
          <Link
            to={`/playground?model=${encodeURIComponent(id)}`}
            onClick={(e) => e.stopPropagation()}
            data-testid="card-try-model-cta"
            className="absolute bottom-2 right-2 px-2 py-1 text-[10px] font-semibold
              bg-violet-500 hover:bg-violet-400 text-white rounded-md
              opacity-0 group-hover:opacity-100 transition-opacity duration-200
              focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
          >
            Try this model
          </Link>
        </div>

          {/* Compare checkbox */}
          <button
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            aria-label={
              isSelected
                ? `Remove ${name || id} from comparison`
                : `Add ${name || id} to comparison`
            }
            onClick={handleCompareClick}
            disabled={isMaxReached}
            className={`absolute top-2 right-2 z-10 p-1 rounded-md transition-colors duration-150
              ${isMaxReached
                ? 'text-slate-600 cursor-not-allowed'
                : isSelected
                  ? 'text-violet-400 hover:text-violet-300 cursor-pointer'
                  : 'text-slate-400/60 hover:text-slate-300 cursor-pointer bg-surface-base/40'
              }
              focus-visible:outline focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base`}
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Card body */}
        <div className="flex flex-col flex-1 p-3 pt-2">
          {/* Model name */}
          <h3 className="text-sm font-semibold text-slate-100 leading-snug truncate mb-2 group-hover:text-violet-300 transition-colors">
            {highlightText(name || id, searchQuery)}
          </h3>

          {/* Spec rows */}
          <div className="flex flex-col gap-1 text-[11px] text-slate-400 mb-3">
            <div className="flex justify-between">
              <span>Input</span>
              <span className="text-slate-300 font-medium">
                {formatPrice(pricing?.prompt)}/1M
              </span>
            </div>
            <div className="flex justify-between">
              <span>Output</span>
              <span className="text-slate-300 font-medium">
                {formatPrice(pricing?.completion)}/1M
              </span>
            </div>
            <div className="flex justify-between">
              <span>Context</span>
              <span className="text-slate-300 font-medium">
                {formatContext(contextWindow)} tokens
              </span>
            </div>
          </div>

          {/* Category pills */}
          {categories && categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-auto">
              {categories.slice(0, 4).map((cat) => (
                <span
                  key={cat}
                  className="px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide
                    bg-surface-overlay text-slate-400 rounded-md border border-slate-700/40"
                >
                  {highlightText(cat, searchQuery)}
                </span>
              ))}
              {categories.length > 4 && (
                <span className="px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
                  +{categories.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
      <MaxLimitToast visible={showMaxToast} />
    </>
  );
}
