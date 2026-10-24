import React from 'react';
import { ShieldCheck, Play, Activity, Sparkles, Layers, FileText } from 'lucide-react';

interface HeaderProps {
  activeTab: 'playground' | 'matrix' | 'gaps';
  onTabChange: (tab: 'playground' | 'matrix' | 'gaps') => void;
  onRunSuite: () => void;
  isRunningSuite: boolean;
  suiteProgress?: { current: number; total: number };
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onRunSuite,
  isRunningSuite,
  suiteProgress
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-inji-600 to-mosip-500 flex items-center justify-center shadow-lg shadow-inji-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white tracking-tight">Inji Interop Playground</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-inji-500/20 text-inji-400 border border-inji-500/30">
                MOSIP Stack
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-mosip-500/20 text-mosip-400 border border-mosip-500/30">
                OpenID4VCI & VP
              </span>
            </div>
            <p className="text-xs text-slate-400">Verifiable Credentials Cross-Ecosystem Test Sandbox</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
          <button
            onClick={() => onTabChange('playground')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeTab === 'playground'
                ? 'bg-inji-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Interactive Playground</span>
          </button>

          <button
            onClick={() => onTabChange('matrix')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeTab === 'matrix'
                ? 'bg-inji-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Interop Matrix & Runs</span>
          </button>

          <button
            onClick={() => onTabChange('gaps')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeTab === 'gaps'
                ? 'bg-inji-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Interoperability Gaps</span>
          </button>
        </nav>

        {/* Action Button: Automated Matrix CI Suite */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onRunSuite}
            disabled={isRunningSuite}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all shadow-md ${
              isRunningSuite
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-mosip-600 to-inji-600 hover:from-mosip-500 hover:to-inji-500 text-white shadow-mosip-500/20 active:scale-95'
            }`}
          >
            {isRunningSuite ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-mosip-400 border-t-transparent rounded-full animate-spin" />
                <span>
                  Testing {suiteProgress ? `${suiteProgress.current}/${suiteProgress.total}` : 'Matrix...'}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>Run 12-Test Matrix Suite</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
