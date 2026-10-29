import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  FileText,
  ShieldAlert,
  HelpCircle,
  TrendingUp,
  Bookmark,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function AssessmentResult({
  result,
  patientValues,
  onNewAssessment,
  onSaveToHistory,
  isSaved
}) {
  const [aiExplanation, setAiExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  if (!result) return null;

  const handleRequestAiExplanation = async () => {
    if (explaining) return;
    setExplaining(true);
    setExplainError(null);

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_values: patientValues,
          model_score: result.model_score,
          risk_band: result.risk_band,
          feature_explanations: result.feature_explanations || [],
          out_of_bounds_warnings: result.out_of_bounds_warnings || [],
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || 'Could not generate explanation at this time.');
      }

      const data = await res.json();
      setAiExplanation(data);
    } catch (err) {
      setExplainError(err.message);
    } finally {
      setExplaining(false);
    }
  };

  const isHigh = result.risk_band === 'High';
  const isMedium = result.risk_band === 'Medium';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Primary Result Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Assessment Summary
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
              Liver Health Pattern Assessment
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold tracking-wide border ${
                isHigh
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : isMedium
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {result.risk_band} Similarity Profile
            </span>
          </div>
        </div>

        {/* Score & Nuanced Meaning */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-5 text-center p-6 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
              {result.model_score_pct}
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-1">
              Dataset Pattern Similarity Score
            </div>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
              Compares submitted values to historical patterns in the ILPD research cohort.
            </p>

            {/* Visual Gauge Bar */}
            <div className="mt-4 w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isHigh ? 'bg-rose-500' : isMedium ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, result.model_score * 100))}%` }}
              />
            </div>
          </div>

          <div className="md:col-span-7 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">What this result means:</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {result.summary}
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>Important context for this prototype score:</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                This score is <strong>not</strong> a validated estimate of real-world disease probability.
                A “Low” result does not guarantee absence of liver illness, and a “High” result is not a diagnosis.
              </p>
            </div>
          </div>
        </div>

        {/* Data Quality Warnings (if any) */}
        {result.out_of_bounds_warnings && result.out_of_bounds_warnings.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs space-y-2">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Data-Quality Observations:</span>
            </div>
            <ul className="space-y-1 pl-5 list-disc text-amber-800">
              {result.out_of_bounds_warnings.map((w, idx) => (
                <li key={idx}>{w.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing/Imputed Fields notice */}
        {result.imputed_fields && result.imputed_fields.length > 0 && (
          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
            Note: The <strong>A/G Ratio</strong> was omitted and was filled using the dataset median value for calculation.
          </div>
        )}
      </div>

      {/* Feature Influences Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">What Influenced This Model Result?</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            The table below shows which submitted measurements most strongly increased or decreased the model output.
          </p>
        </div>

        <div className="space-y-2.5">
          {result.feature_explanations && result.feature_explanations.map((item, idx) => {
            const isIncrease = item.impact === 'increased';
            return (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-800">
                    {item.label}
                    {item.raw_value !== null && item.raw_value !== undefined && (
                      <span className="font-normal text-slate-500 ml-1.5">
                        (Submitted: {item.raw_value} {item.unit})
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Measurement {item.direction} relative to reference baseline.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                      isIncrease
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isIncrease ? 'Increased Score' : 'Decreased Score'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-400 italic pt-1">
          {result.statement || "Model contributions describe statistical associations learned from the research dataset, not biological causation."}
        </p>
      </div>

      {/* AI Assessment Insights Section (Groq LLM) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-indigo-100 shadow-xs space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>AI Assessment Insights</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
              AI Assessment Insights
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              A clear explanation of your result and the measurements that influenced it.
            </p>
          </div>

          <button
            onClick={handleRequestAiExplanation}
            disabled={explaining}
            className="px-4 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 shadow-sm shadow-indigo-500/20 text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shrink-0 self-start sm:self-auto"
          >
            {explaining ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Insights...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aiExplanation ? 'Regenerate explanation' : 'Generate AI Insights'}</span>
              </>
            )}
          </button>
        </div>

        {/* Error notification */}
        {explainError && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Explanation unavailable</p>
              <p className="text-amber-800/90 text-xs mt-0.5">{explainError}</p>
            </div>
          </div>
        )}

        {/* Explanation Content */}
        {aiExplanation ? (
          <div className="space-y-6">
            {/* Main Summary */}
            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100/70 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">
                Assessment Summary
              </span>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                {aiExplanation.summary}
              </p>
            </div>

            {/* Key Factors */}
            {aiExplanation.key_factors && aiExplanation.key_factors.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Key Influential Measurements
                  </h4>
                  <span className="text-[11px] text-slate-400">Grounded in verified model output</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {aiExplanation.key_factors.map((factor, idx) => {
                    const isIncrease = factor.direction && factor.direction.toLowerCase().includes('increase');
                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between gap-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-900">{factor.label}</div>
                            {factor.value_with_unit && (
                              <div className="text-[11px] font-medium text-slate-500">
                                Submitted: <span className="text-slate-800 font-semibold">{factor.value_with_unit}</span>
                              </div>
                            )}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              isIncrease
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {factor.direction}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-normal pt-1 border-t border-slate-200/50">
                          {factor.explanation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* What this means / Key Takeaway */}
            {aiExplanation.key_takeaway && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                <h4 className="text-xs font-bold text-slate-900">Key Takeaway</h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {aiExplanation.key_takeaway}
                </p>
              </div>
            )}

            {/* Useful Next Steps */}
            {aiExplanation.suggested_next_steps && aiExplanation.suggested_next_steps.length > 0 && (
              <div className="space-y-2 pt-1">
                <h4 className="text-xs font-bold text-slate-900">Useful Next Steps</h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {aiExplanation.suggested_next_steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Compact, Visually Quiet Safety Note */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <p className="italic">
                Research-based model assessment, not a medical diagnosis. Interpret laboratory results with a qualified healthcare professional.
              </p>
              {aiExplanation.model_used && (
                <span className="text-[10px] text-slate-400 shrink-0 ml-2 hidden sm:inline">
                  Groq • {aiExplanation.model_used}
                </span>
              )}
            </div>
          </div>
        ) : (
          !explainError && (
            <div className="py-8 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <Sparkles className="w-7 h-7 text-indigo-400 mx-auto" />
              <div className="max-w-md mx-auto space-y-1 px-4">
                <h4 className="text-sm font-bold text-slate-800">
                  Ready to generate plain-language insights?
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Click the button above to receive a concise, natural-language explanation of how your specific laboratory measurements influenced this assessment.
                </p>
              </div>
            </div>
          )
        )}
      </div>

      {/* Sensible General Next Steps */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">Sensible Next Steps</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
            <div className="font-bold text-slate-800">1. Review Input Values</div>
            <p className="text-slate-500 leading-relaxed">
              Check your numbers against your original paper report to ensure no values were mistyped or misassigned.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
            <div className="font-bold text-slate-800">2. Share with a Physician</div>
            <p className="text-slate-500 leading-relaxed">
              Take your full laboratory report to a licensed physician who can interpret your tests alongside your medical history.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
            <div className="font-bold text-slate-800">3. Avoid Self-Treatment</div>
            <p className="text-slate-500 leading-relaxed">
              Do not start or modify supplements, dietary regimens, or medications based on automated screening results.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          onClick={onNewAssessment}
          className="px-6 py-3 rounded-xl font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs text-sm transition-all"
        >
          ← Start Another Assessment
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onSaveToHistory}
            disabled={isSaved}
            className={`px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${
              isSaved
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>{isSaved ? 'Saved to Session History' : 'Save to Session History'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
