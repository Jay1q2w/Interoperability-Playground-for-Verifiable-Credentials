import React, { useState, useEffect } from 'react';
import { InteropRunRecord, MatrixStats, IssuerId, WalletId, VerifierId, CredentialFormat, VerificationStatus } from '../types';
import { fetchRuns, fetchStats, clearRuns } from '../services/api';
import { 
  Layers, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Download, 
  Trash2, 
  Filter, 
  Activity, 
  ShieldCheck, 
  ExternalLink, 
  RefreshCw 
} from 'lucide-react';

export const MatrixDashboardPage: React.FC = () => {
  const [runs, setRuns] = useState<InteropRunRecord[]>([]);
  const [stats, setStats] = useState<MatrixStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterIssuer, setFilterIssuer] = useState<string>('');
  const [filterWallet, setFilterWallet] = useState<string>('');
  const [filterVerifier, setFilterVerifier] = useState<string>('');
  const [filterFormat, setFilterFormat] = useState<string>('');
  const [filterOutcome, setFilterOutcome] = useState<string>('');

  const [selectedRun, setSelectedRun] = useState<InteropRunRecord | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [runsData, statsData] = await Promise.all([
        fetchRuns({
          issuerId: filterIssuer || undefined,
          walletId: filterWallet || undefined,
          verifierId: filterVerifier || undefined,
          format: filterFormat || undefined,
          outcome: filterOutcome || undefined
        }),
        fetchStats()
      ]);
      setRuns(runsData.runs);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load matrix data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterIssuer, filterWallet, filterVerifier, filterFormat, filterOutcome]);

  const handleClearHistory = async () => {
    if (confirm('Are you sure you want to clear all historical interoperability runs?')) {
      await clearRuns();
      loadData();
    }
  };

  const handleDownloadMarkdown = () => {
    window.open('/api/matrix/report/markdown', '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Interoperability Matrix & Telemetry Dashboard</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Historical test runs, pass/fail compatibility matrix, and regression metrics across Inji modules.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownloadMarkdown}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-inji-400" />
            <span>Export Markdown Report</span>
          </button>
          <button
            onClick={handleClearHistory}
            className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 transition-colors"
            title="Clear History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Metrics Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
              <span>TOTAL TEST RUNS</span>
              <Activity className="w-4 h-4 text-inji-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{stats.total}</div>
            <p className="text-[11px] text-slate-500 mt-1">Across all formats & modules</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
              <span>OVERALL PASS RATE</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">{stats.passRate}%</div>
            <p className="text-[11px] text-slate-500 mt-1">
              {stats.passed} passed / {stats.failed} rejected
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
              <span>AVG LATENCY</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-400 tracking-tight">{stats.avgLatencyMs} ms</div>
            <p className="text-[11px] text-slate-500 mt-1">End-to-end verification speed</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
              <span>FORMAT COVERAGE</span>
              <ShieldCheck className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-400 tracking-tight">3 Standards</div>
            <p className="text-[11px] text-slate-500 mt-1">W3C VC, SD-JWT VC, mDoc</p>
          </div>
        </div>
      )}

      {/* Compatibility Grid Matrix */}
      {stats && stats.matrixCells.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-inji-400" />
            <span>Module Interoperability Compatibility Grid</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3">Issuer Module</th>
                  <th className="p-3">Wallet Module</th>
                  <th className="p-3">Verifier Module</th>
                  <th className="p-3">Format</th>
                  <th className="p-3 text-center">Total Runs</th>
                  <th className="p-3 text-center">Pass</th>
                  <th className="p-3 text-center">Fail</th>
                  <th className="p-3 text-center">Last Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {stats.matrixCells.map((cell, idx) => {
                  const isPass = cell.lastOutcome === 'VALID';
                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-semibold text-white">{cell.issuerId}</td>
                      <td className="p-3 text-slate-300">{cell.walletId}</td>
                      <td className="p-3 text-slate-300">{cell.verifierId}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-inji-300 border border-slate-700 text-[10px]">
                          {cell.format}
                        </span>
                      </td>
                      <td className="p-3 text-center text-slate-300">{cell.totalRuns}</td>
                      <td className="p-3 text-center text-emerald-400 font-bold">{cell.passedRuns}</td>
                      <td className="p-3 text-center text-red-400 font-bold">{cell.failedRuns}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isPass
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {cell.lastOutcome}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filterable Runs History Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <Filter className="w-4 h-4 text-inji-400" />
            <span>Test Runs Log ({runs.length})</span>
          </h3>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value)}
              className="bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-2.5 py-1 text-xs"
            >
              <option value="">All Formats</option>
              <option value="ldp_vc">ldp_vc (W3C VC)</option>
              <option value="vc+sd-jwt">vc+sd-jwt (SD-JWT)</option>
              <option value="mso_mdoc">mso_mdoc (mDoc)</option>
            </select>

            <select
              value={filterOutcome}
              onChange={(e) => setFilterOutcome(e.target.value)}
              className="bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-2.5 py-1 text-xs"
            >
              <option value="">All Outcomes</option>
              <option value="VALID">VALID</option>
              <option value="VALID_BUT_EXPIRED">VALID_BUT_EXPIRED</option>
              <option value="TAMPERED_SIGNATURE">TAMPERED_SIGNATURE</option>
              <option value="INVALID_NONCE">INVALID_NONCE</option>
              <option value="MISMATCHED_AUDIENCE">MISMATCHED_AUDIENCE</option>
              <option value="REVOKED">REVOKED</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Flow Combination</th>
                <th className="p-3">Format</th>
                <th className="p-3">Tamper Injection</th>
                <th className="p-3 text-center">Outcome</th>
                <th className="p-3 text-center">Latency</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 italic">
                    No interoperability runs found. Run a flow from the playground or execute the automated test matrix suite.
                  </td>
                </tr>
              ) : (
                runs.map((r) => {
                  const isCleanPass = r.outcome === 'VALID';
                  return (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-slate-400">{r.timestamp.substring(11, 19)}</td>
                      <td className="p-3 font-semibold text-white">
                        {r.issuer.id} → {r.wallet.id} → {r.verifier.id}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                          {r.format}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          r.tamperScenario === 'NONE'
                            ? 'text-slate-400'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                        }`}>
                          {r.tamperScenario}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold">
                        <span className={isCleanPass ? 'text-emerald-400' : 'text-amber-400'}>
                          {r.outcome}
                        </span>
                      </td>
                      <td className="p-3 text-center text-slate-400">{r.durationMs}ms</td>
                      <td className="p-3 text-center">
                        {r.passed ? (
                          <span className="text-emerald-400 font-bold">✓ PASS</span>
                        ) : (
                          <span className="text-red-400 font-bold">✗ FAIL</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
