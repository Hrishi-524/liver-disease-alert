import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  Activity,
  Upload,
  FileText,
  Clock,
  Award,
  ShieldAlert,
  Sliders,
  FileSpreadsheet
} from 'lucide-react';

import Overview from './components/Overview';
import NewAssessment from './components/NewAssessment';
import AssessmentResult from './components/AssessmentResult';
import AssessmentHistory from './components/AssessmentHistory';
import ModelEvidence from './components/ModelEvidence';
import BatchScreening from './components/BatchScreening';

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

export default function App() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'assessment' | 'result' | 'history' | 'evidence' | 'batch'
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [presets, setPresets] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [isSavedInHistory, setIsSavedInHistory] = useState(false);

  useEffect(() => {
    // Fetch initial model metadata and presets
    fetch('/api/info')
      .then(res => res.json())
      .then(data => setModelInfo(data))
      .catch(err => console.warn('Could not fetch model info:', err));

    fetch('/api/presets')
      .then(res => res.json())
      .then(data => setPresets(data))
      .catch(err => console.warn('Could not fetch presets:', err));

    fetch('/api/metrics')
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(err => console.warn('Could not fetch metrics:', err));
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
    }
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM);
    setError(null);
  };

  const handlePredict = async (dataToPredict = formData) => {
    setLoading(true);
    setError(null);
    setIsSavedInHistory(false);

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToPredict),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Prediction request failed.');
      }

      const data = await res.json();
      setResult(data);
      setActiveTab('result');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToHistory = () => {
    if (!result || isSavedInHistory) return;
    const historyItem = {
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString(),
      patient_values: { ...formData },
      model_score: result.model_score,
      risk_band: result.risk_band,
      summary: result.summary,
      feature_explanations: result.feature_explanations || [],
      out_of_bounds_warnings: result.out_of_bounds_warnings || [],
    };
    setSessionHistory(prev => [historyItem, ...prev]);
    setIsSavedInHistory(true);
  };

  const handleSelectFromHistory = (item) => {
    setFormData(item.patient_values);
    setResult({
      model_score: item.model_score,
      model_score_pct: `${(item.model_score * 100).toFixed(1)}%`,
      risk_band: item.risk_band,
      summary: item.summary,
      feature_explanations: item.feature_explanations,
      out_of_bounds_warnings: item.out_of_bounds_warnings,
    });
    setIsSavedInHistory(true);
    setActiveTab('result');
  };

  const handleClearHistory = () => {
    setSessionHistory([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Top Clinical Disclaimer Notice */}
      <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-2 text-xs text-amber-950 flex items-center justify-between shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Educational Screening Prototype:</strong> Evaluates routine LFT biomarker patterns against historical research data. Not a medical diagnostic device. Always consult a licensed healthcare professional.
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo / Brand */}
          <div
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-slate-900 tracking-tight">HepatoRisk AI</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/50">
                  Screening Assistant
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Liver Health Decision-Support & Pattern Evaluation</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-1.5 text-xs sm:text-sm font-semibold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-2 rounded-xl transition-all ${
                activeTab === 'overview'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Overview
            </button>

            <button
              onClick={() => setActiveTab('assessment')}
              className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'assessment' || activeTab === 'result'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>New Assessment</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Session History</span>
              {sessionHistory.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">
                  {sessionHistory.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('evidence')}
              className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'evidence'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Award className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Model & Evidence</span>
            </button>

            <button
              onClick={() => setActiveTab('batch')}
              className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'batch'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-400" />
              <span className="hidden md:inline">Batch Screening</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'overview' && (
          <Overview
            onStartAssessment={() => setActiveTab('assessment')}
            sessionHistory={sessionHistory}
            onSelectTab={setActiveTab}
          />
        )}

        {activeTab === 'assessment' && (
          <NewAssessment
            formData={formData}
            onInputChange={handleInputChange}
            onSubmit={handlePredict}
            loading={loading}
            error={error}
            presets={presets}
            onSelectPreset={handlePresetSelect}
            onReset={handleReset}
          />
        )}

        {activeTab === 'result' && (
          <AssessmentResult
            result={result}
            patientValues={formData}
            onNewAssessment={() => setActiveTab('assessment')}
            onSaveToHistory={handleSaveToHistory}
            isSaved={isSavedInHistory}
          />
        )}

        {activeTab === 'history' && (
          <AssessmentHistory
            history={sessionHistory}
            onSelectAssessment={handleSelectFromHistory}
            onClearHistory={handleClearHistory}
            onStartNew={() => setActiveTab('assessment')}
          />
        )}

        {activeTab === 'evidence' && (
          <ModelEvidence
            modelInfo={modelInfo}
            metrics={metrics}
          />
        )}

        {activeTab === 'batch' && (
          <BatchScreening />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 sm:px-8 text-center text-xs text-slate-400 space-y-1">
        <p>HepatoRisk AI • Educational Liver Health Screening Assistant • Powered by ILPD Clinical Research Data</p>
        <p className="text-[11px] text-slate-400">
          Not for autonomous diagnosis, emergency triage, or clinical treatment decisions.
        </p>
      </footer>
    </div>
  );
}
