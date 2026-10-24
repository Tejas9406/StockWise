import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical, Play, BarChart3, TrendingDown, TrendingUp, AlertTriangle,
  ShieldCheck, ChevronDown, ChevronUp, Plus, Trash2, Loader2, History,
  Zap, Target, Package, Clock
} from 'lucide-react';
import aiService from '../../services/aiService';

const PARAM_TYPES = [
  { value: 'demand_multiplier', label: 'Demand Surge / Drop', icon: TrendingUp, desc: 'Multiply all store demand by a factor (e.g., 1.5 = +50% demand, 0.7 = -30%)' },
  { value: 'supply_reduction', label: 'Supply Disruption', icon: Package, desc: 'Reduce warehouse supply by % (e.g., 0.5 = 50% supply loss)' },
  { value: 'lead_time_change', label: 'Lead Time Extension', icon: Clock, desc: 'Simulate longer lead times by multiplying demand window' },
  { value: 'batch_expiry_shift', label: 'Expiry Shift', icon: AlertTriangle, desc: 'Shift batch expiry dates by N days (negative = closer to expiry)' },
  { value: 'priority_escalation', label: 'Priority Escalation', icon: Zap, desc: 'Escalate store priority levels (LOW→MEDIUM, MEDIUM→HIGH, etc.)' },
];

const PRESETS = [
  {
    name: '🔥 Festival Demand Surge (+80%)',
    desc: 'Simulates a major festive season with 80% demand increase across all stores.',
    params: [{ param_type: 'demand_multiplier', target_scope: 'ALL', value: 1.8, label: '+80% demand surge' }],
  },
  {
    name: '🚛 Supplier Disruption (40% loss)',
    desc: 'One major supplier fails, reducing warehouse availability by 40%.',
    params: [{ param_type: 'supply_reduction', target_scope: 'ALL', value: 0.6, label: '40% supply reduction' }],
  },
  {
    name: '⚡ Double Whammy: Surge + Disruption',
    desc: 'Peak season demand (+50%) combined with a 30% supply disruption.',
    params: [
      { param_type: 'demand_multiplier', target_scope: 'ALL', value: 1.5, label: '+50% demand' },
      { param_type: 'supply_reduction', target_scope: 'ALL', value: 0.7, label: '30% supply loss' },
    ],
  },
  {
    name: '🧊 Cold Chain Failure (-10 days expiry)',
    desc: 'Cold chain breakdown accelerates batch deterioration.',
    params: [{ param_type: 'batch_expiry_shift', target_scope: 'ALL', value: -10, label: '-10 days expiry' }],
  },
];

export const WhatIfSimulation = () => {
  const [scenarioName, setScenarioName] = useState('');
  const [description, setDescription] = useState('');
  const [parameters, setParameters] = useState([{ param_type: 'demand_multiplier', target_scope: 'ALL', value: 1.5, label: '' }]);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await aiService.getScenarios();
      if (res.success) setHistory(res.data || []);
    } catch { /* ignore */ }
  };

  const addParameter = () => {
    setParameters([...parameters, { param_type: 'demand_multiplier', target_scope: 'ALL', value: 1.0, label: '' }]);
  };

  const removeParameter = (idx) => {
    setParameters(parameters.filter((_, i) => i !== idx));
  };

  const updateParameter = (idx, field, val) => {
    const updated = [...parameters];
    updated[idx] = { ...updated[idx], [field]: val };
    setParameters(updated);
  };

  const applyPreset = (preset) => {
    setScenarioName(preset.name);
    setDescription(preset.desc);
    setParameters(preset.params.map(p => ({ ...p })));
  };

  const runSimulation = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await aiService.runSimulation({
        scenario_name: scenarioName || 'Custom Scenario',
        description,
        parameters,
      });

      if (res.success) {
        setResult(res.simulation);
        loadHistory();
      } else {
        setError(res.message || 'Simulation failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Simulation request failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const DeltaChip = ({ value, label, inverted = false }) => {
    const isGood = inverted ? value < 0 : value > 0;
    const isNeutral = value === 0;
    return (
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
        ${isNeutral ? 'bg-slate-100 text-slate-500'
          : isGood ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-red-50 text-red-700 border border-red-200'}`}>
        {!isNeutral && (isGood ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />)}
        <span>{value > 0 ? '+' : ''}{typeof value === 'number' ? value.toLocaleString() : value} {label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            What-If Scenario Simulation
          </h1>
          <p className="text-sm text-slate-500 mt-1">Stress-test your supply chain against demand surges, disruptions, and shelf-life crises</p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <History className="w-4 h-4" />
          {showHistory ? 'Hide' : 'Show'} History ({history.length})
        </button>
      </div>

      {/* Scenario Presets */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Presets</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => applyPreset(preset)}
              className="text-left p-3 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition-all group"
            >
              <div className="text-sm font-semibold text-slate-700 group-hover:text-violet-700">{preset.name}</div>
              <div className="text-xs text-slate-500 mt-1 line-clamp-2">{preset.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Scenario Builder */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Scenario Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Scenario Name</label>
            <input
              type="text"
              value={scenarioName}
              onChange={e => setScenarioName(e.target.value)}
              placeholder="e.g., Festival Season Demand Surge"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this scenario"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
            />
          </div>
        </div>

        {/* Perturbation Parameters */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Perturbation Parameters</label>
            <button
              onClick={addParameter}
              className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Parameter
            </button>
          </div>

          {parameters.map((param, idx) => {
            const paramInfo = PARAM_TYPES.find(p => p.value === param.param_type) || PARAM_TYPES[0];
            return (
              <motion.div
                key={idx}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
              >
                <select
                  value={param.param_type}
                  onChange={e => updateParameter(idx, 'param_type', e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-violet-400 outline-none"
                >
                  {PARAM_TYPES.map(pt => (
                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={param.target_scope}
                  onChange={e => updateParameter(idx, 'target_scope', e.target.value)}
                  placeholder="ALL"
                  className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-sm bg-white text-center focus:ring-2 focus:ring-violet-400 outline-none"
                  title="Scope: ALL or product_id / store_id"
                />
                <input
                  type="number"
                  step="0.1"
                  value={param.value}
                  onChange={e => updateParameter(idx, 'value', parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-sm bg-white text-center focus:ring-2 focus:ring-violet-400 outline-none"
                />
                <span className="text-xs text-slate-400 flex-1 truncate">{paramInfo.desc}</span>
                {parameters.length > 1 && (
                  <button onClick={() => removeParameter(idx)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Run Button */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={runSimulation}
            disabled={isRunning || parameters.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-violet-200 hover:shadow-violet-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Simulating...' : 'Run Simulation'}
          </button>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">{error}</div>
          )}
        </div>
      </div>

      {/* Simulation Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-4"
          >
            {/* Risk Assessment Banner */}
            <div className={`rounded-2xl p-5 border ${
              result.risk_assessment?.startsWith('HIGH')
                ? 'bg-red-50 border-red-200'
                : result.risk_assessment?.startsWith('MEDIUM')
                ? 'bg-amber-50 border-amber-200'
                : 'bg-emerald-50 border-emerald-200'
            }`}>
              <div className="flex items-start gap-3">
                <ShieldCheck className={`w-6 h-6 mt-0.5 ${
                  result.risk_assessment?.startsWith('HIGH') ? 'text-red-600'
                    : result.risk_assessment?.startsWith('MEDIUM') ? 'text-amber-600' : 'text-emerald-600'
                }`} />
                <div>
                  <h3 className="font-semibold text-sm text-slate-800">Risk Assessment</h3>
                  <p className="text-sm text-slate-600 mt-1">{result.risk_assessment}</p>
                  <p className="text-xs text-slate-500 mt-2 italic">{result.recommendation}</p>
                </div>
              </div>
            </div>

            {/* Baseline vs Scenario Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Baseline Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-700">Baseline (Current State)</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Allocated Units</span>
                    <span className="font-semibold text-slate-800">{result.baseline?.total_allocated_units?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Unmet Demand</span>
                    <span className="font-semibold text-slate-800">{result.baseline?.unmet_demand_units?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Stockout Mitigation</span>
                    <span className="font-semibold text-slate-800">{result.baseline?.stockout_mitigation_pct || 0}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Expiry Units Saved</span>
                    <span className="font-semibold text-slate-800">{result.baseline?.expiry_units_saved || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Transport Cost</span>
                    <span className="font-semibold text-slate-800">${result.baseline?.estimated_transport_cost || 0}</span>
                  </div>
                </div>
              </div>

              {/* Scenario Card */}
              <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-5 ring-1 ring-violet-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-violet-500" />
                  <h3 className="text-sm font-semibold text-violet-700">{result.scenario?.scenario_name || 'Scenario'}</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Allocated Units</span>
                    <span className="font-semibold text-slate-800">{result.scenario?.total_allocated_units?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Unmet Demand</span>
                    <span className="font-semibold text-slate-800">{result.scenario?.unmet_demand_units?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Stockout Mitigation</span>
                    <span className="font-semibold text-slate-800">{result.scenario?.stockout_mitigation_pct || 0}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Expiry Units Saved</span>
                    <span className="font-semibold text-slate-800">{result.scenario?.expiry_units_saved || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Transport Cost</span>
                    <span className="font-semibold text-slate-800">${result.scenario?.estimated_transport_cost || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Delta Summary */}
            {result.delta && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-violet-500" /> Impact Delta
                </h3>
                <div className="flex flex-wrap gap-3">
                  <DeltaChip value={result.delta.allocated_units_change || 0} label="units allocated" />
                  <DeltaChip value={result.delta.unmet_demand_change || 0} label="units unmet" inverted />
                  <DeltaChip value={result.delta.stockout_mitigation_change_pct || 0} label="% mitigation" />
                  <DeltaChip value={result.delta.expiry_units_saved_change || 0} label="expiry saved" />
                  <DeltaChip value={result.delta.transport_cost_change || 0} label="$ transport" inverted />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scenario History */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden"
          >
            <div className="p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" /> Simulation History
              </h3>
              {history.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No simulations run yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        <th className="pb-2 pr-4">Scenario</th>
                        <th className="pb-2 pr-4">Parameters</th>
                        <th className="pb-2 pr-4">Risk</th>
                        <th className="pb-2 pr-4">Created By</th>
                        <th className="pb-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {history.slice(0, 15).map((s, i) => (
                        <tr key={s.id || i} className="hover:bg-slate-50/50">
                          <td className="py-2.5 pr-4 font-medium text-slate-700">{s.scenario_name}</td>
                          <td className="py-2.5 pr-4">
                            <div className="flex gap-1 flex-wrap">
                              {(Array.isArray(s.parameters) ? s.parameters : []).map((p, j) => (
                                <span key={j} className="px-2 py-0.5 text-xs bg-violet-50 text-violet-700 rounded-md">
                                  {p.label || p.param_type}: {p.value}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 pr-4">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                              s.risk_assessment?.startsWith('HIGH') ? 'bg-red-50 text-red-700'
                                : s.risk_assessment?.startsWith('MEDIUM') ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {s.risk_assessment?.split('—')[0]?.trim() || 'N/A'}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-slate-500">{s.created_by_name || 'Manager'}</td>
                          <td className="py-2.5 text-slate-400 text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
