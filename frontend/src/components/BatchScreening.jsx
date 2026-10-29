import React, { useState } from 'react';
import {
  Upload,
  Download,
  Activity,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

export default function BatchScreening() {
  const [batchFile, setBatchFile] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState(null);

  const handleBatchUpload = async (e) => {
    e.preventDefault();
    if (!batchFile) return;
    setBatchLoading(true);
    setBatchError(null);

    const data = new FormData();
    data.append('file', batchFile);

    try {
      const res = await fetch('/api/batch', {
        method: 'POST',
        body: data,
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || 'Batch processing failed.');
      }

      const json = await res.json();
      setBatchResults(json);
    } catch (err) {
      setBatchError(err.message);
    } finally {
      setBatchLoading(false);
    }
  };

  const downloadBatchCSV = () => {
    if (!batchResults || !batchResults.records) return;
    const items = batchResults.records;
    const header = Object.keys(items[0]).join(',');
    const rows = items.map(obj => Object.values(obj).join(',')).join('\n');
    const csvContent = 'data:text/csv;charset=utf-8,' + header + '\n' + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'screened_patient_cohort.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Batch Patient CSV Screening</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Screen an entire cohort of patient records simultaneously by uploading a standardized CSV file.
          </p>
        </div>

        <form onSubmit={handleBatchUpload} className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-blue-400 transition-all bg-slate-50/50">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {batchFile ? batchFile.name : 'Select or drag & drop patient cohort CSV'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Expected columns: Age, Gender, Total_Bilirubin, Direct_Bilirubin, Alkphos, Sgpt, Sgot, Total_Protiens, Albumin, A/G Ratio
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setBatchFile(e.target.files[0])}
              className="mt-4 text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="submit"
              disabled={!batchFile || batchLoading}
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all text-xs sm:text-sm flex items-center gap-2 shadow-xs"
            >
              {batchLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Cohort...</span>
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  <span>Screen Uploaded Cohort</span>
                </>
              )}
            </button>

            {batchResults && (
              <button
                type="button"
                onClick={downloadBatchCSV}
                className="px-4 py-2.5 rounded-xl font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all text-xs sm:text-sm flex items-center gap-1.5"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Export Annotated CSV</span>
              </button>
            )}
          </div>
        </form>

        {batchError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>{batchError}</div>
          </div>
        )}
      </div>

      {batchResults && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-2xl font-black text-slate-900">{batchResults.total_records}</div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">Total Screened</div>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
              <div className="text-2xl font-black text-rose-700">{batchResults.high_risk_count}</div>
              <div className="text-xs font-semibold text-rose-600 mt-0.5">High Similarity</div>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
              <div className="text-2xl font-black text-amber-700">{batchResults.medium_risk_count}</div>
              <div className="text-xs font-semibold text-amber-600 mt-0.5">Medium Similarity</div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
              <div className="text-2xl font-black text-emerald-700">{batchResults.low_risk_count}</div>
              <div className="text-xs font-semibold text-emerald-600 mt-0.5">Low Similarity</div>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Risk Band</th>
                  <th className="py-2.5 px-3">Model Score</th>
                  <th className="py-2.5 px-3">Demographics</th>
                  <th className="py-2.5 px-3">Total Bilirubin</th>
                  <th className="py-2.5 px-3">ALT</th>
                  <th className="py-2.5 px-3">AST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batchResults.records.slice(0, 50).map((row) => (
                  <tr key={row.patient_id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-semibold text-slate-700">#{row.patient_id}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          row.risk_band === 'High'
                            ? 'bg-rose-100 text-rose-700'
                            : row.risk_band === 'Medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {row.risk_band}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {(row.score * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{row.age} yo / {row.gender}</td>
                    <td className="py-2.5 px-3 text-slate-600">{row.total_bilirubin} mg/dL</td>
                    <td className="py-2.5 px-3 text-slate-600">{row.alt} IU/L</td>
                    <td className="py-2.5 px-3 text-slate-600">{row.ast} IU/L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
