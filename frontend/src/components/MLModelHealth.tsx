import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  TrendingUp,
  Cpu,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Activity,
  Layers
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { ModelMetrics, DelayPredictionResponse } from '../types';
import { api } from '../services/api';
import { RiskBadge } from './RiskBadge';

export const MLModelHealth: React.FC = () => {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainSuccess, setRetrainSuccess] = useState(false);

  // Live Interactive Delay Predictor State
  const [testDept, setTestDept] = useState('Track');
  const [testType, setTestType] = useState('Track Relaying / Renewal');
  const [testSection, setTestSection] = useState('Section B-1 (Suburban Corridor)');
  const [testDuration, setTestDuration] = useState(5.5);
  const [testComplexity, setTestComplexity] = useState(4);
  const [testCrewShortage, setTestCrewShortage] = useState(0.25);
  const [testWeather, setTestWeather] = useState('Rain');
  const [testNight, setTestNight] = useState(1);
  const [testDeps, setTestDeps] = useState(2);

  const [testResult, setTestResult] = useState<DelayPredictionResponse | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  useEffect(() => {
    fetchMetrics();
    runInteractivePrediction();
  }, []);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const data = await api.getModelMetrics();
      setMetrics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetrain = async () => {
    setIsRetraining(true);
    setRetrainSuccess(false);
    try {
      const newMetrics = await api.retrainModel();
      setMetrics(newMetrics);
      setRetrainSuccess(true);
      setTimeout(() => setRetrainSuccess(false), 4000);
      runInteractivePrediction();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRetraining(false);
    }
  };

  const runInteractivePrediction = async () => {
    setIsPredicting(true);
    try {
      const res = await api.predictDelay({
        department: testDept,
        maintenance_type: testType,
        section: testSection,
        planned_duration_hours: Number(testDuration),
        complexity_score: Number(testComplexity),
        crew_experience_level: 2,
        crew_size_allocated: 6,
        crew_shortage_ratio: Number(testCrewShortage),
        equipment_age_years: 7,
        weather_condition: testWeather,
        is_night_shift: Number(testNight),
        dependency_count: Number(testDeps),
        historical_section_delay_rate: 0.30,
      });
      setTestResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPredicting(false);
    }
  };

  // Convert feature importances to chart array
  const featureChartData = metrics?.feature_importances
    ? Object.entries(metrics.feature_importances).map(([name, val]) => ({
        feature: name
          .replace('cat__', '')
          .replace('num__', '')
          .replace('_hours', '')
          .replace('_ratio', '')
          .replace('department_', 'Dept: ')
          .replace('maintenance_type_', 'Type: ')
          .replace('weather_condition_', 'Weather: '),
        importance: Math.round(val * 100),
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-md">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Scikit-Learn Random Forest Pipeline
                </span>
                <span className="text-xs text-slate-400 font-mono">Model v1.0.0</span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1 m-0">
                Maintenance Delay Classification & Telemetry Model
              </h2>
              <p className="text-xs text-slate-300 mt-1 m-0">
                Trained on synthetic operational features with strict target leakage prevention.
              </p>
            </div>
          </div>

          <button
            onClick={handleRetrain}
            disabled={isRetraining}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-purple-500/20 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetraining ? 'animate-spin' : ''}`} />
            <span>{isRetraining ? 'Retraining Pipeline...' : 'Retrain Pipeline'}</span>
          </button>
        </div>
      </div>

      {retrainSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Model retrained and evaluated on fresh synthetic train/test split. Evaluation metrics updated.</span>
        </div>
      )}

      {/* Model Performance Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">ROC-AUC</span>
          <span className="text-2xl font-bold text-purple-300 font-mono mt-0.5 block">
            {metrics ? (metrics.roc_auc * 100).toFixed(1) : '--'}%
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Discrimination score</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">F1-Score</span>
          <span className="text-2xl font-bold text-blue-400 font-mono mt-0.5 block">
            {metrics ? (metrics.f1_score * 100).toFixed(1) : '--'}%
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Harmonic mean</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Precision</span>
          <span className="text-2xl font-bold text-emerald-400 font-mono mt-0.5 block">
            {metrics ? (metrics.precision * 100).toFixed(1) : '--'}%
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Positive predictive</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Recall</span>
          <span className="text-2xl font-bold text-amber-400 font-mono mt-0.5 block">
            {metrics ? (metrics.recall * 100).toFixed(1) : '--'}%
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Delay sensitivity</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Accuracy</span>
          <span className="text-2xl font-bold text-white font-mono mt-0.5 block">
            {metrics ? (metrics.accuracy * 100).toFixed(1) : '--'}%
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Test split accuracy</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Baseline Acc</span>
          <span className="text-2xl font-bold text-slate-400 font-mono mt-0.5 block">
            {metrics ? (metrics.baseline_accuracy * 100).toFixed(1) : '--'}%
          </span>
          <span className="text-[10px] text-emerald-400 mt-1 block">
            +{metrics ? Math.round((metrics.accuracy - metrics.baseline_accuracy) * 100) : 0}% vs Dummy
          </span>
        </div>
      </div>

      {/* Main Grid: Left = Feature Importance Chart, Right = Live Interactive Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Importances Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white m-0">Top Delay Risk Feature Importances</h3>
              <p className="text-xs text-slate-400 m-0 mt-0.5">
                Relative influence of operational parameters inside the Random Forest ensemble
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-purple-300">
              Gini Impurity
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={featureChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} unit="%" />
                <YAxis
                  dataKey="feature"
                  type="category"
                  stroke="#64748b"
                  tick={{ fontSize: 11, fill: '#cbd5e1' }}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                  }}
                  formatter={(val: any) => [`${val}% weight`, 'Importance']}
                />
                <Bar dataKey="importance" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                  {featureChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? '#a855f7' : index === 1 ? '#8b5cf6' : '#6366f1'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[11px] text-slate-400 p-2.5 rounded bg-slate-800/40 border border-slate-800">
            <strong>Target Leakage Prevention:</strong> Actual durations are strictly omitted from feature representation. Training inputs consist exclusively of planned parameters, crew shortage indices, weather, and dependencies.
          </div>
        </div>

        {/* Live Interactive Delay Risk Tester */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white m-0">Live Delay Prediction Sandbox</h3>
              </div>
              <span className="text-[11px] text-slate-400">Ad-Hoc Inference</span>
            </div>

            {/* Parameter sliders and inputs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Department</label>
                <select
                  value={testDept}
                  onChange={(e) => {
                    setTestDept(e.target.value);
                    if (e.target.value === 'Track') setTestType('Track Relaying / Renewal');
                    if (e.target.value === 'Electrical / OHE') setTestType('OHE Power Block Inspection');
                    if (e.target.value === 'Signalling & Telecommunications (S&T)') setTestType('Signal Interlocking Overhaul');
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                >
                  <option value="Track">Track</option>
                  <option value="Electrical / OHE">Electrical / OHE</option>
                  <option value="Signalling & Telecommunications (S&T)">S&T Signals</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Weather</label>
                <select
                  value={testWeather}
                  onChange={(e) => setTestWeather(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                >
                  <option value="Clear">Clear</option>
                  <option value="Rain">Rain (Wet Track)</option>
                  <option value="Fog">Dense Fog</option>
                  <option value="Severe Heat">Severe Heat</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Complexity Score: <span className="text-white font-mono">{testComplexity}/5</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={testComplexity}
                  onChange={(e) => setTestComplexity(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Crew Shortage: <span className="text-amber-400 font-mono">{Math.round(testCrewShortage * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.05"
                  value={testCrewShortage}
                  onChange={(e) => setTestCrewShortage(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Night Shift</label>
                <select
                  value={testNight}
                  onChange={(e) => setTestNight(parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                >
                  <option value={1}>Yes (22:00 - 05:00)</option>
                  <option value={0}>No (Day Shift)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Dependencies Count</label>
                <select
                  value={testDeps}
                  onChange={(e) => setTestDeps(parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                >
                  <option value={0}>0 (Independent)</option>
                  <option value={1}>1 Upstream Task</option>
                  <option value={2}>2 Upstream Tasks</option>
                  <option value={3}>3+ Upstream Tasks</option>
                </select>
              </div>
            </div>

            <button
              onClick={runInteractivePrediction}
              disabled={isPredicting}
              className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>{isPredicting ? 'Inferring...' : 'Evaluate Delay Risk'}</span>
            </button>
          </div>

          {/* Test Prediction Output */}
          {testResult && (
            <div className="p-4 rounded-xl bg-slate-800/60 border border-purple-500/30 space-y-2.5 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Inference Result</span>
                <RiskBadge
                  level={testResult.risk_level}
                  probability={testResult.delay_probability}
                  size="md"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                <span>Delay Probability:</span>
                <span className="text-purple-300 font-bold">
                  {Math.round(testResult.delay_probability * 100)}%
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                <span>Confidence Rating:</span>
                <span className="text-slate-200">
                  {Math.round(testResult.confidence_score * 100)}%
                </span>
              </div>

              {testResult.top_risk_factors.length > 0 && (
                <div className="pt-2 border-t border-slate-700/60 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Detected Risk Multipliers:
                  </span>
                  <ul className="text-xs text-amber-300 list-disc list-inside space-y-0.5">
                    {testResult.top_risk_factors.map((fac, i) => (
                      <li key={i}>{fac}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
