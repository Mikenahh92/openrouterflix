import { Link } from 'react-router';

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
 * Netflix-style model card with hero gradient, provider badge, spec rows,
 * category pills, and hover effects.
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

  return (
    <Link
      to={`/models/${encodeURIComponent(id)}`}
      className="group relative flex flex-col min-w-[260px] max-w-[260px] bg-surface-raised rounded-xl overflow-hidden
        transition-transform duration-200 ease-out hover:scale-[1.04] hover:shadow-glow
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
    >
      {/* Hero gradient header */}
      <div className="relative h-24 bg-gradient-to-br from-violet-600/40 via-fuchsia-500/20 to-surface-raised">
        {/* Provider badge */}
        {provider && (
          <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider
            bg-surface-base/70 backdrop-blur-sm rounded-md text-slate-300 border border-slate-700/50">
            {provider}
          </span>
        )}
        {/* Quality score badge */}
        {qualityScore != null && (
          <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-semibold
            bg-violet-500/30 backdrop-blur-sm rounded-md text-violet-200 border border-violet-400/30">
            ★ {qualityScore}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-3 pt-2">
        {/* Model name */}
        <h3 className="text-sm font-semibold text-slate-100 leading-snug truncate mb-2 group-hover:text-violet-300 transition-colors">
          {name || id}
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
                {cat}
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
  );
}
