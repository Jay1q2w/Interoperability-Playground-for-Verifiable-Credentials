import React from 'react';
import { TamperScenario, TamperItem } from '../types';
import { AlertTriangle, ShieldAlert, Sparkles, Bug } from 'lucide-react';

interface TamperSelectorProps {
  tamperScenario: TamperScenario;
  scenarios: TamperItem[];
  onSelectTamper: (scenario: TamperScenario) => void;
  disabled?: boolean;
}

export const TamperSelector: React.FC<TamperSelectorProps> = ({
  tamperScenario,
  scenarios,
  onSelectTamper,
  disabled = false
}) => {
  const isTampered = tamperScenario !== 'NONE';
  const activeScenario = scenarios.find(s => s.id === tamperScenario);

  return (
    <div className={`rounded-2xl border p-5 transition-all shadow-xl ${
      isTampered 
        ? 'bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/40' 
        : 'bg-slate-900/90 border-slate-800'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
            isTampered 
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            <Bug className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-sm text-slate-100 uppercase tracking-wider">
                Replay & Tamper Mode
              </h3>
              {isTampered && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                  ACTIVE TAMPER INJECTION
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Deliberately corrupt payloads to evaluate Inji Verify negative-path resilience
            </p>
          </div>
        </div>

        {/* Quick Clear Button */}
        {isTampered && (
          <button
            onClick={() => onSelectTamper('NONE')}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-medium transition-all"
          >
            Reset to Clean Flow
          </button>
        )}
      </div>

      {/* Tamper Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {scenarios.map((item) => {
          const isSelected = item.id === tamperScenario;
          const isClean = item.id === 'NONE';

          return (
            <div
              key={item.id}
              onClick={() => !disabled && onSelectTamper(item.id)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? isClean
                    ? 'bg-slate-800 border-inji-500 text-white ring-1 ring-inji-500 shadow-md'
                    : 'bg-amber-950/50 border-amber-500 text-amber-200 ring-1 ring-amber-500 shadow-md shadow-amber-500/10'
                  : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs text-white">{item.name}</span>
                {isSelected && (
                  <span className={`w-2 h-2 rounded-full ${isClean ? 'bg-inji-400' : 'bg-amber-400'}`} />
                )}
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-2 mt-1">{item.description}</p>
              <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-slate-500">
                <span>{item.category}</span>
                <span className="text-amber-400/80 font-bold">{item.expectedOutcome}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Tamper Explanation Banner */}
      {isTampered && activeScenario && (
        <div className="mt-4 p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200">
            <span className="font-bold">Security Test Expectation: </span>
            <span>
              Inji Verify must detect this violation and flag the verification with status{' '}
              <strong className="underline text-amber-300">{activeScenario.expectedOutcome}</strong>.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
