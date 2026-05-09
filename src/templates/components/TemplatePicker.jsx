/**
 * TemplatePicker — Modal for selecting a prompt template from the library.
 *
 * Shows all templates grouped by category with search and filter.
 * On selection, if the template has variables, transitions to VariableFillDialog.
 * If no variables, calls onApply immediately with the template text.
 */
import { useState, useMemo } from 'react';
import { Search, BookOpen } from 'lucide-react';
import { Link } from 'react-router';
import Modal from '../../shared/components/Modal';
import useTemplateStore from '../store';
import VariableFillDialog from './VariableFillDialog';

export default function TemplatePicker({ onClose, onApply }) {
  const templates = useTemplateStore((s) => s.templates);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Compute available categories
  const categories = useMemo(() => {
    const cats = [...new Set(templates.map((t) => t.category).filter(Boolean))];
    cats.sort();
    return cats;
  }, [templates]);

  // Filter templates
  const filtered = useMemo(() => {
    let result = templates;

    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.category === categoryFilter);
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.template.toLowerCase().includes(query)
      );
    }

    return result;
  }, [templates, search, categoryFilter]);

  // Group by category
  const grouped = useMemo(() => {
    const showCategories =
      new Set(filtered.map((t) => t.category)).size > 1;
    if (!showCategories) return { '': filtered };

    const groups = {};
    for (const t of filtered) {
      const key = t.category || 'Uncategorized';
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
    return groups;
  }, [filtered]);

  const handleSelect = (template) => {
    if (template.variables.length === 0) {
      onApply(template.template);
      onClose();
    } else {
      setSelectedTemplate(template);
    }
  };

  const handleFillApply = (resolvedText) => {
    onApply(resolvedText);
  };

  const handleFillBack = () => {
    setSelectedTemplate(null);
  };

  // If a template is selected for variable fill, show the fill dialog
  if (selectedTemplate) {
    return (
      <VariableFillDialog
        template={selectedTemplate}
        onApply={handleFillApply}
        onBack={handleFillBack}
        onClose={onClose}
      />
    );
  }

  const isEmpty = templates.length === 0;
  const hasResults = filtered.length > 0;

  return (
    <Modal isOpen={true} onClose={onClose} title="Load Template">
      {/* Search and filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-surface-base border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-100 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 outline-none placeholder:text-slate-500"
          />
        </div>
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-surface-base border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 outline-none"
          >
            <option value="all">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Empty state — no templates exist */}
      {isEmpty && (
        <div className="py-16 flex flex-col items-center gap-3">
          <BookOpen className="w-8 h-8 text-slate-600" />
          <p className="text-sm font-medium text-slate-400">No templates yet</p>
          <p className="text-xs text-slate-500 text-center">
            Create one in the Templates page
          </p>
          <Link
            to="/templates"
            onClick={onClose}
            className="text-sm text-violet-400 hover:text-violet-300"
          >
            Go to Templates →
          </Link>
        </div>
      )}

      {/* No match state */}
      {!isEmpty && !hasResults && (
        <div className="text-center py-16">
          <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-400">
            No templates match your search
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setCategoryFilter('all');
            }}
            className="text-sm text-violet-400 hover:text-violet-300 mt-1 cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Template list */}
      {hasResults && (
        <div className="flex flex-col gap-3">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              {category && (
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  {category} ({items.length})
                </h3>
              )}
              <div className="flex flex-col gap-2">
                {items.map((template) => (
                  <div
                    key={template.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelect(template)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelect(template);
                      }
                    }}
                    className="bg-surface-raised rounded-lg p-4 hover:border-violet-500/50 border border-transparent transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-100">
                          {template.name}
                        </p>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                          {template.template}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {template.category && (
                          <span className="bg-violet-500/10 text-violet-400 rounded-full text-xs px-2 py-0.5">
                            {template.category}
                          </span>
                        )}
                        <span className="bg-violet-500/10 text-violet-400 rounded-full text-xs px-2 py-0.5">
                          {template.variables.length === 0
                            ? 'No variables'
                            : `${template.variables.length} vars`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
