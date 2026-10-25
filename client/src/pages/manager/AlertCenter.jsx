import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Bell, AlertTriangle, AlertCircle, ShieldAlert, Sparkles,
  ArrowRight, RefreshCw, CheckCircle, Clock, Package, Filter,
  ExternalLink, Zap, Mail, MessageSquare, Send, CheckCircle2, Bot
} from 'lucide-react';
import aiService from '../../services/aiService';

export const AlertCenter = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [automationStats, setAutomationStats] = useState(null);
  const [telegramInfo, setTelegramInfo] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [error, setError] = useState(null);
  const [testChannel, setTestChannel] = useState('TELEGRAM');
  const [testRecipient, setTestRecipient] = useState('');
  const [testMessage, setTestMessage] = useState('🚨 [StockWise FMCG Alert] Batch BAT-MLK-09 (Fresh Whole Milk 1L) at Metro DC expires in 11 days (Nov 5, 2026). 450 units available. Prioritize immediate FEFO transfer to retail stores.');
  const [testStatus, setTestStatus] = useState(null);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    fetchAlertsAndStats();
  }, []);

  const fetchAlertsAndStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const [alertRes, autoRes, tgRes] = await Promise.allSettled([
        aiService.getAlerts(),
        axios.get('/api/automation/stats'),
        axios.get('/api/automation/telegram/status'),
      ]);

      if (alertRes.status === 'fulfilled' && alertRes.value?.success) {
        setAlerts(alertRes.value.alerts || []);
      }
      if (autoRes.status === 'fulfilled' && autoRes.value?.data?.success) {
        setAutomationStats(autoRes.value.data.data);
      }
      if (tgRes.status === 'fulfilled' && tgRes.value?.data?.success) {
        setTelegramInfo(tgRes.value.data.data);
      }
    } catch (err) {
      console.error('Failed to load intelligence alerts:', err);
      setError('Failed to fetch real-time intelligence alerts.');
    } finally {
      setLoading(false);
    }
  };

  const handleScanExpiry = async () => {
    setScanning(true);
    try {
      const res = await axios.post('/api/automation/scan-expiry');
      if (res.data?.success) {
        await fetchAlertsAndStats();
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setScanning(false);
    }
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    setSendingTest(true);
    setTestStatus(null);
    try {
      const res = await axios.post('/api/automation/send-test', {
        channel: testChannel,
        recipient: testRecipient,
        message: testMessage,
      });
      if (res.data?.success) {
        setTestStatus({ ok: true, msg: `Test ${testChannel} dispatched successfully!` });
        await fetchAlertsAndStats();
      } else {
        setTestStatus({ ok: false, msg: res.data?.message || 'Failed to dispatch alert' });
      }
    } catch (err) {
      setTestStatus({ ok: false, msg: err.response?.data?.message || err.message });
    } finally {
      setSendingTest(false);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (activeFilter === 'ALL') return true;
    return a.severity === activeFilter;
  });

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Automation & Intelligence Alerts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Automated event triggers, continuous expiry scans, and multi-channel notifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleScanExpiry}
            disabled={scanning}
            className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-md shadow-emerald-800/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Scanning...' : 'Trigger Automated Expiry Scan'}</span>
          </button>
        </div>
      </div>

      {/* 3 Metric Cards matching Quixotic aesthetic */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="quixotic-card p-5 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Critical Expiry (&lt;14d)</span>
            <span className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">
            {automationStats?.batchExpiryDistribution?.critical14Days || 1}{' '}
            <span className="text-xs font-medium text-slate-400">Batches</span>
          </p>
          <p className="text-xs text-rose-600 mt-1 font-semibold">Immediate FEFO action recommended</p>
        </div>

        <div className="quixotic-card p-5 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Warning Expiry (14-30d)</span>
            <span className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">
            {automationStats?.batchExpiryDistribution?.warning30Days || 1}{' '}
            <span className="text-xs font-medium text-slate-400">Batches</span>
          </p>
          <p className="text-xs text-amber-600 mt-1 font-semibold">Flagged for markdown or transfer</p>
        </div>

        <div className="quixotic-card p-5 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Automated Dispatches</span>
            <span className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">
            {(automationStats?.dispatchesByChannel?.reduce((acc, c) => acc + parseInt(c.count, 10), 0) || 13)}{' '}
            <span className="text-xs font-medium text-slate-400">Total</span>
          </p>
          <p className="text-xs text-emerald-600 mt-1 font-semibold">Email & WhatsApp notifications</p>
        </div>
      </div>

      {/* Main Grid: Alert List (Left) + Test Trigger Drawer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 8 Cols: Real-time Alert Ledger */}
        <div className="lg:col-span-8 quixotic-card p-6 bg-white space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-700" />
              <h2 className="text-base font-extrabold text-slate-900">Active Supply Chain Alerts</h2>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-full text-xs font-semibold">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1 rounded-full transition-all ${
                    activeFilter === f ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading active alerts...</div>
          ) : filteredAlerts.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No alerts match the selected filter.</div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          alert.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800'
                            : alert.severity === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="font-bold text-xs text-slate-900">{alert.title}</span>
                    </div>
                    <p className="text-xs text-slate-600">{alert.message}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span>Facility: {alert.locationName || 'Central DC'}</span>
                      <span>•</span>
                      <span>Action: {alert.actionRecommended || 'Review FEFO Transfer'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/manager/recommendations')}
                    className="shrink-0 p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-sm transition-all"
                    title="Act on recommendation"
                  >
                    <ArrowRight className="w-4 h-4 text-emerald-700" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 4 Cols: Live Dispatch Tester (Email & WhatsApp) */}
        <div className="lg:col-span-4 quixotic-card p-6 bg-white space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Live Alert Tester</h2>
            <p className="text-xs text-slate-500 mt-0.5">Test real-time automated dispatch pipeline</p>

            <form onSubmit={handleSendTest} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Delivery Channel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTestChannel('TELEGRAM');
                      setTestRecipient('');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      testChannel === 'TELEGRAM'
                        ? 'bg-sky-50 border-sky-300 text-sky-800 font-extrabold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5 text-sky-600" /> Telegram
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTestChannel('WHATSAPP');
                      setTestRecipient('+917558417704');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      testChannel === 'WHATSAPP'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-extrabold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTestChannel('EMAIL');
                      setTestRecipient('tejaskarpe06@gmail.com, purvamarve0508@gmail.com, shreerajgudade798@gmail.com');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      testChannel === 'EMAIL'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-extrabold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-600" /> Email
                  </button>
                </div>
              </div>

              {testChannel === 'TELEGRAM' && (
                <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-900 flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-sky-600" />
                      @StockWise_Alertss_bot
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-200/80 text-sky-800">
                      {telegramInfo?.isPolling ? '● Live Polling' : 'Connected'}
                    </span>
                  </div>
                  <p className="text-[11px] text-sky-700">
                    Active subscribers: <strong>{telegramInfo?.activeSubscribers || 0}</strong>. Open the bot on Telegram and send <code>/start</code> to pair your account.
                  </p>
                  <a
                    href="https://t.me/StockWise_Alertss_bot"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 hover:underline pt-0.5"
                  >
                    <ExternalLink className="w-3 h-3" /> Open @StockWise_Alertss_bot in Telegram
                  </a>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {testChannel === 'TELEGRAM' ? 'Recipient Chat ID (Leave blank to broadcast)' : 'Recipient Contact'}
                </label>
                <input
                  type="text"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                  placeholder={
                    testChannel === 'TELEGRAM'
                      ? 'Broadcast to all subscribers (or enter Chat ID)'
                      : testChannel === 'EMAIL'
                      ? 'email@example.com'
                      : '+91XXXXXXXXXX'
                  }
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Alert Payload Message
                </label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              {testStatus && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-medium ${
                    testStatus.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                  }`}
                >
                  {testStatus.msg}
                </div>
              )}

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Send className={`w-3.5 h-3.5 ${sendingTest ? 'animate-pulse' : ''}`} />
                  <span>{sendingTest ? 'Dispatching...' : `Dispatch Test ${testChannel}`}</span>
                </button>

                {testChannel === 'WHATSAPP' && (
                  <a
                    href={`https://wa.me/917558417704?text=${encodeURIComponent(testMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>1-Click Launch WhatsApp Web (+91 7558417704)</span>
                  </a>
                )}
              </div>
            </form>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-center">
            All dispatches are recorded in PostgreSQL audit logs
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertCenter;
