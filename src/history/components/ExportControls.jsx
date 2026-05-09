/**
 * ExportControls — CSV and JSON export buttons for the history page.
 *
 * Props:
 *   records — array of (filtered) run records to export
 *   disabled — boolean, disables both buttons when no records
 */
import { FileSpreadsheet, FileJson, Upload } from 'lucide-react';
import { recordsToCSV, downloadFile, exportHistoryJSON } from '../../shared/lib/exportUtils';

export default function ExportControls({ records = [], disabled = false, onImportClick }) {
  const handleExportCSV = () => {
    const csv = recordsToCSV(records);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadFile(csv, `orf-history-${timestamp}.csv`, 'text/csv');
  };

  const handleExportJSON = () => {
    const json = exportHistoryJSON(records);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadFile(json, `orf-history-${timestamp}.json`, 'application/json');
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleExportCSV}
        disabled={disabled}
        title="Export filtered history as CSV"
        className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-slate-400 hover:text-slate-200 hover:bg-slate-800"
      >
        <FileSpreadsheet className="w-4 h-4" />
        Export CSV
      </button>
      <button
        type="button"
        onClick={handleExportJSON}
        disabled={disabled}
        title="Export filtered history as JSON"
        className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-slate-400 hover:text-slate-200 hover:bg-slate-800"
      >
        <FileJson className="w-4 h-4" />
        Export JSON
      </button>
      {onImportClick && (
        <button
          type="button"
          onClick={onImportClick}
          title="Import history from JSON file"
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        >
          <Upload className="w-4 h-4" />
          Import
        </button>
      )}
    </div>
  );
}
