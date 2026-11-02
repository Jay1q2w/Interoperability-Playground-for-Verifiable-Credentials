import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { MatrixDashboardPage } from './pages/MatrixDashboardPage';
import { GapsReportPage } from './pages/GapsReportPage';
import { fetchModules, runTestSuite } from './services/api';
import { ModuleItem, ProfileItem, TamperItem, CredentialProfileId } from './types';
import { AlertCircle, RefreshCw } from 'lucide-react';
import worldMapBackdrop from './assets/world-id-map.png';

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
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400">
        <div className="w-4 h-4 border-2 border-zinc-700 border-t-zinc-200 rounded-full animate-spin mb-3" />
        <div className="font-mono text-xs uppercase tracking-widest text-zinc-300">
          Inji Interop Playground
        </div>
        <p className="font-mono text-[10px] text-zinc-600 mt-1">
          Loading OpenID4VC Modules & Cryptographic Suite
        </p>
      </div>
    );
  }

  if (error || !modules) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-sm text-center shadow-xl">
          <AlertCircle className="w-6 h-6 text-zinc-400 mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-white mb-1">Service Connection Error</h2>
          <p className="text-xs text-zinc-400 mb-5 font-mono">{error || 'Unable to connect to BFF backend'}</p>
          <button
            onClick={loadModules}
            className="px-4 py-2 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs flex items-center space-x-1.5 mx-auto transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-zinc-800 selection:text-white relative overflow-x-hidden">
      {/* Ambient Global Identity Interoperability Backdrop */}
      <div 
        aria-hidden="true" 
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none flex items-start justify-center"
      >
        {/* Subtle radial sovereign blue glow */}
        <div className="absolute top-[-100px] w-[1100px] h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(14,36,72,0.45),transparent_70%)]" />

        {/* Ambient World Map Image seamlessly blended with mask and soft opacity */}
        <img
          src={worldMapBackdrop}
          alt=""
          className="absolute top-10 max-w-[1280px] w-[95vw] opacity-[0.16] bg-ambient-mask mix-blend-screen transform scale-105 pointer-events-none"
        />

        {/* Bottom subtle atmospheric depth vignette */}
        <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent pointer-events-none" />
      </div>

      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRunSuite={handleRunSuite}
        isRunningSuite={isRunningSuite}
        suiteProgress={suiteProgress}
      />

      {/* Main Content Area */}
      <main className="flex-1 relative z-10">
        {activeTab === 'playground' && <PlaygroundPage modules={modules} />}
        {activeTab === 'matrix' && <MatrixDashboardPage />}
        {activeTab === 'gaps' && <GapsReportPage />}
      </main>
    </div>
  );
};

export default App;
