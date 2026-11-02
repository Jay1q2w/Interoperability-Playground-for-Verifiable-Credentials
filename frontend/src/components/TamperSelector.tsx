import React, { useState, useEffect } from 'react';
import { TamperScenario, TamperItem } from '../types';
import { AlertCircle, RotateCcw, ShieldCheck, ChevronDown, ChevronUp, Bug } from 'lucide-react';

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
  const activeScenario = scenarios.find((s) => s.id === tamperScenario);
  const [isExpanded, setIsExpanded] = useState<boolean>(isTampered);

  // Auto-expand if a tamper scenario is active
  useEffect(() => {
    if (isTampered) {
      setIsExpanded(true);
    }
  }, [isTampered]);

  return (
    <div
      className={`border rounded-xl p-4 transition-all duration-150 backdrop-blur-md shadow-sm ${
        isTampered
          ? 'border-amber-900/70 bg-amber-950/25'
          : 'border-zinc-800/80 bg-zinc-950/70'
      }`}
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isTampered
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            {isTampered ? <Bug className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-mono text-xs uppercase tracking-wider text-zinc-200 font-medium">
                Negative-Path & Replay Security Testing
              </h3>
              {isTampered ? (
                <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800 uppercase font-semibold">
                  Tamper Injected: {tamperScenario}
                </span>
              ) : (
                <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 uppercase">
                  Clean Conformance
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {isTampered
                ? `Active attack: ${activeScenario?.name} (Expected outcome: ${activeScenario?.expectedOutcome})`
                : 'Inject signature corruption, expired validity, replayed nonces, or audience mismatches to test Inji Verify'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {isTampered && (
            <button
              onClick={() => {
                onSelectTamper('NONE');
                setIsExpanded(false);
              }}
              className="font-mono text-xs px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 flex items-center space-x-1.5 transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-zinc-400" />
              <span>Reset Clean</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="font-mono text-xs px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 flex items-center space-x-1 transition-colors"
          >
            <span>{isExpanded ? 'Collapse' : 'Configure Attacks'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Grid of Scenarios */}
      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-zinc-850">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {scenarios.map((item) => {
              const isSelected = item.id === tamperScenario;
              const isClean = item.id === 'NONE';

              return (
                <div
                  key={item.id}
                  onClick={() => !disabled && onSelectTamper(item.id)}
                  className={`p-2.5 rounded-lg border transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? isClean
                        ? 'border-blue-600/80 bg-[#0a1628]/85 backdrop-blur-md text-white shadow-sm ring-1 ring-blue-500/20'
                        : 'border-amber-700/90 bg-amber-950/40 backdrop-blur-md text-amber-100'
                      : 'border-zinc-800/60 bg-zinc-900/30 backdrop-blur-sm hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium text-xs text-zinc-200">{item.name}</span>
                    {isSelected && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full mt-1 ${
                          isClean ? 'bg-blue-400' : 'bg-amber-400'
                        }`}
                      />
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="mt-2 pt-1.5 border-t border-zinc-850/60 flex items-center justify-between text-[9px] font-mono text-zinc-400">
                    <span>{item.category}</span>
                    <span className="font-semibold text-zinc-300">{item.expectedOutcome}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Tamper Explanation Banner */}
          {isTampered && activeScenario && (
            <div className="mt-3 p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg flex items-start space-x-2.5 text-xs text-zinc-300">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="font-mono text-[11px] leading-relaxed">
                <span className="text-zinc-500 uppercase tracking-wider">Expected Assertion: </span>
                <span>
                  Inji Verify must reject the presentation submission with status code{' '}
                  <strong className="text-amber-300 underline underline-offset-2">{activeScenario.expectedOutcome}</strong>.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
