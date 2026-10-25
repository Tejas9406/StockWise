import React, { useState, useEffect } from 'react';
import { importService } from '../../services/importService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { FeatureExplainer } from '../../components/common/FeatureExplainer';
import {
  Database,
  UploadCloud,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Check,
  Sparkles,
} from 'lucide-react';

const DATASET_TYPES = [
  { id: 'RETAILER_STOCK', label: 'All-in-One Retailer List', desc: 'Auto-allocates Stores, Products, Batches & Sales directly into Database' },
  { id: 'SALES', label: 'Sales History', desc: 'Point-of-sale store demand transactions' },
  { id: 'INVENTORY', label: 'Current Inventory', desc: 'Warehouse and retail store stock levels' },
  { id: 'PRODUCTS', label: 'Product Catalog', desc: 'SKUs, categories, safety stock, shelf life' },
  { id: 'LOCATIONS', label: 'Warehouses & Stores', desc: 'Fulfillment nodes and retail locations' },
  { id: 'BATCHES', label: 'Batches & Expiry', desc: 'Production batches with shelf life for FEFO' },
];

export const DataHealth = () => {
  const [healthData, setHealthData] = useState(null);
  const [importHistory, setImportHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active sub-tab: 'health', 'import', 'history'
  const [activeTab, setActiveTab] = useState('import');

  // CSV Upload & Validation states
  const [selectedDataset, setSelectedDataset] = useState('RETAILER_STOCK');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [importSuccess, setImportSuccess] = useState(null);

  const fetchHealthAndHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthRes, historyRes] = await Promise.all([
        importService.getDataHealth(),
        importService.getImportHistory(),
      ]);

      if (healthRes.success) setHealthData(healthRes.data);
      if (historyRes.success) setImportHistory(historyRes.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load data health metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthAndHistory();
  }, []);

  const handleDownloadTemplate = async (type = selectedDataset) => {
    try {
      await importService.downloadTemplate(type);
    } catch (err) {
      alert('Failed to download template: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      setValidationResult(null);
      setImportSuccess(null);
    }
  };

  const handleValidateFile = async () => {
    if (!uploadedFile) return;
    setValidating(true);
    setValidationResult(null);
    setImportSuccess(null);
    try {
      const res = await importService.previewAndValidateCsv(uploadedFile, selectedDataset);
      if (res.success) {
        setValidationResult(res.data);
      }
    } catch (err) {
      alert('File validation error: ' + (err.response?.data?.message || err.message));
    } finally {
      setValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!validationResult || !validationResult.normalizedRows) return;
    setConfirming(true);
    try {
      const res = await importService.confirmImport({
        datasetType: validationResult.datasetType,
        filename: validationResult.filename,
        rows: validationResult.normalizedRows,
        columnMapping: validationResult.columnMapping,
      });

      if (res.success) {
        setImportSuccess(res.message);
        setUploadedFile(null);
        setValidationResult(null);
        fetchHealthAndHistory();
      }
    } catch (err) {
      alert('Failed to persist import: ' + (err.response?.data?.message || err.message));
    } finally {
      setConfirming(false);
    }
  };

  if (loading && !healthData) {
    return <LoadingSpinner text="Checking Database Freshness & Import Logs..." />;
  }
  if (error && !healthData) {
    return <ErrorState message={error} onRetry={fetchHealthAndHistory} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data Hub & Retailer Datasets</h1>
            <Badge variant="emerald" size="sm">Dynamic Ingestion</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic CSV Ingestion engine with automatic Store & Product catalog allocation into PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchHealthAndHistory}
            disabled={loading}
            icon={RefreshCw}
          >
            Refresh Status
          </Button>
        </div>
      </div>

      {/* Plain-English Feature Guide */}
      <FeatureExplainer
        storageKey="data_health"
        badge="Data Pipeline & Dataset Hub"
        title="Dynamic Retailer Dataset Ingestion & Automatic Database Allocation"
        purpose="Allows you or retail partners to upload FMCG stock and sales lists in CSV format. The system automatically creates new store locations, registers new product SKUs, updates stock counts, and seeds daily sales with zero manual database entries."
        whyItMatters="Real distributors receive daily spreadsheets from hundreds of retail outlets. Having an automated ingestion engine means any new product or retail store is immediately integrated into AI demand forecasts and replenishment schedules."
        suggestedAction="Download the pre-formatted All-in-One Retailer template or upload your retailer file below. Validate the data and click Confirm to immediately refresh the entire platform."
        actionLink="/manager/recommendations"
        actionText="View Live Replenishment Planner"
      />

      {/* System Planning Readiness Banner */}
      {healthData && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            healthData.readyForPlanning
              ? 'bg-emerald-50/80 border-emerald-200'
              : 'bg-amber-50/80 border-amber-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                healthData.readyForPlanning
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-600 text-white'
              }`}
            >
              {healthData.readyForPlanning ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {healthData.readyForPlanning
                    ? 'Planning Engine Status: READY'
                    : 'Planning Engine Status: ATTENTION REQUIRED'}
                </h3>
                <Badge variant={healthData.readyForPlanning ? 'emerald' : 'amber'} size="xs">
                  {healthData.overallStatus}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {healthData.systemNotice}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5 Dataset Health Cards */}
      {healthData && healthData.datasets && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {healthData.datasets.map((ds) => {
            const isHealthy = ds.status === 'HEALTHY';
            const isWarning = ds.status === 'WARNING';
            const isStale = ds.status === 'STALE';

            return (
              <div
                key={ds.datasetType}
                className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {ds.label}
                    </span>
                    <Badge
                      variant={
                        isHealthy ? 'emerald' : isWarning ? 'amber' : isStale ? 'slate' : 'rose'
                      }
                      size="xs"
                    >
                      {ds.status}
                    </Badge>
                  </div>

                  <div className="mt-3">
                    <div className="text-2xl font-bold text-slate-900 font-mono">
                      {ds.rowCount.toLocaleString()}
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      {ds.details || 'records persisted'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 space-y-1">
                  {ds.lastUpdated && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Latest: {new Date(ds.lastUpdated).toLocaleDateString()}</span>
                    </div>
                  )}
                  {ds.warnings && ds.warnings.length > 0 && (
                    <p className="text-amber-700 font-medium text-[10px] leading-tight pt-1">
                      ⚠ {ds.warnings[0]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('import')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'import'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          CSV Upload & Safe Validation
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'history'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Import Audit History ({importHistory.length})
        </button>
      </div>

      {/* TAB 1: CSV Upload & Validation */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {importSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{importSuccess}</span>
              </div>
              <button onClick={() => setImportSuccess(null)} className="text-emerald-600 underline">
                Dismiss
              </button>
            </div>
          )}

          {/* Dataset Type Picker */}
          <Card className="border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">1. Select Target Dataset Type</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                StockWise ensures row-level schema validation matching your existing MongoDB models.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {DATASET_TYPES.map((dt) => {
                const isSelected = selectedDataset === dt.id;
                return (
                  <button
                    key={dt.id}
                    onClick={() => {
                      setSelectedDataset(dt.id);
                      setUploadedFile(null);
                      setValidationResult(null);
                    }}
                    className={`p-3.5 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{dt.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">{dt.desc}</p>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Need the official structure? Download the pre-formatted CSV template.
              </span>
              <Button
                variant="secondary"
                size="xs"
                icon={Download}
                onClick={() => handleDownloadTemplate(selectedDataset)}
              >
                Download {selectedDataset} Template
              </Button>
            </div>
          </Card>

          {/* Upload & Preview Section */}
          <Card className="border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">2. Upload CSV File & Run Row Validation</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every row is checked for data type, non-negative quantities, dates, and database reference existence.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <label className="flex-1 w-full border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-5 cursor-pointer text-center transition-colors bg-slate-50/50">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-slate-700 block">
                  {uploadedFile ? uploadedFile.name : 'Click to select CSV file'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {uploadedFile
                    ? `${(uploadedFile.size / 1024).toFixed(1)} KB selected`
                    : 'Supports CSV up to 5MB'}
                </span>
              </label>

              <div className="shrink-0 flex flex-col gap-2 w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="md"
                  disabled={!uploadedFile || validating}
                  onClick={handleValidateFile}
                  icon={CheckCircle2}
                >
                  {validating ? 'Validating...' : 'Validate & Preview'}
                </Button>

                {uploadedFile && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setUploadedFile(null);
                      setValidationResult(null);
                    }}
                  >
                    Clear File
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Validation Result Preview Card */}
          {validationResult && (
            <Card className="border-slate-200 shadow-sm p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Validation Summary</h3>
                    <Badge variant="slate" size="xs">{validationResult.filename}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dataset: {validationResult.datasetType} • Total Rows: {validationResult.totalRows}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="emerald" size="sm">
                    {validationResult.validRows} Valid
                  </Badge>
                  {validationResult.warningRows > 0 && (
                    <Badge variant="amber" size="sm">
                      {validationResult.warningRows} Warnings
                    </Badge>
                  )}
                  {validationResult.invalidRows > 0 && (
                    <Badge variant="rose" size="sm">
                      {validationResult.invalidRows} Errors
                    </Badge>
                  )}
                </div>
              </div>

              {/* Column Mapping Feedback */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Auto-Detected Column Mapping
                </span>
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(validationResult.columnMapping || {}).map(([csvCol, field]) => (
                    <span
                      key={csvCol}
                      className="bg-white border border-slate-200 px-2 py-1 rounded-lg font-mono text-[11px] text-slate-700 flex items-center gap-1.5"
                    >
                      <span className="font-semibold">{csvCol}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-emerald-700 font-bold">{field}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Row-Level Errors / Warnings Table */}
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                  Row-by-Row Inspection (Preview of first 50 rows)
                </span>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-2.5 px-3">Row #</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Validation Message</th>
                        <th className="py-2.5 px-3">Mapped Row Payload</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {validationResult.rowResults.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={
                            row.status === 'ERROR'
                              ? 'bg-rose-50/50'
                              : row.status === 'WARNING'
                              ? 'bg-amber-50/40'
                              : 'hover:bg-slate-50'
                          }
                        >
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                            #{row.rowNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant={
                                row.status === 'OK'
                                  ? 'emerald'
                                  : row.status === 'WARNING'
                                  ? 'amber'
                                  : 'rose'
                              }
                              size="xs"
                            >
                              {row.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 font-medium">
                            {row.message}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                            {JSON.stringify(row.data)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Import Confirmation Button */}
              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  {validationResult.invalidRows > 0
                    ? `⚠ ${validationResult.invalidRows} row(s) contain errors and will be safely excluded.`
                    : '✔ All rows passed validation safely.'}
                </span>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleConfirmImport}
                  disabled={confirming || validationResult.validRows === 0}
                  icon={Database}
                >
                  {confirming
                    ? 'Persisting to Database...'
                    : `Confirm & Import ${validationResult.validRows} Valid Rows`}
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: Import Audit History */}
      {activeTab === 'history' && (
        <Card className="border-slate-200 shadow-sm overflow-hidden p-0">
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Historical CSV Data Imports</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Auditable log of dataset imports, row statistics, and user attribution.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Dataset</th>
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4 text-right">Rows</th>
                  <th className="py-3 px-4 text-right">Imported</th>
                  <th className="py-3 px-4 text-right">Failed</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Imported By</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No import history recorded yet.
                    </td>
                  </tr>
                ) : (
                  importHistory.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <Badge variant="indigo" size="xs">{item.datasetType}</Badge>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">
                        {item.filename}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {item.totalRows}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold">
                        {item.importedRows}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600 font-semibold">
                        {item.failedRows || 0}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            item.status === 'IMPORTED'
                              ? 'emerald'
                              : item.status === 'PARTIAL'
                              ? 'amber'
                              : 'rose'
                          }
                          size="xs"
                        >
                          {item.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="font-medium">{item.importedBy?.name || 'System'}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {item.importedBy?.email || ''}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
