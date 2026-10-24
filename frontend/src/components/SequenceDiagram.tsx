import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { ProtocolExchangeStep } from '../types';
import { GitCommit, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

interface SequenceDiagramProps {
  steps: ProtocolExchangeStep[];
  selectedStepIndex: number;
  onSelectStep: (index: number) => void;
  isRunning: boolean;
}

export const SequenceDiagram: React.FC<SequenceDiagramProps> = ({
  steps,
  selectedStepIndex,
  onSelectStep,
  isRunning
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        darkMode: true,
        background: '#0f172a',
        primaryColor: '#0284c7',
        primaryTextColor: '#f8fafc',
        primaryBorderColor: '#38bdf8',
        lineColor: '#64748b',
        secondaryColor: '#16a34a',
        tertiaryColor: '#4f46e5'
      },
      sequence: {
        showSequenceNumbers: true,
        actorMargin: 50,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        messageMargin: 25
      }
    });

    if (containerRef.current && steps.length > 0) {
      // Build Mermaid Sequence Diagram markup
      let chart = `sequenceDiagram\n`;
      chart += `  autonumber\n`;
      chart += `  actor Issuer as Credential Issuer\n`;
      chart += `  actor Wallet as Holder Wallet\n`;
      chart += `  actor Verifier as Verifier Relying Party\n\n`;

      steps.forEach((s) => {
        const arrow = s.status === 'ERROR' ? '--x' : '->>';
        chart += `  ${s.source}${arrow}${s.target}: ${s.title.replace(/:/g, ' - ')}\n`;
      });

      const uniqueId = `mermaid-seq-${Date.now()}`;
      mermaid.render(uniqueId, chart).then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      }).catch((err) => {
        console.error('Mermaid render error:', err);
      });
    }
  }, [steps]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-inji-500/10 text-inji-400 flex items-center justify-center border border-inji-500/20">
            <GitCommit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-100 uppercase tracking-wider">
              Protocol Exchange Sequence
            </h3>
            <p className="text-[11px] text-slate-400">
              Interactive OpenID4VCI & OpenID4VP request-response timeline
            </p>
          </div>
        </div>

        {isRunning && (
          <div className="flex items-center space-x-2 text-xs text-inji-400 font-mono animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>Exchanging payloads...</span>
          </div>
        )}
      </div>

      {/* Step Timeline Chips */}
      <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b border-slate-800/80">
        {steps.map((step, idx) => {
          const isSelected = selectedStepIndex === idx;
          return (
            <button
              key={step.id}
              onClick={() => onSelectStep(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition-all border ${
                isSelected
                  ? 'bg-inji-600 text-white border-inji-400 shadow-md ring-1 ring-inji-400'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-700/60'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-900 text-[10px] flex items-center justify-center font-bold">
                {step.stepIndex}
              </span>
              <span className="truncate max-w-[140px]">{step.title}</span>
              {step.status === 'SUCCESS' ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : (
                <span className="text-[10px] text-red-400 font-bold">!</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mermaid Diagram Render Box */}
      <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 flex items-center justify-center min-h-[220px] overflow-x-auto">
        {steps.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            <GitCommit className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Click "Run Interoperability Flow" below to start the live exchange.</p>
          </div>
        ) : (
          <div ref={containerRef} className="w-full flex justify-center [&_svg]:max-w-full" />
        )}
      </div>
    </div>
  );
};
