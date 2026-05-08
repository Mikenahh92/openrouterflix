/**
 * ComparisonCard — per-model column header for the comparison table.
 *
 * Rendered as a <th> element inside <thead>.
 * Displays model name, provider badge, category pills, and a remove (×) action.
 *
 * Follows Style Guide patterns from DetailPage and ModelCard.
 */
import { X } from 'lucide-react';

/**
 * @param {object} props
 * @param {object} props.model — normalized model object
 * @param {Function} props.onRemove — callback invoked with model.id when × is clicked
 */
export default function ComparisonCard({ model, onRemove }) {
  if (!model) return null;

  const displayName = model.name || model.id;

  return (
    <th
      scope="col"
      className="relative px-4 py-4 bg-surface-raised border-b border-slate-800 text-center min-w-[140px]"
    >
      {/* Remove button */}
      <button
        onClick={() => onRemove(model.id)}
        aria-label={`Remove ${displayName} from comparison`}
        className="absolute top-2 right-2 p-1 rounded-md text-slate-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Model name */}
      <div
        className="text-sm font-semibold text-slate-100 truncate max-w-[180px] mx-auto"
        title={displayName}
      >
        {displayName}
      </div>

      {/* Provider badge */}
      {model.provider && (
        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-surface-base/70 backdrop-blur-sm rounded-md text-slate-300 border border-slate-700/50">
          {model.provider}
        </span>
      )}

      {/* Category pills */}
      {model.categories?.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 mt-1">
          {model.categories.map((cat) => (
            <span
              key={cat}
              className="bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full text-xs px-2 py-0.5"
            >
              {cat}
            </span>
          ))}
        </div>
      )}
    </th>
  );
}
