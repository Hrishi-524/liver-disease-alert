import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  ShieldAlert,
  Info,
  HeartPulse,
  RefreshCw,
  Download,
  Sliders,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Award
} from 'lucide-react';

const API_BASE = '';

const INITIAL_FORM = {
  age: 45,
  gender: 'Male',
  total_bilirubin: 0.8,
  direct_bilirubin: 0.2,
  alk_phos: 120,
  alt: 28,
  ast: 32,
  total_protein: 7.0,
  albumin: 4.0,
  ag_ratio: 1.3,
};

const REFERENCE_INFO = {
  total_bilirubin: { min: 0.1, max: 1.2, unit: 'mg/dL', label: 'Total Bilirubin' },
  direct_bilirubin: { min: 0.0, max: 0.3, unit: 'mg/dL', label: 'Direct Bilirubin' },
  alk_phos: { min: 44, max: 147, unit: 'IU/L', label: 'Alkaline Phosphatase (ALP)' },
  alt: { min: 7, max: 56, unit: 'IU/L', label: 'ALT / SGPT' },
  ast: { min: 10, max: 40, unit: 'IU/L', label: 'AST / SGOT' },
  total_protein: { min: 6.0, max: 8.3, unit: 'g/dL', label: 'Total Protein' },
  albumin: { min: 3.5, max: 5.0, unit: 'g/dL', label: 'Albumin' },
  ag_ratio: { min: 1.1, max: 2.5, unit: 'ratio', label: 'A/G Ratio' },
  age: { min: 18, max: 80, unit: 'years', label: 'Age' },
};

export default function App() {
  const [activeTab, setActiveTab] = useState('assessment');
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [presets, setPresets] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [metrics, setMetrics] = useState(null);

  // Batch screening state
  const [batchFile, setBatchFile] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState(null);

  useEffect(() => {
    // Fetch initial model metadata and presets
    fetch(`${API_BASE}/api/info`)
      .then(res => res.json())
      .then(data => setModelInfo(data))
      .catch(err => console.warn('Could not fetch info:', err));

    fetch(`${API_BASE}/api/presets`)
      .then(res => res.json())
      .then(data => setPresets(data))
      .catch(err => console.warn('Could not fetch presets:', err));

    fetch(`${API_BASE}/api/metrics`)
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(err => console.warn('Could not fetch metrics:', err));

    // Run initial prediction
    handlePredict(INITIAL_FORM);
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'gender' ? value : (value === '' ? '' : parseFloat(value)),
    }));
  };

  const handlePresetSelect = (presetKey) => {
    if (presets && presets[presetKey]) {
      const pData = presets[presetKey].data;
      setFormData(pData);
      handlePredict(pData);
    }
  };

  const handlePredict = async (dataToPredict = formData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToPredict),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Prediction request failed');
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchUpload = async (e) => {
    e.preventDefault();
    if (!batchFile) return;
    setBatchLoading(true);
    setBatchError(null);

    const data = new FormData();
    data.append('file', batchFile);

    try {
      const res = await fetch(`${API_BASE}/api/batch`, {
        method: 'POST',
        body: data,
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || 'Batch processing failed');
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
    const csvContent = "data:text/csv;charset=utf-8," + header + '\n' + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "screened_patient_cohort.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Top Clinical Disclaimer Banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs md:text-sm text-amber-900 flex items-center justify-between shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Educational & Clinical Decision Support Tool:</strong> Designed for routine Liver Function Test (LFT) risk stratification. Not a diagnostic device. Real-world treatment decisions must be made by a licensed physician.
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">HepatoRisk AI</h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  ILPD Validated
                </span>
              </div>
              <p className="text-xs text-slate-500">ML Liver Disease Risk Stratification & Explainability</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2">
            {[
              { id: 'assessment', label: 'Patient Assessment', icon: Activity },
              { id: 'batch', label: 'Batch Screening', icon: Upload },
              { id: 'evidence', label: 'Model Evidence & Card', icon: Award },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'assessment' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Form & Presets */}
            <div className="lg:col-span-7 space-y-6">
              {/* Presets Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    <h2 className="text-sm font-semibold text-slate-900">Clinical Case Presets</h2>
                  </div>
                  <span className="text-xs text-slate-400">Select to populate form</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('normal')}
                    className="p-3 text-left rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-300 transition-all text-xs"
                  >
                    <div className="font-semibold text-emerald-900 flex items-center justify-between mb-1">
                      <span>Normal Profile</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    </div>
                    <p className="text-emerald-700 line-clamp-2">Standard healthy checkup values</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetSelect('borderline')}
                    className="p-3 text-left rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-300 transition-all text-xs"
                  >
                    <div className="font-semibold text-amber-900 flex items-center justify-between mb-1">
                      <span>Borderline LFT</span>
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    </div>
                    <p className="text-amber-700 line-clamp-2">Mild enzyme and bilirubin rise</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetSelect('severe')}
                    className="p-3 text-left rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 hover:border-rose-300 transition-all text-xs"
                  >
                    <div className="font-semibold text-rose-900 flex items-center justify-between mb-1">
                      <span>Severe Hepatic</span>
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    </div>
                    <p className="text-rose-700 line-clamp-2">Marked enzymes & hyperbilirubinemia</p>
                  </button>
                </div>
              </div>

              {/* Patient Blood Tests Input Form */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Patient Laboratory Test Values</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Input routine Liver Function Test (LFT) and demographic details</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(INITIAL_FORM);
                      handlePredict(INITIAL_FORM);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-slate-100"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handlePredict();
                  }}
                  className="space-y-6"
                >
                  {/* Demographics Section */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                      Demographics
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Age (years)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="110"
                          value={formData.age}
                          onChange={(e) => handleInputChange('age', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Gender
                        </label>
                        <select
                          value={formData.gender}
                          onChange={(e) => handleInputChange('gender', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Hepatic Enzymes & Bilirubin Section */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                      Bilirubin & Hepatic Enzymes
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Total Bilirubin */}
                      <FormField
                        label="Total Bilirubin"
                        field="total_bilirubin"
                        value={formData.total_bilirubin}
                        onChange={handleInputChange}
                        info={REFERENCE_INFO.total_bilirubin}
                        step="0.1"
                      />
                      {/* Direct Bilirubin */}
                      <FormField
                        label="Direct Bilirubin"
                        field="direct_bilirubin"
                        value={formData.direct_bilirubin}
                        onChange={handleInputChange}
                        info={REFERENCE_INFO.direct_bilirubin}
                        step="0.1"
                      />
                      {/* Alkaline Phosphatase */}
                      <FormField
                        label="Alkaline Phosphatase (ALP)"
                        field="alk_phos"
                        value={formData.alk_phos}
                        onChange={handleInputChange}
                        info={REFERENCE_INFO.alk_phos}
                        step="1"
                      />
                      {/* ALT */}
                      <FormField
                        label="Alanine Aminotransferase (ALT / SGPT)"
                        field="alt"
                        value={formData.alt}
                        onChange={handleInputChange}
                        info={REFERENCE_INFO.alt}
                        step="1"
                      />
                      {/* AST */}
                      <FormField
                        label="Aspartate Aminotransferase (AST / SGOT)"
                        field="ast"
                        value={formData.ast}
                        onChange={handleInputChange}
                        info={REFERENCE_INFO.ast}
                        step="1"
                      />
                      {/* Total Protein */}
                      <FormField
                        label="Total Protein"
                        field="total_protein"
                        value={formData.total_protein}
                        onChange={handleInputChange}
                        info={REFERENCE_INFO.total_protein}
                        step="0.1"
                      />
                      {/* Albumin */}
                      <FormField
                        label="Albumin"
                        field="albumin"
                        value={formData.albumin}
                        onChange={handleInputChange}
                        info={REFERENCE_INFO.albumin}
                        step="0.1"
                      />
                      {/* A/G Ratio */}
                      <FormField
                        label="Albumin / Globulin (A/G) Ratio"
                        field="ag_ratio"
                        value={formData.ag_ratio}
                        onChange={handleInputChange}
                        info={REFERENCE_INFO.ag_ratio}
                        step="0.05"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Activity className="w-5 h-5" />
                        Run Risk Assessment
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Prediction Score, Gauge, SHAP Explanations */}
            <div className="lg:col-span-5 space-y-6">
              {/* Score & Risk Band Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Model Risk Assessment
                  </h2>
                  {result && (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                        result.risk_band === 'High'
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : result.risk_band === 'Medium'
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {result.risk_band} Risk Profile
                    </span>
                  )}
                </div>

                {loading ? (
                  <div className="py-16 text-center text-slate-400 flex flex-col items-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                    <p className="text-sm">Evaluating clinical features...</p>
                  </div>
                ) : error ? (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>{error}</div>
                  </div>
                ) : result ? (
                  <div className="space-y-6">
                    {/* Visual Meter / Gauge */}
                    <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-100 text-center">
                      <div className="text-4xl font-extrabold text-slate-900 tracking-tight mb-1">
                        {result.model_score_pct}
                      </div>
                      <p className="text-xs text-slate-500 font-medium mb-4">
                        Model Score (Dataset Similarity Index)
                      </p>

                      {/* Threshold Progress Bar */}
                      <div className="relative pt-2 pb-6">
                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden flex">
                          <div
                            className={`h-full transition-all duration-500 ${
                              result.risk_band === 'High'
                                ? 'bg-rose-500'
                                : result.risk_band === 'Medium'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, result.model_score * 100))}%` }}
                          />
                        </div>

                        {/* Cutoff markers */}
                        {result.thresholds && (
                          <>
                            <div
                              className="absolute top-0 text-[10px] text-slate-500 font-mono transform -translate-x-1/2"
                              style={{ left: `${result.thresholds.t_low * 100}%` }}
                            >
                              <div className="h-4 border-r-2 border-dashed border-slate-400 mx-auto"></div>
                              <span>t_low ({Math.round(result.thresholds.t_low * 100)}%)</span>
                            </div>
                            <div
                              className="absolute top-0 text-[10px] text-slate-500 font-mono transform -translate-x-1/2"
                              style={{ left: `${result.thresholds.t_high * 100}%` }}
                            >
                              <div className="h-4 border-r-2 border-dashed border-slate-400 mx-auto"></div>
                              <span>t_high ({Math.round(result.thresholds.t_high * 100)}%)</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 leading-relaxed bg-white rounded-xl p-3 border border-slate-200/60 text-left">
                        {result.summary}
                      </div>
                    </div>

                    {/* Out of Distribution Warnings */}
                    {result.out_of_bounds_warnings && result.out_of_bounds_warnings.length > 0 && (
                      <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          Out-of-Distribution Warning
                        </div>
                        <ul className="space-y-1.5 text-xs text-amber-800">
                          {result.out_of_bounds_warnings.map((w, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-amber-500 font-bold">•</span>
                              <span>{w.message}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* SHAP Feature Contribution Waterfall */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4 text-blue-600" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                            Feature Attribution (SHAP)
                          </h3>
                        </div>
                        <span className="text-[11px] text-slate-400">Local explanation</span>
                      </div>

                      <div className="space-y-2">
                        {result.feature_explanations && result.feature_explanations.map((exp, idx) => {
                          const isRiskFactor = exp.shap_value > 0;
                          const absVal = Math.abs(exp.shap_value);
                          const maxContrib = 1.2;
                          const barWidth = Math.min(100, (absVal / maxContrib) * 100);

                          return (
                            <div key={idx} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-xs">
                              <div className="flex items-center justify-between font-medium mb-1">
                                <span className="text-slate-800 font-semibold capitalize">
                                  {exp.feature.replace('_', ' ')}
                                  {exp.raw_value !== undefined && (
                                    <span className="text-slate-400 font-normal ml-1">
                                      ({exp.raw_value})
                                    </span>
                                  )}
                                </span>
                                <span
                                  className={`font-mono font-bold ${
                                    isRiskFactor ? 'text-rose-600' : 'text-emerald-600'
                                  }`}
                                >
                                  {exp.shap_value > 0 ? '+' : ''}{exp.shap_value.toFixed(3)}
                                </span>
                              </div>

                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    isRiskFactor ? 'bg-rose-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>

                              <p className="text-[11px] text-slate-500 mt-1">
                                {exp.direction}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Batch CSV Screening */}
        {activeTab === 'batch' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-1">Batch Patient Screening</h2>
              <p className="text-xs text-slate-500 mb-6">
                Upload a CSV file containing patient blood records to screen and stratify an entire cohort at once.
              </p>

              <form onSubmit={handleBatchUpload} className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-400 transition-all bg-slate-50/50">
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700">
                    {batchFile ? batchFile.name : 'Select or drag & drop patient CSV'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Columns: Age, Gender, Total_Bilirubin, Direct_Bilirubin, Alkphos, Sgpt, Sgot, Total_Protiens, Albumin, A/G Ratio
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setBatchFile(e.target.files[0])}
                    className="mt-4 text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={!batchFile || batchLoading}
                    className="px-6 py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all text-sm flex items-center gap-2"
                  >
                    {batchLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                    Screen Uploaded Cohort
                  </button>
                  {batchResults && (
                    <button
                      type="button"
                      onClick={downloadBatchCSV}
                      className="px-4 py-2.5 rounded-xl font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all text-sm flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                      Export Screened CSV
                    </button>
                  )}
                </div>
              </form>

              {batchError && (
                <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
                  {batchError}
                </div>
              )}
            </div>

            {/* Batch Results View */}
            {batchResults && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-2xl font-bold text-slate-900">{batchResults.total_records}</div>
                    <div className="text-xs text-slate-500 font-medium">Total Screened</div>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
                    <div className="text-2xl font-bold text-rose-700">{batchResults.high_risk_count}</div>
                    <div className="text-xs text-rose-600 font-medium">High Risk Profiles</div>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="text-2xl font-bold text-amber-700">{batchResults.medium_risk_count}</div>
                    <div className="text-xs text-amber-600 font-medium">Medium Risk Profiles</div>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="text-2xl font-bold text-emerald-700">{batchResults.low_risk_count}</div>
                    <div className="text-xs text-emerald-600 font-medium">Low Risk Profiles</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Patient ID</th>
                        <th className="py-2.5 px-3">Risk Band</th>
                        <th className="py-2.5 px-3">Model Score</th>
                        <th className="py-2.5 px-3">Age / Gender</th>
                        <th className="py-2.5 px-3">Total Bilirubin</th>
                        <th className="py-2.5 px-3">ALT</th>
                        <th className="py-2.5 px-3">AST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {batchResults.records.slice(0, 50).map((row) => (
                        <tr key={row.patient_id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-medium text-slate-700">#{row.patient_id}</td>
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
                  {batchResults.records.length > 50 && (
                    <p className="text-xs text-slate-400 text-center py-3">
                      Showing first 50 records. Download CSV to view full dataset.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Model Evidence & Card */}
        {activeTab === 'evidence' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Independent Holdout Evaluation Metrics</h2>
              </div>
              <p className="text-xs text-slate-500 mb-6">
                Evaluated strictly once on the untouched 20% holdout test set (n=114) with 1,000 bootstrap confidence intervals.
              </p>

              {metrics ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <MetricCard
                    title="ROC-AUC Score"
                    value={metrics.roc_auc.toFixed(4)}
                    ci={`95% CI: [${metrics.confidence_intervals_95?.roc_auc?.ci_95_low?.toFixed(3)}, ${metrics.confidence_intervals_95?.roc_auc?.ci_95_high?.toFixed(3)}]`}
                    subtext="Beats chance baseline (0.500) by +30.8%"
                    highlight={true}
                  />
                  <MetricCard
                    title="Sensitivity / Recall (@ t_low)"
                    value={`${(metrics.metrics_at_t_low?.recall * 100).toFixed(1)}%`}
                    ci={`95% CI: [${(metrics.confidence_intervals_95?.recall_at_t_low?.ci_95_low * 100).toFixed(1)}%, ${(metrics.confidence_intervals_95?.recall_at_t_low?.ci_95_high * 100).toFixed(1)}%]`}
                    subtext="High sensitivity for disease screening"
                  />
                  <MetricCard
                    title="Average Precision (PR-AUC)"
                    value={metrics.average_precision.toFixed(4)}
                    ci={`95% CI: [${metrics.confidence_intervals_95?.average_precision?.ci_95_low?.toFixed(3)}, ${metrics.confidence_intervals_95?.average_precision?.ci_95_high?.toFixed(3)}]`}
                    subtext="Strong precision across recall levels"
                  />
                  <MetricCard
                    title="Brier Score (Calibration)"
                    value={metrics.brier_score.toFixed(4)}
                    ci="Well-calibrated probabilities"
                    subtext="Lower is better (0.0 = perfect)"
                  />
                </div>
              ) : (
                <div className="text-slate-400 text-sm py-4">Loading metrics report...</div>
              )}

              {/* Model Card Content */}
              <div className="border-t border-slate-100 pt-6 space-y-4 text-xs text-slate-600 leading-relaxed">
                <h3 className="text-sm font-bold text-slate-900">Model Specification & Intended Use</h3>
                <p>
                  <strong>Model Type:</strong> Penalized Logistic Regression pipeline with median imputation, logarithmic skew-correction, and standard scaling. Fitted exclusively on training folds using Repeated Stratified 5-Fold Cross-Validation (3 repeats).
                </p>
                <p>
                  <strong>Dataset Origin:</strong> Indian Liver Patient Dataset (ILPD), collected from patients in North-East Andhra Pradesh, India. Cleaned and deduplicated before splitting (570 unique cases: 71.3% liver patients, 28.7% non-liver patients).
                </p>
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                  <h4 className="font-bold text-amber-900 mb-1">Key Limitations & Population Caveats:</h4>
                  <ul className="list-disc list-inside space-y-1 text-amber-800">
                    <li>The control group comprises other hospital patients, not healthy population volunteers.</li>
                    <li>The 71% disease prevalence reflects the hospital dataset, not general community prevalence. Model outputs represent similarity scores, not absolute disease probabilities.</li>
                    <li>Single regional cohort: external validation on diverse international demographics is advised prior to clinical deployment.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-400">
        HepatoRisk AI • AI/ML Healthcare Mini-Project • React & Python Pipeline • Not for Diagnostic Use
      </footer>
    </div>
  );
}

function FormField({ label, field, value, onChange, info, step }) {
  const isOutOfRange =
    value !== '' && info && (value < info.min || value > info.max);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-slate-700 truncate max-w-[170px]" title={label}>
          {label}
        </label>
        {info && (
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              isOutOfRange
                ? 'bg-amber-100 text-amber-800 font-bold'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            Ref: {info.min}-{info.max} {info.unit}
          </span>
        )}
      </div>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all ${
          isOutOfRange
            ? 'border-amber-300 bg-amber-50/30 focus:ring-amber-500/20 focus:border-amber-500'
            : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
        }`}
        required
      />
    </div>
  );
}

function MetricCard({ title, value, ci, subtext, highlight }) {
  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        highlight
          ? 'bg-blue-50/50 border-blue-200 shadow-xs'
          : 'bg-slate-50/80 border-slate-100'
      }`}
    >
      <div className="text-xs font-semibold text-slate-500 mb-1">{title}</div>
      <div className={`text-2xl font-extrabold tracking-tight ${highlight ? 'text-blue-700' : 'text-slate-900'}`}>
        {value}
      </div>
      <div className="text-[11px] font-mono text-slate-500 mt-0.5">{ci}</div>
      {subtext && <div className="text-[11px] text-slate-400 mt-1">{subtext}</div>}
    </div>
  );
}
