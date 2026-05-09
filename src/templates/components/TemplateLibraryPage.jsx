/**
 * TemplateLibraryPage — Route component for /templates.
 *
 * Full CRUD management UI for prompt templates:
 *   - Browse templates grouped by category
 *   - Search and filter by name/category
 *   - Create new templates
 *   - Edit existing templates
 *   - Delete with confirmation
 *   - Clear all with two-step confirmation
 */
import { useState, useMemo } from 'react';
import { BookOpen, Plus, Pencil, Trash2, AlertTriangle, Search } from 'lucide-react';
import useTemplateStore from '../store';
import TemplateEditor from './TemplateEditor';

/**
 * Format ISO date to relative time string.
 */
function relativeTime(iso) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;

  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function TemplateLibraryPage() {
  const templates = useTemplateStore((s) => s.templates);
  const addTemplate = useTemplateStore((s) => s.addTemplate);
  const updateTemplate = useTemplateStore((s) => s.updateTemplate);
  const deleteTemplate = useTemplateStore((s) => s.deleteTemplate);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

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

  const handleSave = (data) => {
    if (editingTemplate) {
      updateTemplate(editingTemplate.id, data);
    } else {
      addTemplate(data);
    }
    setEditingTemplate(null);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    setIsCreating(false);
  };

  const handleDelete = (id) => {
    deleteTemplate(id);
    setDeleteId(null);
  };

  const handleClearAll = () => {
    useTemplateStore.setState({ templates: [] });
    setConfirmClear(false);
  };

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('all');
  };

  // Show editor
  if (isCreating || editingTemplate) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-5 h-5 text-slate-400" />
          <h1 className="text-2xl font-semibold text-slate-100">Templates</h1>
        </div>
        <TemplateEditor
          template={editingTemplate}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  const isEmpty = templates.length === 0;
  const hasResults = filtered.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-slate-400" />
          <h1 className="text-2xl font-semibold text-slate-100">Templates</h1>
        </div>
        {templates.length > 0 && (
          <button
            type="button"
            onClick={() => (confirmClear ? handleClearAll() : setConfirmClear(true))}
            className={`text-sm font-medium rounded-lg px-4 py-2 transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
              confirmClear
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                : 'text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30'
            }`}
          >
            {confirmClear ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                Confirm Clear All
              </>
            ) : (
              'Clear all'
            )}
          </button>
        )}
      </div>

      {/* Clear-all confirmation bar */}
      {confirmClear && (
        <div
          className="bg-surface-overlay rounded-lg p-4 border border-red-500/20 mb-4 flex items-center gap-3"
          role="alertdialog"
          aria-label="Confirm clear all templates"
        >
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-slate-300 flex-1">
            This will permanently delete all templates. This action cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => setConfirmClear(false)}
            className="text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-1.5 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Filters */}
      {templates.length > 0 && (
        <div className="bg-surface-raised rounded-xl p-4 flex items-center gap-3 mb-6">
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
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="py-16 flex flex-col items-center gap-3">
          <BookOpen className="w-8 h-8 text-slate-600" />
          <p className="text-sm font-medium text-slate-400">No templates yet</p>
          <p className="text-xs text-slate-500 text-center max-w-sm">
            Create your first prompt template to reuse in the Playground.
          </p>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white rounded-lg px-5 py-2 text-sm font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        </div>
      )}

      {/* No-match state */}
      {!isEmpty && !hasResults && (
        <div className="text-center py-16">
          <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-400">
            No templates match your filters
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-violet-400 hover:text-violet-300 mt-1 cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Template list */}
      {hasResults && (
        <div className="flex flex-col gap-4">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              {category && (
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                  {category} ({items.length})
                </h3>
              )}
              <div className="flex flex-col gap-3">
                {items.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="bg-surface-raised rounded-xl border border-slate-800/50 hover:border-slate-700 transition-colors p-5"
                  >
                    {/* Row 1: Name + category + actions */}
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-slate-100">
                        {tpl.name}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {tpl.category && (
                          <span className="bg-violet-500/10 text-violet-400 rounded-full text-xs px-2 py-0.5">
                            {tpl.category}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditingTemplate(tpl)}
                          className="text-slate-500 hover:text-violet-400 p-1 rounded-lg hover:bg-violet-500/10 cursor-pointer"
                          aria-label={`Edit template: ${tpl.name}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(tpl.id)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 cursor-pointer"
                          aria-label={`Delete template: ${tpl.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Preview */}
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {tpl.template}
                    </p>

                    {/* Row 3: Variables + timestamp */}
                    <div className="flex items-center justify-between mt-2">
                      {tpl.variables.length > 0 ? (
                        <p className="text-xs text-slate-500">
                          Variables:{' '}
                          {tpl.variables.map((v) => (
                            <span key={v} className="text-violet-400">{`{{${v}}}`}</span>
                          )).reduce((prev, curr, i) => (
                            <span key={i}>
                              {prev}{i > 0 && ', '}{curr}
                            </span>
                          ))}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500">No variables</p>
                      )}
                      <p className="text-xs text-slate-500">
                        Updated {relativeTime(tpl.updatedAt)}
                      </p>
                    </div>

                    {/* Delete confirmation */}
                    {deleteId === tpl.id && (
                      <div className="mt-3 pt-3 border-t border-slate-800/50 flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <p className="text-xs text-slate-300 flex-1">
                          Delete &quot;{tpl.name}&quot;?
                        </p>
                        <button
                          type="button"
                          onClick={() => setDeleteId(null)}
                          className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tpl.id)}
                          className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-1 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create button at bottom */}
      {hasResults && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white rounded-lg px-5 py-2 text-sm font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        </div>
      )}
    </div>
  );
}
