import React from 'react';
import {
  Activity,
  ArrowRight,
  FileText,
  ShieldAlert,
  Sparkles,
  ClipboardCheck,
  HelpCircle,
  Clock,
  ExternalLink
} from 'lucide-react';

export default function Overview({ onStartAssessment, sessionHistory, onSelectTab }) {
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-2">
      {/* Hero Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            Educational Liver Health Screening Prototype
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Understand your routine liver blood tests with clarity.
          </h2>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            HepatoRisk AI is an educational decision-support assistant. It analyzes routine Liver Function Tests (LFTs)
            against an established clinical research cohort to identify patterns, highlight influential biomarkers,
            and provide plain-language explanations.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onStartAssessment}
              className="px-6 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-500/20 transition-all text-sm flex items-center gap-2 group"
            >
              <span>Start New Assessment</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => onSelectTab('evidence')}
              className="px-4 py-3 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all text-sm flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Explore Research & Evidence</span>
            </button>
          </div>
        </div>

        {/* Decorative background subtle circle */}
        <div className="absolute -top-12 -right-12 w-96 h-96 bg-blue-50/60 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Prominent Educational Notice */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-900">
            Important Notice: Screening Prototype, Not a Medical Diagnosis
          </p>
          <p className="text-amber-800/90 leading-relaxed">
            HepatoRisk AI evaluates statistical similarity to historical patient records in the Indian Liver Patient Dataset (ILPD).
            It cannot confirm, diagnose, or rule out liver disease. Do not make medical or treatment decisions based on this score.
            Always discuss your laboratory reports with a qualified physician or healthcare provider.
          </p>
        </div>
      </div>

      {/* 3-Step Workflow Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">How HepatoRisk AI Works</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            A transparent 3-step screening workflow designed for clarity and safety.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
              1
            </div>
            <h4 className="text-sm font-bold text-slate-900">Provide Laboratory Values</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Enter your routine Liver Function Test (LFT) numbers manually or upload a PDF/text lab report.
              Approximate reference ranges help guide data entry.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
              2
            </div>
            <h4 className="text-sm font-bold text-slate-900">Transparent Pattern Scoring</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your values are evaluated against research cohorts. The system assigns a calibrated risk band (Low, Medium, or High)
              and identifies which measurements increased or decreased the score.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
              3
            </div>
            <h4 className="text-sm font-bold text-slate-900">Plain-Language Explanation</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Generate an accessible plain-language summary powered by Groq AI, highlighting key observations,
              dataset limitations, and sensible next steps to discuss with your doctor.
            </p>
          </div>
        </div>
      </div>

      {/* Routine LFT Biomarkers Covered */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Activity className="w-4 h-4 text-blue-600" />
            <span>Biomarkers Analyzed</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            The screening model evaluates 8 routine biochemical markers: Total Bilirubin, Direct Bilirubin,
            Alkaline Phosphatase (ALP), ALT (SGPT), AST (SGOT), Total Protein, Albumin, and the A/G Ratio,
            along with Age and Gender.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <ClipboardCheck className="w-4 h-4 text-emerald-600" />
            <span>Privacy & Safety First</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            No patient records or personal health information are stored in an external database.
            Assessments exist solely in your local browser session and disappear when the window is closed.
          </p>
        </div>
      </div>

      {/* Recent Session History Preview (if any) */}
      {sessionHistory && sessionHistory.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Recent Session Assessments ({sessionHistory.length})</h3>
            </div>
            <button
              onClick={() => onSelectTab('history')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {sessionHistory.slice(0, 3).map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      item.risk_band === 'High'
                        ? 'bg-rose-100 text-rose-700'
                        : item.risk_band === 'Medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {item.risk_band} Similarity
                  </span>
                  <span className="text-slate-600 font-medium">
                    {item.patient_values.age} yo {item.patient_values.gender}
                  </span>
                  <span className="text-slate-400">
                    Score: {(item.model_score * 100).toFixed(1)}%
                  </span>
                </div>
                <span className="text-slate-400">{item.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
