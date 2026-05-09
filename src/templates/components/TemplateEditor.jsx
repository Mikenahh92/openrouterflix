/**
 * TemplateEditor — Form for creating or editing a prompt template.
 *
 * Props:
 *   template — existing template for edit mode (null for create)
 *   onSave  — (data: { name, template, category }) => void
 *   onCancel — () => void
 */
import { useState, useMemo } from 'react';
import { extractVariables } from '../store';

export default function TemplateEditor({ template, onSave, onCancel }) {
  const isEdit = !!template;

  const [name, setName] = useState(template?.name || '');
  const [templateText, setTemplateText] = useState(template?.template || '');
  const [category, setCategory] = useState(template?.category || '');
  const [errors, setErrors] = useState({});

  // Live variable detection
  const variables = useMemo(
    () => extractVariables(templateText),
    [templateText]
  );

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!templateText.trim()) newErrors.template = 'Template text is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    onSave({
      name: name.trim(),
      template: templateText.trim(),
      category: category.trim() || null,
    });
  };

  return (
    <div className="bg-surface-raised rounded-xl p-6 border border-slate-800/50 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          ← Back to Templates
        </button>
        <h2 className="text-sm font-medium text-slate-100">
          {isEdit ? 'Edit Template' : 'New Template'}
        </h2>
      </div>

      {/* Name field */}
      <div className="mb-5">
        <label
          htmlFor="template-name"
          className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block"
        >
          Name
        </label>
        <input
          id="template-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
          }}
          onBlur={() => {
            if (!name.trim()) setErrors((prev) => ({ ...prev, name: 'Name is required' }));
          }}
          placeholder="e.g. Code Review Assistant"
          className={`w-full bg-surface-base border rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-surface-raised outline-none placeholder:text-slate-500 ${
            errors.name ? 'border-red-500' : 'border-slate-800'
          }`}
        />
        {errors.name && (
          <p className="text-xs text-red-400 mt-1">{errors.name}</p>
        )}
      </div>

      {/* Template textarea */}
      <div className="mb-2">
        <label
          htmlFor="template-text"
          className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block"
        >
          Template
        </label>
        <textarea
          id="template-text"
          value={templateText}
          onChange={(e) => {
            setTemplateText(e.target.value);
            if (errors.template) setErrors((prev) => ({ ...prev, template: '' }));
          }}
          onBlur={() => {
            if (!templateText.trim()) setErrors((prev) => ({ ...prev, template: 'Template text is required' }));
          }}
          placeholder="Type your template. Use {{variableName}} for placeholders..."
          rows={6}
          className={`w-full bg-surface-base border rounded-lg px-3 py-2.5 text-sm text-slate-100 resize-none overflow-y-auto focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-surface-raised outline-none placeholder:text-slate-500 ${
            errors.template ? 'border-red-500' : 'border-slate-800'
          }`}
        />
        {errors.template && (
          <p className="text-xs text-red-400 mt-1">{errors.template}</p>
        )}
      </div>

      {/* Variable detection indicator */}
      {variables.length > 0 && (
        <p className="text-xs text-violet-400 mb-5">
          Variables detected:{' '}
          {variables.map((v) => (
            <span key={v} className="font-medium">{v}</span>
          )).reduce((prev, curr, i) => (
            <span key={i}>
              {prev}
              {i > 0 && <span>, </span>}
              {curr}
            </span>
          ))}
        </p>
      )}
      <div className="mb-5" />

      {/* Category field */}
      <div className="mb-6">
        <label
          htmlFor="template-category"
          className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block"
        >
          Category (optional)
        </label>
        <input
          id="template-category"
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Coding, Writing, Analysis"
          className="w-full bg-surface-base border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-surface-raised outline-none placeholder:text-slate-500"
        />
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="bg-surface-raised border border-slate-800 hover:border-violet-500 text-slate-100 rounded-lg px-5 py-2 text-sm font-medium transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="bg-violet-600 hover:bg-violet-500 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors cursor-pointer"
        >
          Save Template
        </button>
      </div>
    </div>
  );
}
