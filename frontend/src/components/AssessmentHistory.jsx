import React from 'react';
import {
  Clock,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Activity,
  AlertCircle
} from 'lucide-react';

export default function AssessmentHistory({
  history,
  onSelectAssessment,
  onClearHistory,
  onStartNew
}) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Session Assessment History</h2>
          </div>
          <p className="text-xs text-slate-500">
            Records saved during your current browser session.
          </p>
        </div>

        {history && history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Privacy Notice */}
      <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/60 text-blue-900 text-xs flex items-start gap-2.5 shadow-xs">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-blue-800 leading-relaxed">
          <strong>Privacy & Session Scope:</strong> This history is temporary and stored only in your browser’s current memory.
          No patient data is saved to a server database or sent to third-party loggers. Refreshing or closing this tab completely clears this list.
        </p>
      </div>

      {/* History List or Empty State */}
      {history && history.length > 0 ? (
        <div className="space-y-3">
          {history.map((item, idx) => {
            const isHigh = item.risk_band === 'High';
            const isMedium = item.risk_band === 'Medium';

            return (
              <div
                key={idx}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold tracking-wide ${
                        isHigh
                          ? 'bg-rose-100 text-rose-700'
                          : isMedium
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {item.risk_band} Similarity
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      Score: {(item.model_score * 100).toFixed(1)}%
                    </span>
                    <span className="text-xs text-slate-400">• {item.timestamp}</span>
                  </div>

                  <div className="text-xs text-slate-600">
                    Patient: {item.patient_values.age} yo {item.patient_values.gender} • TB: {item.patient_values.total_bilirubin} mg/dL • ALT: {item.patient_values.alt} IU/L • AST: {item.patient_values.ast} IU/L
                  </div>
                </div>

                <button
                  onClick={() => onSelectAssessment(item)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No Assessments in Current Session</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Completed assessments can be saved to this temporary log for easy review and comparison before you close your browser.
            </p>
          </div>
          <button
            onClick={onStartNew}
            className="px-5 py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 text-xs shadow-xs"
          >
            Start New Assessment
          </button>
        </div>
      )}
    </div>
  );
}
