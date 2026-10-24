import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { MatrixDashboardPage } from './pages/MatrixDashboardPage';
import { GapsReportPage } from './pages/GapsReportPage';
import { fetchModules, runTestSuite } from './services/api';
import { ModuleItem, ProfileItem, TamperItem, CredentialProfileId } from './types';
import { ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'playground' | 'matrix' | 'gaps'>('playground');
  const [modules, setModules] = useState<{
    issuers: ModuleItem[];
    wallets: ModuleItem[];
    verifiers: ModuleItem[];
    profiles: Record<CredentialProfileId, ProfileItem>;
    tamperScenarios: TamperItem[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isRunningSuite, setIsRunningSuite] = useState(false);
  const [suiteProgress, setSuiteProgress] = useState<{ current: number; total: number } | undefined>();

  const loadModules = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchModules();
      setModules(data);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModules();
  }, []);

  const handleRunSuite = async () => {
    setIsRunningSuite(true);
    setSuiteProgress({ current: 0, total: 12 });
    try {
      await runTestSuite();
      // Auto switch to matrix tab to view results!
      setActiveTab('matrix');
    } catch (err: unknown) {
      alert(`Automated Suite error: ${(err as Error).message}`);
    } finally {
      setIsRunningSuite(false);
      setSuiteProgress(undefined);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-inji-600 to-mosip-500 flex items-center justify-center shadow-lg shadow-inji-500/20 mb-4 animate-pulse">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div className="font-semibold text-sm tracking-wide">Loading Inji Interoperability Playground...</div>
        <p className="text-xs text-slate-500 font-mono mt-1">Initializing Cryptographic Keys & Protocols</p>
      </div>
    );
  }

  if (error || !modules) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md text-center shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white mb-2">Backend Service Connection Error</h2>
          <p className="text-xs text-slate-400 mb-6 font-mono">{error || 'Unable to load module configuration'}</p>
          <button
            onClick={loadModules}
            className="px-5 py-2.5 rounded-xl bg-inji-600 hover:bg-inji-500 text-white font-semibold text-xs shadow-md shadow-inji-500/20 flex items-center space-x-2 mx-auto transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation & Action Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRunSuite={handleRunSuite}
        isRunningSuite={isRunningSuite}
        suiteProgress={suiteProgress}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'playground' && <PlaygroundPage modules={modules} />}
        {activeTab === 'matrix' && <MatrixDashboardPage />}
        {activeTab === 'gaps' && <GapsReportPage />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-850 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span>MOSIP Decode 2026</span>
            <span className="mx-2">•</span>
            <span>Inji Verifiable Credentials Interoperability Playground</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>OpenID4VCI draft 13</span>
            <span>OpenID4VP draft 21–23</span>
            <span>W3C VC 1.1/2.0</span>
            <span>SD-JWT VC</span>
            <span>ISO 18013-5 mdoc</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
