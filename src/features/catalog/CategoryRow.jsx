import ModelCard from './ModelCard';

/**
 * Netflix-style horizontal scrolling category row.
 * Displays a category title with model count, and a scrollable row of ModelCards.
 * Uses CSS scroll-snap for smooth horizontal scrolling.
 *
 * @param {object} props
 * @param {object} props.category - Category object { id, name, slug, modelCount }
 * @param {object[]} props.models - Array of normalized models for this category
 */
export default function CategoryRow({ category, models }) {
  const handleScroll = (e) => {
    const container = e.currentTarget;
    // Enable smooth scroll buttons — not needed for CSS-only approach
    void container;
  };

  return (
    <section className="mb-8" aria-label={`${category.name} models`}>
      {/* Row header */}
      <div className="flex items-baseline gap-3 px-12 mb-3">
        <h2 className="text-lg font-semibold text-slate-100">
          {category.name}
        </h2>
        <span className="text-xs text-slate-500">
          {category.modelCount} {category.modelCount === 1 ? 'model' : 'models'}
        </span>
      </div>

      {/* Horizontal scrollable card row */}
      <div
        className="flex gap-4 overflow-x-auto px-12 pb-2 scroll-smooth snap-x snap-mandatory
          scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700"
        onScroll={handleScroll}
        role="list"
      >
        {models.map((model) => (
          <div key={model.id} role="listitem" className="snap-start shrink-0">
            <ModelCard model={model} />
          </div>
        ))}
      </div>
    </section>
  );
}
