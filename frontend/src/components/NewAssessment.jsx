import React, { useState } from 'react';
import {
  Activity,
  Upload,
  FileText,
  Sliders,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info,
  Check
} from 'lucide-react';

const REFERENCE_INFO = {
  total_bilirubin: { min: 0.1, max: 1.2, unit: 'mg/dL', label: 'Total Bilirubin', abbrev: 'TB' },
  direct_bilirubin: { min: 0.0, max: 0.3, unit: 'mg/dL', label: 'Direct Bilirubin', abbrev: 'DB / Conjugated' },
  alk_phos: { min: 44, max: 147, unit: 'IU/L', label: 'Alkaline Phosphatase', abbrev: 'ALP' },
  alt: { min: 7, max: 56, unit: 'IU/L', label: 'Alanine Aminotransferase', abbrev: 'ALT / SGPT' },
  ast: { min: 10, max: 40, unit: 'IU/L', label: 'Aspartate Aminotransferase', abbrev: 'AST / SGOT' },
  total_protein: { min: 6.0, max: 8.3, unit: 'g/dL', label: 'Total Protein', abbrev: 'TP' },
  albumin: { min: 3.5, max: 5.0, unit: 'g/dL', label: 'Albumin', abbrev: 'ALB' },
  ag_ratio: { min: 1.1, max: 2.5, unit: 'ratio', label: 'Albumin/Globulin Ratio', abbrev: 'A/G Ratio' },
  age: { min: 18, max: 80, unit: 'years', label: 'Age', abbrev: 'Age' },
};

export default function NewAssessment({
  formData,
  onInputChange,
  onSubmit,
  loading,
  error,
  presets,
  onSelectPreset,
  onReset
}) {
  const [inputMode, setInputMode] = useState('manual'); // 'manual' | 'upload'
  const [uploadFile, setUploadFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setExtracting(true);
    setUploadError(null);

    const data = new FormData();
    data.append('file', uploadFile);

    try {
      const res = await fetch('/api/extract-report', {
        method: 'POST',
        body: data,
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || 'Failed to extract text from laboratory report.');
      }

      const json = await res.json();
      setExtractionResult(json);

      // Pre-fill form fields with any detected values
      if (json.extracted_values) {
        Object.entries(json.extracted_values).forEach(([k, v]) => {
          if (v !== null && v !== undefined) {
            onInputChange(k, v);
          }
        });
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setExtracting(false);
    }
  };

  const handleConfirmAndAssess = () => {
    onSubmit();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Mode Selection Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200/80 shadow-xs flex gap-2">
        <button
          type="button"
          onClick={() => setInputMode('manual')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            inputMode === 'manual'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Option A: Enter Values Manually</span>
        </button>

        <button
          type="button"
          onClick={() => setInputMode('upload')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            inputMode === 'upload'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Option B: Upload Lab Report (PDF / Text)</span>
        </button>
      </div>

      {/* OPTION B: Lab Report Upload Workflow */}
      {inputMode === 'upload' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">Upload Laboratory Report</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select a PDF or text report. The system will extract detected LFT measurements and display them for your confirmation.
            </p>
          </div>

          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 sm:p-8 text-center hover:border-blue-400 transition-all bg-slate-50/50">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                {uploadFile ? uploadFile.name : 'Choose a lab report file (.pdf or .txt)'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supported formats: PDF documents or clinical text exports
              </p>
              <input
                type="file"
                accept=".pdf,.txt"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="mt-4 text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="submit"
                disabled={!uploadFile || extracting}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-xs"
              >
                {extracting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Extracting Measurements...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Extract & Review Report</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {uploadError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>{uploadError}</div>
            </div>
          )}

          {/* Extraction Review Panel */}
          {extractionResult && (
            <div className="space-y-6 pt-4 border-t border-slate-100">
              <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-200/60 text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Extraction Summary: {extractionResult.detected_count} of 10 measurements detected</span>
                </div>
                <p className="text-blue-800/80 leading-relaxed">
                  {extractionResult.disclaimer}
                </p>
              </div>

              {/* Status Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(extractionResult.field_details).map(([key, item]) => {
                  const isDetected = item.status === 'detected';
                  return (
                    <div
                      key={key}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                        isDetected
                          ? 'bg-slate-50/80 border-slate-200'
                          : 'bg-amber-50/40 border-amber-200/80'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{item.label}</div>
                        <div className="text-[11px] text-slate-500">
                          {isDetected ? `Extracted: ${item.value} ${item.unit}` : 'Not found in document'}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          isDetected
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isDetected ? 'Detected' : 'Missing'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-between items-center">
                <span className="text-xs text-slate-500">
                  Review values in the form below before confirming.
                </span>
                <button
                  type="button"
                  onClick={handleConfirmAndAssess}
                  disabled={loading}
                  className="px-6 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-500/20 text-xs sm:text-sm flex items-center gap-2"
                >
                  <Activity className="w-4 h-4" />
                  <span>Confirm Values & Run Assessment</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Card (Manual Entry or Confirmation View) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        {/* Header & Clinical Presets */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {inputMode === 'upload' && extractionResult ? 'Confirm Laboratory Values' : 'Patient Laboratory Measurements'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Approximate reference ranges are shown as non-diagnostic informational guides.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Quick Example Presets */}
        <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>Quick Example Presets</span>
            </span>
            <span className="text-[11px] text-slate-400">Click to fill sample values</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onSelectPreset('normal')}
              className="p-2.5 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 text-left transition-all text-xs"
            >
              <div className="font-bold text-emerald-800 flex items-center justify-between">
                <span>Healthy Normal</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Values inside typical lab ranges</div>
            </button>

            <button
              type="button"
              onClick={() => onSelectPreset('borderline')}
              className="p-2.5 rounded-xl border border-amber-200 bg-white hover:bg-amber-50 text-left transition-all text-xs"
            >
              <div className="font-bold text-amber-800 flex items-center justify-between">
                <span>Borderline Elevated</span>
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Mild enzyme & bilirubin rise</div>
            </button>

            <button
              type="button"
              onClick={() => onSelectPreset('severe')}
              className="p-2.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-left transition-all text-xs"
            >
              <div className="font-bold text-rose-800 flex items-center justify-between">
                <span>High-Risk Presentation</span>
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Marked enzyme & bilirubin rise</div>
            </button>
          </div>
        </div>

        {/* Input Fields Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="space-y-6"
        >
          {/* Section 1: Demographics */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              1. Patient Demographics
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Age (years) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={formData.age ?? ''}
                  onChange={(e) => onInputChange('age', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.gender || 'Male'}
                  onChange={(e) => onInputChange('gender', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
                  required
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Bilirubin & Liver Enzymes */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              2. Bilirubin & Liver Enzymes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Total Bilirubin"
                abbrev="TB"
                field="total_bilirubin"
                value={formData.total_bilirubin}
                onChange={onInputChange}
                info={REFERENCE_INFO.total_bilirubin}
                step="0.1"
                required
              />

              <InputField
                label="Direct Bilirubin"
                abbrev="DB / Conjugated"
                field="direct_bilirubin"
                value={formData.direct_bilirubin}
                onChange={onInputChange}
                info={REFERENCE_INFO.direct_bilirubin}
                step="0.1"
                required
              />

              <InputField
                label="Alkaline Phosphatase"
                abbrev="ALP"
                field="alk_phos"
                value={formData.alk_phos}
                onChange={onInputChange}
                info={REFERENCE_INFO.alk_phos}
                step="1"
                required
              />

              <InputField
                label="Alanine Aminotransferase"
                abbrev="ALT / SGPT"
                field="alt"
                value={formData.alt}
                onChange={onInputChange}
                info={REFERENCE_INFO.alt}
                step="1"
                required
              />

              <InputField
                label="Aspartate Aminotransferase"
                abbrev="AST / SGOT"
                field="ast"
                value={formData.ast}
                onChange={onInputChange}
                info={REFERENCE_INFO.ast}
                step="1"
                required
              />
            </div>
          </div>

          {/* Section 3: Proteins */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              3. Serum Proteins & Ratios
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InputField
                label="Total Protein"
                abbrev="TP"
                field="total_protein"
                value={formData.total_protein}
                onChange={onInputChange}
                info={REFERENCE_INFO.total_protein}
                step="0.1"
                required
              />

              <InputField
                label="Albumin"
                abbrev="ALB"
                field="albumin"
                value={formData.albumin}
                onChange={onInputChange}
                info={REFERENCE_INFO.albumin}
                step="0.1"
                required
              />

              <InputField
                label="A/G Ratio"
                abbrev="A/G"
                field="ag_ratio"
                value={formData.ag_ratio}
                onChange={onInputChange}
                info={REFERENCE_INFO.ag_ratio}
                step="0.05"
                placeholder="Optional (imputed if missing)"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 shadow-md shadow-blue-500/20 transition-all text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Evaluating Clinical Patterns...</span>
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  <span>Calculate Risk Assessment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InputField({ label, abbrev, field, value, onChange, info, step, required, placeholder }) {
  const numVal = value !== '' && value !== null && value !== undefined ? parseFloat(value) : null;
  const isOutOfRange = numVal !== null && info && (numVal < info.min || numVal > info.max);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-semibold text-slate-700 truncate" title={label}>
          {label} {required && <span className="text-rose-500">*</span>}
          {abbrev && <span className="text-[10px] text-slate-400 font-normal ml-1">({abbrev})</span>}
        </label>
        {info && (
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              isOutOfRange
                ? 'bg-amber-100 text-amber-800 font-medium'
                : 'bg-slate-100 text-slate-500'
            }`}
            title="Approximate normal adult reference guide"
          >
            Ref: {info.min}-{info.max} {info.unit}
          </span>
        )}
      </div>

      <input
        type="number"
        step={step}
        value={value ?? ''}
        placeholder={placeholder || ''}
        onChange={(e) => onChange(field, e.target.value)}
        className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
          isOutOfRange
            ? 'border-amber-300 bg-amber-50/20 focus:ring-amber-500/20 focus:border-amber-500'
            : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
        }`}
        required={required}
      />
    </div>
  );
}
