/**
 * ImportDialog — modal dialog for importing JSON history or preset files.
 *
 * Features:
 *   - File upload via <input type="file">
 *   - Paste area for JSON text
 *   - Validation feedback (errors and warnings)
 *   - Merges valid records into the history store on confirm
 *
 * Props:
 *   open — boolean, controls visibility
 *   onClose — callback when dialog is dismissed
 *   onImport — callback(validRecords) when import is confirmed
 */
import { useState, useRef, useCallback } from 'react';
import { X, Upload, FileJson, AlertTriangle, CheckCircle } from 'lucide-react';
import { validateImport } from '../../shared/lib/exportUtils';

export default function ImportDialog({ open, onClose, onImport }) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [validData, setValidData] = useState(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  const reset = useCallback(() => {
    setJsonText('');
    setError(null);
    setWarnings([]);
    setValidData(null);
    setFileName('');
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const validateAndSet = (text, name) => {
    setError(null);
    setWarnings([]);
    setValidData(null);
    setFileName(name || '');

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setError(`Invalid JSON: ${e.message}`);
      return;
    }

    const result = validateImport(parsed);

    if (!result.valid) {
      setError(result.error);
      return;
    }

    if (result.warnings) {
      setWarnings(result.warnings);
    }

    if (result.type === 'orf-history') {
      setValidData({ type: 'orf-history', records: result.records });
    } else if (result.type === 'orf-preset') {
      setValidData({ type: 'orf-preset', preset: result.preset });
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      validateAndSet(event.target.result, file.name);
    };
    reader.onerror = () => {
      setError('Failed to read file.');
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (e) => {
    const text = e.target.value;
    setJsonText(text);
    if (text.trim()) {
      validateAndSet(text, 'pasted');
    } else {
      setError(null);
      setValidData(null);
      setWarnings([]);
    }
  };

  const handleConfirm = () => {
    if (!validData) return;

    if (validData.type === 'orf-history' && onImport) {
      onImport(validData.records);
    }

    handleClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label="Import history"
    >
      <div className="bg-surface-raised border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-100">Import History</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File upload */}
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileUpload}
            className="hidden"
            data-testid="import-file-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-slate-700 hover:border-violet-500/50 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-slate-300"
          >
            <Upload className="w-6 h-6" />
            <span className="text-sm font-medium">
              {fileName ? fileName : 'Click to upload a JSON file'}
            </span>
            {fileName && (
              <span className="text-xs text-slate-500">Click to choose a different file</span>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-xs text-slate-500">or paste JSON</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Paste area */}
        <textarea
          value={jsonText}
          onChange={handlePasteChange}
          placeholder='Paste JSON here...'
          rows={5}
          className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:border-violet-500/50"
          data-testid="import-paste-area"
        />

        {/* Error */}
        {error && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <span className="text-sm text-red-400" data-testid="import-error">
              {error}
            </span>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-400">
              {warnings.map((w, i) => (
                <p key={i} data-testid="import-warning">{w}</p>
              ))}
            </div>
          </div>
        )}

        {/* Success indicator */}
        {validData && !error && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
            <span className="text-sm text-green-400" data-testid="import-success">
              {validData.type === 'orf-history'
                ? `${validData.records.length} valid record(s) ready to import.`
                : 'Valid preset ready to import.'}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-5">
          <button
            type="button"
            onClick={handleClose}
            className="text-sm text-slate-400 hover:text-slate-200 px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!validData}
            className="inline-flex items-center gap-1.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
          >
            <FileJson className="w-4 h-4" />
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
