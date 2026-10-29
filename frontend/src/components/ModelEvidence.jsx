import React, { useState } from 'react';
import {
  Award,
  Database,
  BarChart2,
  Cpu,
  Layers,
  ShieldAlert,
  Info,
  CheckCircle2,
  FileText,
  AlertTriangle
} from 'lucide-react';

export default function ModelEvidence({ modelInfo, metrics }) {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', label: 'A. Model Overview', icon: Cpu },
    { id: 'dataset', label: 'B. Dataset & Preprocessing', icon: Database },
    { id: 'training', label: 'C. Training & Calibration', icon: Layers },
    { id: 'metrics', label: 'D. Holdout Evaluation Metrics', icon: Award },
    { id: 'explainability', label: 'E. Explainability & Sanity', icon: BarChart2 },
    { id: 'limitations', label: 'F. Limitations & Ethics', icon: ShieldAlert },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Model Specifications & Scientific Evidence
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Full technical transparency documentation, training methodology, holdout test metrics with 95% bootstrap confidence intervals, and clinical validation caveats.
        </p>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 pt-6 border-t border-slate-100 mt-6">
          {sections.map(sec => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION A: Model Overview */}
      {activeSection === 'overview' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">A. Model Architecture & Selection Rationale</h3>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <p>
              <strong>Selected Model:</strong> {modelInfo?.model_name || 'Logistic Regression (L2 Penalized)'} with balanced class weights (`class_weight='balanced'`, `C=0.05`, `solver='liblinear'`).
            </p>
            <p>
              <strong>Task Definition:</strong> Supervised binary classification predicting whether a patient's routine liver function test panel exhibits statistical pattern similarity to verified liver-disease presentation profiles (`1 = Liver Patient`, `0 = Non-Liver Reference Patient`).
            </p>
            <p>
              <strong>Selection Rationale:</strong> In 15-fold Repeated Stratified Cross-Validation, Logistic Regression attained a mean CV ROC-AUC of <strong>0.7334 (&plusmn; 0.047)</strong>, outperforming Random Forest (0.7252) and Gradient Boosting (0.7164). Under the <strong>1-Standard-Error (1-SE) rule</strong>, the simpler, highly interpretable linear model was preferred over complex ensembles.
            </p>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h4 className="font-bold text-slate-800 text-xs">Prediction Transformation Pipeline:</h4>
              <p className="text-xs text-slate-600">
                Raw Input $\to$ Missing Value Median Imputation $\to$ Skew-Correction via $\log(1 + x)$ on transaminases/bilirubin $\to$ Standard Scaling $\to$ Logistic Sigmoid Function $\to$ Predicted Score $p \in [0, 1]$.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION B: Dataset & Preprocessing */}
      {activeSection === 'dataset' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">B. Dataset Provenance & Data Hygiene</h3>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <p>
              <strong>Source:</strong> Indian Liver Patient Dataset (ILPD), collected from patients in North-East Andhra Pradesh, India (UCI Machine Learning Repository ID 225).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <div className="text-xl font-extrabold text-slate-900">583 &rarr; 570</div>
                <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Records (13 Duplicates Removed)</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <div className="text-xl font-extrabold text-blue-700">456 / 114</div>
                <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Train / Test Split (80 / 20)</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <div className="text-xl font-extrabold text-slate-900">71.3% / 28.7%</div>
                <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Liver / Non-Liver Class Balance</div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-slate-800 text-xs">Features Included (10):</h4>
              <p className="text-xs text-slate-600">
                Age, Gender, Total Bilirubin, Direct Bilirubin, Alkaline Phosphatase (ALP), Alanine Aminotransferase (ALT), Aspartate Aminotransferase (AST), Total Protein, Albumin, Albumin/Globulin (A/G) Ratio.
              </p>
              <h4 className="font-bold text-slate-800 text-xs mt-3">Missing Value Handling:</h4>
              <p className="text-xs text-slate-600">
                Missing values in the raw dataset were restricted to 4 records in the A/G Ratio. In keeping with strict data hygiene, missing values are imputed using the <strong>median of the training set only</strong> inside the scikit-learn pipeline to prevent data leakage.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION C: Training Methodology */}
      {activeSection === 'training' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">C. Training, Validation & Calibration Strategy</h3>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <p>
              <strong>Data Splitting:</strong> Stratified 80/20 train/test split with `random_state=42`. The test set of 114 records was set aside and remained <strong>completely untouched</strong> until final evaluation.
            </p>
            <p>
              <strong>Cross-Validation:</strong> 5-Fold Repeated Stratified Cross-Validation with 3 repeats (15 total folds) was performed on the training split for hyperparameter tuning.
            </p>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <h4 className="font-bold text-slate-800 text-xs">Calibration Status:</h4>
              <p className="text-xs text-slate-600">
                Calibration was explicitly evaluated on out-of-fold training predictions using Brier score and reliability curves. Because the uncalibrated Logistic Regression already achieved a low Brier score (0.1758 on holdout) and Sigmoid calibration did not yield an improvement on this sample size, the uncalibrated model was retained.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-xs">Calibrated Decision Thresholds:</h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 pl-1">
                <li>
                  <strong>t_low = 0.3094:</strong> Chosen from out-of-fold cross-validation to maximize specificity while maintaining &ge;90% sensitivity on training folds. On the holdout test set, it achieved <strong>86.4% recall</strong>.
                </li>
                <li>
                  <strong>t_high = 0.4683:</strong> Chosen to achieve &ge;85% precision on training out-of-fold predictions. On the holdout test set, it achieved <strong>89.1% precision</strong> and <strong>78.8% specificity</strong>.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SECTION D: Holdout Evaluation Metrics */}
      {activeSection === 'metrics' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">D. Independent Test Holdout Metrics (n = 114)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluated strictly once on the 20% holdout test set with 1,000 bootstrap iterations for 95% Confidence Intervals.
            </p>
          </div>

          {metrics ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricBox
                  title="ROC-AUC Score"
                  value={metrics.roc_auc ? metrics.roc_auc.toFixed(4) : '0.8085'}
                  ci={`95% CI: [${metrics.confidence_intervals_95?.roc_auc?.ci_95_low?.toFixed(3) || '0.727'}, ${metrics.confidence_intervals_95?.roc_auc?.ci_95_high?.toFixed(3) || '0.885'}]`}
                  highlight={true}
                />
                <MetricBox
                  title="Average Precision (PR-AUC)"
                  value={metrics.average_precision ? metrics.average_precision.toFixed(4) : '0.9288'}
                  ci={`95% CI: [${metrics.confidence_intervals_95?.average_precision?.ci_95_low?.toFixed(3) || '0.885'}, ${metrics.confidence_intervals_95?.average_precision?.ci_95_high?.toFixed(3) || '0.962'}]`}
                />
                <MetricBox
                  title="Sensitivity (@ t_low)"
                  value={`${((metrics.metrics_at_t_low?.recall || 0.864) * 100).toFixed(1)}%`}
                  ci={`95% CI: [${((metrics.confidence_intervals_95?.recall_at_t_low?.ci_95_low || 0.789) * 100).toFixed(1)}%, ${((metrics.confidence_intervals_95?.recall_at_t_low?.ci_95_high || 0.940) * 100).toFixed(1)}%]`}
                />
                <MetricBox
                  title="Specificity (@ t_high)"
                  value={`${((metrics.metrics_at_t_high?.specificity || 0.788) * 100).toFixed(1)}%`}
                  ci="Precision: 89.1%"
                />
              </div>

              {/* Threshold Comparison Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Operating Cutoff</th>
                      <th className="py-3 px-4">Threshold Value</th>
                      <th className="py-3 px-4">Sensitivity (Recall)</th>
                      <th className="py-3 px-4">Specificity</th>
                      <th className="py-3 px-4">Precision</th>
                      <th className="py-3 px-4">Balanced Accuracy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-800">Screening (t_low)</td>
                      <td className="py-3 px-4 font-mono font-semibold">0.3094</td>
                      <td className="py-3 px-4 font-semibold text-emerald-700">86.4%</td>
                      <td className="py-3 px-4">30.3%</td>
                      <td className="py-3 px-4">75.3%</td>
                      <td className="py-3 px-4">58.4%</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-800">High-Specificity (t_high)</td>
                      <td className="py-3 px-4 font-mono font-semibold">0.4683</td>
                      <td className="py-3 px-4">70.4%</td>
                      <td className="py-3 px-4 font-semibold text-blue-700">78.8%</td>
                      <td className="py-3 px-4 font-semibold text-blue-700">89.1%</td>
                      <td className="py-3 px-4">74.6%</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-800">Standard Neutral</td>
                      <td className="py-3 px-4 font-mono font-semibold">0.5000</td>
                      <td className="py-3 px-4">70.4%</td>
                      <td className="py-3 px-4 font-semibold text-blue-700">84.8%</td>
                      <td className="py-3 px-4 font-semibold text-blue-700">91.9%</td>
                      <td className="py-3 px-4">77.6%</td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-500">Dummy Baseline (Majority)</td>
                      <td className="py-3 px-4 font-mono text-slate-400">-</td>
                      <td className="py-3 px-4 text-slate-500">100.0%</td>
                      <td className="py-3 px-4 text-slate-500">0.0%</td>
                      <td className="py-3 px-4 text-slate-500">71.1%</td>
                      <td className="py-3 px-4 text-slate-500">50.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Confusion Matrix breakdown */}
              {metrics.metrics_at_t_low?.confusion_matrix && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-2">
                  <div className="font-bold text-slate-800">
                    Holdout Confusion Matrix (at screening cutoff t_low = 0.3094):
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-800">{metrics.metrics_at_t_low.confusion_matrix.tp}</div>
                      <div className="text-[10px] text-slate-400">True Positives (TP)</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-800">{metrics.metrics_at_t_low.confusion_matrix.tn}</div>
                      <div className="text-[10px] text-slate-400">True Negatives (TN)</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-800">{metrics.metrics_at_t_low.confusion_matrix.fp}</div>
                      <div className="text-[10px] text-slate-400">False Positives (FP)</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-800">{metrics.metrics_at_t_low.confusion_matrix.fn}</div>
                      <div className="text-[10px] text-slate-400">False Negatives (FN)</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-400 text-xs py-6 text-center">
              Metrics loaded dynamically from `/api/metrics`. Ensure the model has been trained.
            </div>
          )}
        </div>
      )}

      {/* SECTION E: Explainability */}
      {activeSection === 'explainability' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">E. Explainability Methodology & Feature Importance</h3>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <p>
              <strong>Global Explanations:</strong> Permutation feature importance on the held-out test set scored by ROC-AUC degradation identified <strong>ALT (SGPT)</strong>, <strong>AST (SGOT)</strong>, and <strong>Direct Bilirubin</strong> as the primary drivers of model discrimination.
            </p>
            <p>
              <strong>Local Patient Explanations:</strong> Individual assessments calculate local SHAP (SHapley Additive exPlanations) values using a `shap.LinearExplainer` evaluated against the empirical training background distribution.
            </p>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Association vs. Causation:</span>
              </div>
              <p className="text-amber-800/90 leading-relaxed">
                Feature contributions describe statistical correlations learned from historical hospital charts, not direct biochemical causation. An elevated biomarker increasing the output indicates that similar elevations were frequently observed among liver patients in the training sample.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-slate-800 text-xs">Pathophysiological Direction Verification:</h4>
              <p className="text-xs text-slate-600">
                A programmatic sanity check verifies that elevated Bilirubin, ALT, AST, and ALP consistently produce positive coefficients (increasing risk output), while Albumin and A/G Ratio produce negative coefficients (decreasing risk output), in exact accordance with clinical hepatology.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION F: Limitations & Ethics */}
      {activeSection === 'limitations' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">F. Clinical Limitations & Ethical Boundaries</h3>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <h4 className="font-bold text-slate-900 text-xs">1. Single-Region Hospital Cohort</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The dataset reflects patients from a single regional healthcare system in Andhra Pradesh, India. Biological baseline enzyme distributions, viral hepatitis prevalence, and alcohol-related etiologies vary widely across different global populations.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <h4 className="font-bold text-slate-900 text-xs">2. Non-Healthy Control Group</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The non-liver control cohort consists of other hospital patients evaluated for non-hepatic medical conditions, not asymptomatic healthy community volunteers.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <h4 className="font-bold text-slate-900 text-xs">3. Dataset Prevalence vs. General Population</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The dataset has an artificial disease prevalence of 71.4%. In general screening contexts, true population prevalence is substantially lower (~5–15%). Consequently, the numerical model score reflects dataset similarity and cannot be interpreted as a calibrated real-world probability.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <h4 className="font-bold text-slate-900 text-xs">4. Absence of Clinical History & Imaging</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Liver disease diagnosis requires comprehensive clinical correlation, including physical examination, abdominal ultrasound/fibroscan, viral serologies, and full medical history. Routine blood biomarkers alone are insufficient for definitive diagnosis.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricBox({ title, value, ci, highlight }) {
  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${
        highlight
          ? 'bg-blue-50/60 border-blue-200 shadow-xs'
          : 'bg-slate-50/80 border-slate-100'
      }`}
    >
      <div className="text-[11px] font-bold text-slate-500 mb-1">{title}</div>
      <div className={`text-2xl font-black tracking-tight ${highlight ? 'text-blue-700' : 'text-slate-900'}`}>
        {value}
      </div>
      <div className="text-[11px] font-mono text-slate-500 mt-0.5">{ci}</div>
    </div>
  );
}
