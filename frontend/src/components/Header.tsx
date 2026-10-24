import React from 'react';
import { ArrowUpRight } from 'lucide-react';

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
    <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center">
          <span className="font-semibold text-sm tracking-tight text-white uppercase">
            Inji Interoperability Playground
          </span>
        </div>

        {/* Navigation Tabs (Minimalist Segmented Control) */}
        <nav className="flex items-center p-0.5 rounded-lg border border-zinc-800 bg-zinc-900/50">
          <button
            onClick={() => onTabChange('playground')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
              activeTab === 'playground'
                ? 'bg-[#0f1f38] text-white border border-blue-900/80 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Playground
          </button>

          <button
            onClick={() => onTabChange('matrix')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
              activeTab === 'matrix'
                ? 'bg-[#0f1f38] text-white border border-blue-900/80 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Matrix & Telemetry
          </button>

          <button
            onClick={() => onTabChange('gaps')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
              activeTab === 'gaps'
                ? 'bg-[#0f1f38] text-white border border-blue-900/80 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Interoperability Gaps
          </button>
        </nav>

        {/* Action Button: Solid Dark Blue & White */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onRunSuite}
            disabled={isRunningSuite}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 flex items-center space-x-1.5 active:scale-[0.98] ${
              isRunningSuite
                ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                : 'bg-[#0e2448] hover:bg-[#122e5c] text-white border border-blue-800/90 shadow-sm'
            }`}
          >
            {isRunningSuite ? (
              <>
                <span className="w-3 h-3 border-2 border-blue-400 border-t-white rounded-full animate-spin" />
                <span className="font-mono text-[11px] text-blue-100">
                  {suiteProgress ? `Running ${suiteProgress.current}/${suiteProgress.total}` : 'Executing Suite...'}
                </span>
              </>
            ) : (
              <>
                <span>Run Matrix Test Suite</span>
                <ArrowUpRight className="w-3 h-3 text-blue-200" />
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
