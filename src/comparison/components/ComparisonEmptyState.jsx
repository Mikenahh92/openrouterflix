/**
 * ComparisonEmptyState — polished empty/landing state for the /compare route.
 *
 * Handles two variants:
 *   - 0 models: full empty state with "Select models to compare" headline
 *   - 1 model:  partial state showing the single model card + "Almost there!" messaging
 *
 * Follows the Neural Glow theme tokens and CatalogPage empty-state visual pattern.
 * Fully accessible: role="status", aria-live="polite", auto-focused CTA, aria-hidden icon.
 */
import { useRef, useEffect } from 'react';
import { Link } from 'react-router';
import { Columns } from 'lucide-react';

/**
 * @param {object} props
 * @param {number} props.modelCount — number of valid models currently selected (0 or 1)
 * @param {object} [props.singleModel] — model data when modelCount === 1
 * @param {string} [props.singleModel.id] — model ID
 * @param {string} [props.singleModel.name] — display name
 * @param {string} [props.singleModel.provider] — provider identifier
 */
export default function ComparisonEmptyState({ modelCount, singleModel }) {
  const ctaRef = useRef(null);

  // Auto-focus CTA on initial mount with a short delay to avoid route-transition focus fights
  useEffect(() => {
    const timer = setTimeout(() => {
      ctaRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const isSingle = modelCount === 1 && singleModel;

  const headline = isSingle ? 'Almost there!' : 'Select models to compare';
  const subtext = isSingle
    ? 'Add at least one more model to start comparing.'
    : 'Choose 2\u20134 models from the catalog to see them side by side.';

  return (
    <div
      className="max-w-lg mx-auto py-20 px-6 flex flex-col items-center text-center animate-fadeIn"
      role="status"
      aria-live="polite"
      data-testid="comparison-empty"
    >
      {/* Decorative Columns icon with glow container */}
      <div
        className="rounded-full bg-surface-raised p-4 shadow-glow mb-6"
        aria-hidden="true"
      >
        <Columns size={64} className="text-slate-500" />
      </div>

      {/* Headline */}
      <h2 className="text-2xl font-semibold text-slate-100 mb-2">{headline}</h2>

      {/* Subtext */}
      <p className="text-sm text-slate-400 mb-8 max-w-sm">{subtext}</p>

      {/* Single-model card (1-model variant only) */}
      {isSingle && (
        <div
          className="bg-surface-raised border border-slate-800 rounded-xl px-4 py-3 mb-8 flex items-center gap-3 w-full max-w-xs"
          aria-label={`Currently selected: ${singleModel.name || singleModel.id}`}
        >
          {/* Model avatar placeholder */}
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0">
            <Columns size={16} className="text-white" />
          </div>

          {/* Model info */}
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-semibold text-slate-100 truncate">
              {singleModel.name || 'Unknown'}
            </span>
            {singleModel.provider && (
              <span className="inline-block px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider bg-surface-base/70 backdrop-blur-sm rounded-md text-slate-300 border border-slate-700/50 w-fit">
                {singleModel.provider}
              </span>
            )}
          </div>

          {/* Count indicator */}
          <span className="ml-auto text-xs text-slate-500 shrink-0">1 / 2+</span>
        </div>
      )}

      {/* Browse Catalog CTA */}
      <Link
        ref={ctaRef}
        to="/"
        aria-label="Browse Catalog"
        className="inline-block bg-violet-500 hover:bg-violet-400 text-white rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
      >
        Browse Catalog
      </Link>
    </div>
  );
}
