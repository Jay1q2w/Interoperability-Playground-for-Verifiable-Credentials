import React from 'react';
import { TamperScenario, TamperItem } from '../types';
import { AlertCircle, RotateCcw } from 'lucide-react';

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

  return (
    <div
      className={`border rounded-xl p-5 transition-all duration-150 ${
        isTampered
          ? 'border-amber-900/60 bg-amber-950/10'
          : 'border-zinc-800 bg-zinc-950'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
              Replay & Negative-Path Testing Mode
            </h3>
            {isTampered && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60 uppercase">
                Tamper Injected
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Inject deliberate cryptographic, temporal, or audience flaws to verify Inji Verify's assertion engine
          </p>
        </div>

        {isTampered && (
          <button
            onClick={() => onSelectTamper('NONE')}
            className="self-start sm:self-auto font-mono text-xs px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 flex items-center space-x-1.5 transition-colors"
          >
            <RotateCcw className="w-3 h-3 text-zinc-400" />
            <span>Reset to Clean</span>
          </button>
        )}
      </div>

      {/* Grid of Scenarios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {scenarios.map((item) => {
          const isSelected = item.id === tamperScenario;
          const isClean = item.id === 'NONE';

          return (
            <div
              key={item.id}
              onClick={() => !disabled && onSelectTamper(item.id)}
              className={`p-3 rounded-lg border transition-all duration-150 cursor-pointer ${
                isSelected
                  ? isClean
                    ? 'border-zinc-300 bg-zinc-900/90 text-white'
                    : 'border-amber-700/80 bg-amber-950/30 text-amber-100'
                  : 'border-zinc-850 bg-zinc-900/30 hover:border-zinc-750 text-zinc-400 hover:text-zinc-200'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-start justify-between">
                <span className="font-medium text-xs text-zinc-200">{item.name}</span>
                {isSelected && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      isClean ? 'bg-zinc-200' : 'bg-amber-400'
                    }`}
                  />
                )}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
              <div className="mt-2.5 pt-2 border-t border-zinc-850/60 flex items-center justify-between text-[9px] font-mono text-zinc-500">
                <span>{item.category}</span>
                <span className="font-semibold text-zinc-400">{item.expectedOutcome}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Tamper Explanation Banner */}
      {isTampered && activeScenario && (
        <div className="mt-4 p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg flex items-start space-x-2.5 text-xs text-zinc-300">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="font-mono text-[11px] leading-relaxed">
            <span className="text-zinc-500 uppercase tracking-wider">Expected Assertion: </span>
            <span>
              Inji Verify must reject the submission with status code{' '}
              <strong className="text-amber-300 underline underline-offset-2">{activeScenario.expectedOutcome}</strong>.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
