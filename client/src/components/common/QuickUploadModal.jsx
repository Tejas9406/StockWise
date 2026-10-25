import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import { importService } from '../../services/importService';
import {
  UploadCloud,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Database,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

export const QuickUploadModal = ({
  isOpen,
  onClose,
  moduleTitle = 'CSV Dataset Ingestion',
  defaultDatasetType = 'RETAILER_STOCK',
  locationContext = null,
  onUploadSuccess = () => {},
}) => {
  const [datasetType, setDatasetType] = useState(defaultDatasetType);
  const [file, setFile] = useState(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (selectedFile) => {
    setFile(selectedFile);
    setValidationResult(null);
    setFeedback(null);
    setValidating(true);

    try {
      const res = await importService.previewAndValidateCsv(selectedFile, datasetType);
      if (res.success) {
        setValidationResult(res.data);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'CSV validation failed',
      });
    } finally {
      setValidating(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await importService.downloadTemplate(datasetType);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Template download failed: ' + (err.response?.data?.message || err.message),
      });
    }
  };

  const handleConfirm = async () => {
    if (!validationResult || !validationResult.normalizedRows) return;
    setImporting(true);
    setFeedback(null);

    try {
      const res = await importService.confirmImport({
        datasetType: validationResult.datasetType,
        filename: validationResult.filename,
        rows: validationResult.normalizedRows,
        columnMapping: validationResult.columnMapping,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message || 'Data successfully imported and database updated!',
        });
        onUploadSuccess();
        setTimeout(() => {
          handleReset();
          onClose();
        }, 1800);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Import persistence failed',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidationResult(null);
    setFeedback(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={moduleTitle} size="lg">
      <div className="space-y-4 text-xs sm:text-sm">
        {locationContext && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-medium">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Target Facility: <strong>{locationContext}</strong> (Inventory will auto-allocate here)</span>
          </div>
        )}

        {/* Dataset Type Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Format:</span>
            <div className="flex gap-1.5">
              {[
                { id: 'RETAILER_STOCK', label: 'All-in-One List' },
                { id: 'INVENTORY', label: 'Stock Counts' },
                { id: 'SALES', label: 'Sales Records' },
                { id: 'BATCHES', label: 'Batches (FEFO)' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setDatasetType(t.id);
                    handleReset();
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    datasetType === t.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sample Template</span>
          </button>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Drag & Drop Zone */}
        {!validationResult && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-3xl p-8 text-center bg-slate-50/60 hover:bg-emerald-50/20 transition-all cursor-pointer group"
            onClick={() => document.getElementById('quick-upload-input')?.click()}
          >
            <input
              id="quick-upload-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 mx-auto transition-colors">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="mt-3 text-xs font-bold text-slate-800">
              {validating ? 'Parsing and validating CSV schema...' : 'Drag & drop CSV file here, or click to browse'}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Accepts .csv spreadsheets. Auto-creates stores, SKUs, and inventory positions safely.
            </p>
          </div>
        )}

        {/* Validation Preview */}
        {validationResult && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-slate-900">{validationResult.filename}</p>
                  <p className="text-[11px] text-slate-500">
                    {validationResult.totalRows} rows detected • {validationResult.validRows} valid rows
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Change File"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview snippet table */}
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100/70 text-[10px] uppercase font-bold text-slate-500 sticky top-0">
                  <tr>
                    <th className="p-2">Row</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Action / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {validationResult.rowResults.slice(0, 10).map((row) => (
                    <tr key={row.rowNumber} className="hover:bg-slate-50">
                      <td className="p-2 font-mono text-[11px]">#{row.rowNumber}</td>
                      <td className="p-2">
                        <Badge variant={row.status === 'VALID' ? 'emerald' : row.status === 'WARNING' ? 'amber' : 'rose'} size="xs">
                          {row.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-slate-600 text-xs truncate max-w-xs">{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Auto-allocates missing stores and products directly in database
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleReset} disabled={importing}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirm}
                  disabled={importing || validationResult.validRows === 0}
                  icon={Database}
                >
                  {importing ? 'Saving to Database...' : `Confirm & Ingest (${validationResult.validRows} Rows)`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default QuickUploadModal;
