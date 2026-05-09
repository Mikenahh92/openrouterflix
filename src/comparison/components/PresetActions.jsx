/**
 * PresetActions — Export, Share URL, and Import controls for comparison presets.
 *
 * Reads model IDs and prompt from URL params via useComparison-like interface.
 *
 * Props:
 *   ids — string[] of model IDs currently being compared
 *   prompt — string (optional) current prompt text
 */
import { useState } from 'react';
import { FileJson, Link2, AlertTriangle } from 'lucide-react';
import {
  exportPresetJSON,
  downloadFile,
  encodePresetToBase64,
  isPresetTooLarge,
} from '../../shared/lib/exportUtils';

export default function PresetActions({ ids = [], prompt = '' }) {
  const [shareFeedback, setShareFeedback] = useState(null);

  const preset = { ids, prompt };

  const handleExportJSON = () => {
    const json = exportPresetJSON(preset);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadFile(json, `orf-preset-${timestamp}.json`, 'application/json');
  };

  const handleShare = async () => {
    const encoded = encodePresetToBase64(preset);

    if (isPresetTooLarge(encoded)) {
      setShareFeedback({ type: 'error', message: 'Preset too large for URL sharing. Use JSON export instead.' });
      setTimeout(() => setShareFeedback(null), 3000);
      return;
    }

    const url = `${window.location.origin}/compare?config=${encoded}`;

    try {
      await navigator.clipboard.writeText(url);
      setShareFeedback({ type: 'success', message: 'URL copied to clipboard!' });
    } catch {
      // Fallback: select and copy
      setShareFeedback({ type: 'success', message: url });
    }

    setTimeout(() => setShareFeedback(null), 3000);
  };

  const shareDisabled = ids.length === 0;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleExportJSON}
        disabled={ids.length === 0}
        title="Export comparison preset as JSON"
        className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-slate-400 hover:text-slate-200 hover:bg-slate-800"
      >
        <FileJson className="w-4 h-4" />
        Export Preset
      </button>
      <button
        type="button"
        onClick={handleShare}
        disabled={shareDisabled}
        title="Share comparison config via URL"
        className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-slate-400 hover:text-slate-200 hover:bg-slate-800"
      >
        <Link2 className="w-4 h-4" />
        Share
      </button>

      {/* Feedback */}
      {shareFeedback && (
        <div
          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md ${
            shareFeedback.type === 'error'
              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
              : 'bg-green-500/10 text-green-400 border border-green-500/20'
          }`}
          role="status"
        >
          {shareFeedback.type === 'error' && <AlertTriangle className="w-3 h-3" />}
          {shareFeedback.message}
        </div>
      )}
    </div>
  );
}
