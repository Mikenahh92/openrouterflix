/**
 * VariableFillDialog — Dialog for filling {{variable}} values before applying a template.
 *
 * Renders labeled inputs for each variable detected in the template.
 * Shows live preview of the substituted text.
 * Calls onApply with the resolved text when the user clicks Apply.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import Modal from '../../shared/components/Modal';
import { substituteVariables, extractVariables } from '../store';

export default function VariableFillDialog({
  template,
  onApply,
  onBack,
  onClose,
}) {
  const [values, setValues] = useState({});
  const firstInputRef = useRef(null);

  // Auto-focus first input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      firstInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const variables = template.variables;

  const handleValueChange = (varName, value) => {
    setValues((prev) => ({ ...prev, [varName]: value }));
  };

  const handleApply = () => {
    const resolved = substituteVariables(template.template, values);
    onApply(resolved);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Only submit if Enter is pressed on an input (not textarea)
      if (e.target.tagName === 'INPUT') {
        e.preventDefault();
        handleApply();
      }
    }
  };

  // Live preview
  const preview = useMemo(
    () => substituteVariables(template.template, values),
    [template.template, values]
  );

  // Build preview with highlighted unfilled variables
  const previewParts = useMemo(() => {
    const regex = /\{\{(\w+)\}\}/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(template.template)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: template.template.slice(lastIndex, match.index),
        });
      }
      const varName = match[1];
      const isFilled = values[varName] && values[varName].trim() !== '';
      parts.push({
        type: 'variable',
        varName,
        isFilled,
        value: values[varName] || '',
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < template.template.length) {
      parts.push({
        type: 'text',
        content: template.template.slice(lastIndex),
      });
    }

    return parts;
  }, [template.template, values]);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Fill Variables"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="bg-surface-raised border border-slate-800 hover:border-violet-500 text-slate-100 rounded-lg px-5 py-2 text-sm font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="bg-violet-600 hover:bg-violet-500 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors cursor-pointer"
          >
            Apply
          </button>
        </>
      }
    >
      {/* Back button + template name */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <p className="text-sm text-slate-400 truncate max-w-[60%]" title={template.name}>
          Template: &quot;{template.name}&quot;
        </p>
      </div>

      {/* Variable inputs */}
      <div className="flex flex-col gap-4 mb-4">
        {variables.map((varName, index) => (
          <div key={varName}>
            <label
              htmlFor={`var-${varName}`}
              className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block"
            >
              {varName.replace(/_/g, ' ')}
            </label>
            <input
              ref={index === 0 ? firstInputRef : null}
              id={`var-${varName}`}
              type="text"
              value={values[varName] || ''}
              onChange={(e) => handleValueChange(varName, e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Enter value for ${varName.replace(/_/g, ' ')}`}
              className="w-full bg-surface-base border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-surface-raised outline-none placeholder:text-slate-500"
            />
          </div>
        ))}
      </div>

      {/* Live preview */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">
          Preview
        </p>
        <div
          className="bg-surface-base/50 rounded-lg p-3"
          aria-live="polite"
        >
          <p className="text-sm text-slate-300 whitespace-pre-wrap">
            {previewParts.map((part, i) =>
              part.type === 'text' ? (
                <span key={i}>{part.content}</span>
              ) : part.isFilled ? (
                <span key={i}>{part.value}</span>
              ) : (
                <span
                  key={i}
                  className="bg-violet-500/20 text-violet-300 rounded px-1"
                >
                  {`{{${part.varName}}}`}
                </span>
              )
            )}
          </p>
        </div>
      </div>
    </Modal>
  );
}
