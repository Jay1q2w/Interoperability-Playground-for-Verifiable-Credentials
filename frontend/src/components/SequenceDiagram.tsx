import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { ProtocolExchangeStep } from '../types';
import { Check } from 'lucide-react';

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
      theme: 'base',
      themeVariables: {
        darkMode: true,
        background: '#09090b',
        mainBkg: '#18181b',
        actorBkg: '#18181b',
        actorBorder: '#3f3f46',
        actorTextColor: '#f4f4f5',
        actorLineColor: '#52525b',
        signalColor: '#a1a1aa',
        signalTextColor: '#e4e4e7',
        labelBoxBkgColor: '#27272a',
        labelBoxBorderColor: '#3f3f46',
        labelTextColor: '#f4f4f5',
        sequenceNumberColor: '#09090b'
      },
      sequence: {
        showSequenceNumbers: true,
        actorMargin: 40,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        messageMargin: 20
      }
    });

    if (containerRef.current && steps.length > 0) {
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
    <div className="border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md rounded-xl p-5 flex flex-col shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800/80">
        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            Protocol Exchange Sequence
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            OpenID4VCI & OpenID4VP request-response timeline
          </p>
        </div>

        {isRunning && (
          <span className="font-mono text-[10px] text-zinc-400 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
            <span>Exchanging Payloads</span>
          </span>
        )}
      </div>

      {/* Step Selector Chips */}
      <div className="flex flex-wrap gap-1.5 mb-4 pb-3 border-b border-zinc-850">
        {steps.map((step, idx) => {
          const isSelected = selectedStepIndex === idx;
          return (
            <button
              key={step.id}
              onClick={() => onSelectStep(idx)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center space-x-1.5 transition-all duration-150 border ${
                isSelected
                  ? 'border-blue-600/80 bg-[#0e2448]/90 text-white shadow-sm ring-1 ring-blue-500/20'
                  : 'border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/60'
              }`}
            >
              <span className="text-zinc-500">{step.stepIndex}.</span>
              <span className="truncate max-w-[130px]">{step.title}</span>
              {step.status === 'SUCCESS' ? (
                <Check className="w-3 h-3 text-zinc-400 stroke-[2.5]" />
              ) : (
                <span className="text-zinc-400 text-[10px] font-bold">!</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mermaid Render Box */}
      <div className="bg-zinc-950/50 backdrop-blur-sm rounded-lg p-4 border border-zinc-800/70 flex items-center justify-center min-h-[200px] overflow-x-auto">
        {steps.length === 0 ? (
          <div className="text-center py-10 font-mono text-xs text-zinc-600">
            Awaiting flow initiation. Click "Run Interoperability Flow".
          </div>
        ) : (
          <div ref={containerRef} className="w-full flex justify-center [&_svg]:max-w-full" />
        )}
      </div>
    </div>
  );
};
