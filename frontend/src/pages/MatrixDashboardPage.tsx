import React, { useState, useEffect } from 'react';
import { InteropRunRecord, MatrixStats } from '../types';
import { fetchRuns, fetchStats, clearRuns } from '../services/api';
import { Download, Trash2, RefreshCw } from 'lucide-react';

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
    if (confirm('Clear all historical interoperability runs?')) {
      await clearRuns();
      loadData();
    }
  };

  const handleDownloadMarkdown = () => {
    window.open('/api/matrix/report/markdown', '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
            Telemetry & Audit Log
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Interoperability Compatibility Matrix
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Historical test telemetry, format conformance ratios, and pass/fail audit results across Inji and external OpenID4VC modules.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="p-2 rounded-md bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
            title="Refresh Table"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDownloadMarkdown}
            className="px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-mono flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3 h-3 text-zinc-400" />
            <span>Export Markdown</span>
          </button>
          <button
            onClick={handleClearHistory}
            className="p-2 rounded-md bg-zinc-900 hover:bg-zinc-850 text-zinc-500 hover:text-zinc-300 border border-zinc-800 transition-colors"
            title="Clear History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="border border-blue-900/70 bg-[#0a1628]/80 backdrop-blur-md rounded-xl p-4 shadow-sm">
            <span className="font-mono text-[10px] uppercase text-blue-300/80 tracking-wider block">
              Total Executed Runs
            </span>
            <div className="text-2xl font-semibold text-white tracking-tight mt-1 font-mono">
              {stats.total}
            </div>
            <span className="font-mono text-[10px] text-zinc-400 mt-1 block">All modules & formats</span>
          </div>

          <div className="border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md rounded-xl p-4 shadow-sm">
            <span className="font-mono text-[10px] uppercase text-zinc-500 tracking-wider block">
              Test Conformance Rate
            </span>
            <div className="text-2xl font-semibold text-zinc-100 tracking-tight mt-1 font-mono">
              {stats.passRate}%
            </div>
            <span className="font-mono text-[10px] text-zinc-500 mt-1 block">
              {stats.passed} passed / {stats.failed} rejected
            </span>
          </div>

          <div className="border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md rounded-xl p-4 shadow-sm">
            <span className="font-mono text-[10px] uppercase text-zinc-500 tracking-wider block">
              Mean Verification Latency
            </span>
            <div className="text-2xl font-semibold text-zinc-100 tracking-tight mt-1 font-mono">
              {stats.avgLatencyMs} <span className="text-sm font-normal text-zinc-500">ms</span>
            </div>
            <span className="font-mono text-[10px] text-zinc-500 mt-1 block">End-to-end evaluation</span>
          </div>

          <div className="border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md rounded-xl p-4 shadow-sm">
            <span className="font-mono text-[10px] uppercase text-zinc-500 tracking-wider block">
              Active Format Coverage
            </span>
            <div className="text-2xl font-semibold text-zinc-100 tracking-tight mt-1 font-mono">
              3 Standards
            </div>
            <span className="font-mono text-[10px] text-zinc-500 mt-1 block">ldp_vc, vc+sd-jwt, mdoc</span>
          </div>
        </div>
      )}

      {/* Compatibility Cell Grid */}
      {stats && stats.matrixCells.length > 0 && (
        <div className="border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md rounded-xl p-5 shadow-sm">
          <div className="pb-3 mb-3 border-b border-zinc-800">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
              Module Compatibility Breakdown
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Aggregated test outcomes by Issuer × Wallet × Verifier permutation
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-900/40 text-zinc-500 uppercase text-[10px] font-mono border-b border-zinc-850">
                <tr>
                  <th className="py-2.5 px-3">Issuer</th>
                  <th className="py-2.5 px-3">Wallet</th>
                  <th className="py-2.5 px-3">Verifier</th>
                  <th className="py-2.5 px-3">Format</th>
                  <th className="py-2.5 px-3 text-center">Runs</th>
                  <th className="py-2.5 px-3 text-center">Pass</th>
                  <th className="py-2.5 px-3 text-center">Fail</th>
                  <th className="py-2.5 px-3 text-right">Last State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850 font-mono">
                {stats.matrixCells.map((cell, idx) => (
                  <tr key={idx} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-zinc-200">{cell.issuerId}</td>
                    <td className="py-2.5 px-3 text-zinc-400">{cell.walletId}</td>
                    <td className="py-2.5 px-3 text-zinc-400">{cell.verifierId}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-[#0d1e38] text-blue-200 border border-blue-900/60 text-[10px]">
                        {cell.format}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-zinc-400">{cell.totalRuns}</td>
                    <td className="py-2.5 px-3 text-center text-zinc-200 font-semibold">{cell.passedRuns}</td>
                    <td className="py-2.5 px-3 text-center text-zinc-400">{cell.failedRuns}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-mono text-[10px] uppercase font-semibold text-zinc-300">
                        {cell.lastOutcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historical Runs Table */}
      <div className="border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-zinc-800">
          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
              Run Audit Log ({runs.length})
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">Chronological execution history</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value)}
              className="bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-md px-2 py-1 text-xs font-mono"
            >
              <option value="">All Formats</option>
              <option value="ldp_vc">ldp_vc</option>
              <option value="vc+sd-jwt">vc+sd-jwt</option>
              <option value="mso_mdoc">mso_mdoc</option>
            </select>

            <select
              value={filterOutcome}
              onChange={(e) => setFilterOutcome(e.target.value)}
              className="bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-md px-2 py-1 text-xs font-mono"
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
            <thead className="bg-zinc-900/40 text-zinc-500 uppercase text-[10px] font-mono border-b border-zinc-850">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Permutation</th>
                <th className="py-2.5 px-3">Format</th>
                <th className="py-2.5 px-3">Mutation</th>
                <th className="py-2.5 px-3 text-center">Outcome</th>
                <th className="py-2.5 px-3 text-center">Latency</th>
                <th className="py-2.5 px-3 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850 font-mono">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-zinc-600 font-mono">
                    No runs recorded. Execute a flow from the playground or run the matrix suite.
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="py-2.5 px-3 text-zinc-500">{r.timestamp.substring(11, 19)}</td>
                    <td className="py-2.5 px-3 text-zinc-200">
                      {r.issuer.id} → {r.wallet.id} → {r.verifier.id}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 text-[10px]">
                        {r.format}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400">{r.tamperScenario}</td>
                    <td className="py-2.5 px-3 text-center text-zinc-300 font-semibold">{r.outcome}</td>
                    <td className="py-2.5 px-3 text-center text-zinc-500">{r.durationMs}ms</td>
                    <td className="py-2.5 px-3 text-right">
                      {r.passed ? (
                        <span className="text-zinc-200 font-bold">PASS</span>
                      ) : (
                        <span className="text-zinc-500 font-bold">FAIL</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
