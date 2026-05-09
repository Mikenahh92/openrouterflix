/**
 * PromptInput — Multi-line textarea with Send and Clear controls.
 *
 * Features:
 *   - Auto-growing textarea (max ~8 lines before scrolling)
 *   - Character counter (informational)
 *   - Send button (primary violet, disabled when empty/loading)
 *   - Clear button (ghost variant)
 *   - Load Template button (ghost variant, opens template picker)
 *   - Ctrl+Enter keyboard shortcut to send
 */
import { useRef, useCallback } from 'react';
import { Zap, Trash2, BookOpen } from 'lucide-react';

export default function PromptInput({
  prompt,
  onPromptChange,
  onSend,
  onClear,
  onLoadTemplate,
  isLoading,
  isDisabled,
}) {
  const textareaRef = useRef(null);

  const canSend = prompt.trim() !== '' && !isLoading && !isDisabled;

  const handleTextareaChange = useCallback(
    (e) => {
      onPromptChange(e.target.value);

      // Auto-grow logic
      const textarea = e.target;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 256)}px`;
    },
    [onPromptChange]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canSend) {
        e.preventDefault();
        onSend();
      }
    },
    [canSend, onSend]
  );

  const handleClear = useCallback(() => {
    onPromptChange('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    onClear();
  }, [onPromptChange, onClear]);

  return (
    <div className="bg-surface-raised rounded-xl p-5">
      <label
        className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 block"
        htmlFor="prompt-input"
      >
        Prompt
      </label>
      <div className="relative">
        <textarea
          ref={textareaRef}
          id="prompt-input"
          aria-label="Prompt input"
          className="w-full bg-surface-base border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 resize-none overflow-y-auto focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-surface-raised outline-none placeholder:text-slate-500"
          placeholder="Type your prompt here..."
          rows={1}
          value={prompt}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          style={{ maxHeight: '16rem' }}
        />
        <span className="absolute bottom-2 right-3 text-xs text-slate-500 pointer-events-none">
          {prompt.length} chars
        </span>
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-slate-500">Ctrl+Enter to send</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Clear prompt and response"
            className="text-slate-400 hover:text-white hover:bg-surface-overlay rounded-lg px-3 py-1.5 text-sm transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            onClick={handleClear}
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
          {onLoadTemplate && (
            <button
              type="button"
              aria-label="Load template"
              className="text-slate-400 hover:text-white hover:bg-surface-overlay rounded-lg px-3 py-1.5 text-sm transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              onClick={onLoadTemplate}
            >
              <BookOpen className="w-4 h-4" />
              Load Template
            </button>
          )}
          <button
            type="button"
            aria-label="Send prompt"
            className={`inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
              canSend
                ? 'bg-violet-600 hover:bg-violet-500 text-white cursor-pointer'
                : 'bg-violet-600 text-white opacity-50 cursor-not-allowed'
            }`}
            onClick={canSend ? onSend : undefined}
            disabled={!canSend}
          >
            <Zap className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
