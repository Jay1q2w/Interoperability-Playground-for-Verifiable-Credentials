import React, { useState } from 'react';
import { ProtocolExchangeStep } from '../types';
import { Code2, Copy, Download, Check, Eye, KeyRound, Terminal } from 'lucide-react';

interface ProtocolInspectorProps {
  steps: ProtocolExchangeStep[];
  selectedStepIndex: number;
  onSelectStep: (index: number) => void;
}

export const ProtocolInspector: React.FC<ProtocolInspectorProps> = ({
  steps,
  selectedStepIndex,
  onSelectStep
}) => {
  const [activeTab, setActiveTab] = useState<'response' | 'request' | 'decoded'>('response');
  const [copied, setCopied] = useState(false);

  const step = steps[selectedStepIndex] || steps[0];

  const handleCopy = (content: any) => {
    navigator.clipboard.writeText(typeof content === 'string' ? content : JSON.stringify(content, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (content: any, filename: string) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(content, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `${filename}.json`);
    dlAnchorElem.click();
  };

  // Helper to decode JWTs or SD-JWT disclosures
  const decodeTokenData = (payload: any) => {
    if (!payload) return null;

    let targetToken = '';
    if (typeof payload === 'string' && (payload.includes('.') || payload.includes('~'))) {
      targetToken = payload;
    } else if (payload.credential && typeof payload.credential === 'string') {
      targetToken = payload.credential;
    } else if (payload.vp_token && typeof payload.vp_token === 'string') {
      targetToken = payload.vp_token;
    } else if (payload.proof && payload.proof.jwt) {
      targetToken = payload.proof.jwt;
    }

    if (!targetToken) return null;

    if (targetToken.includes('~')) {
      // SD-JWT
      const parts = targetToken.split('~');
      const issuerJwt = parts[0];
      const rawDisclosures = parts.slice(1, parts.length - 1);
      const kbJwt = parts[parts.length - 1];

      let decodedIssuerJwt: any = null;
      try {
        const [h, p] = issuerJwt.split('.');
        decodedIssuerJwt = {
          header: JSON.parse(atob(h)),
          payload: JSON.parse(atob(p))
        };
      } catch (_) {}

      const decodedDisclosures = rawDisclosures.map((d) => {
        try {
          const parsed = JSON.parse(atob(d));
          return { salt: parsed[0], claimKey: parsed[1], claimValue: parsed[2] };
        } catch (_) {
          return { raw: d };
        }
      });

      let decodedKbJwt: any = null;
      if (kbJwt) {
        try {
          const [h, p] = kbJwt.split('.');
          decodedKbJwt = {
            header: JSON.parse(atob(h)),
            payload: JSON.parse(atob(p))
          };
        } catch (_) {}
      }

      return {
        type: 'SD-JWT VC',
        issuerJwt: decodedIssuerJwt,
        disclosures: decodedDisclosures,
        kbJwt: decodedKbJwt
      };
    } else if (targetToken.split('.').length >= 3) {
      // Standard JWT / JWS
      try {
        const [h, p] = targetToken.split('.');
        return {
          type: 'JWT / JWS Token',
          header: JSON.parse(atob(h)),
          payload: JSON.parse(atob(p))
        };
      } catch (_) {
        return null;
      }
    }

    return null;
  };

  const decoded = decodeTokenData(step?.responsePayload || step?.requestPayload);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <Code2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-100 uppercase tracking-wider">
              Protocol Inspector Panel
            </h3>
            <p className="text-[11px] text-slate-400">
              Raw exchanged payloads, cryptographic proofs & token structures
            </p>
          </div>
        </div>

        {/* View Tabs & Actions */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
            <button
              onClick={() => setActiveTab('response')}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                activeTab === 'response' ? 'bg-inji-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Response Payload
            </button>
            <button
              onClick={() => setActiveTab('request')}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                activeTab === 'request' ? 'bg-inji-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Request Payload
            </button>
            {decoded && (
              <button
                onClick={() => setActiveTab('decoded')}
                className={`px-2.5 py-1 rounded text-xs font-mono flex items-center space-x-1 transition-colors ${
                  activeTab === 'decoded' ? 'bg-purple-600 text-white' : 'text-purple-300 hover:text-white'
                }`}
              >
                <KeyRound className="w-3 h-3" />
                <span>Decoded Token</span>
              </button>
            )}
          </div>

          {step && (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleCopy(activeTab === 'response' ? step.responsePayload : activeTab === 'request' ? step.requestPayload : decoded)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title="Copy JSON to Clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => handleDownload(activeTab === 'response' ? step.responsePayload : step.requestPayload, `step-${step.stepIndex}-${step.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title="Download JSON Payload"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Step Metadata Bar */}
      {step && (
        <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 mb-4 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-inji-500/20 text-inji-300 border border-inji-500/30 font-semibold">
              Step {step.stepIndex}
            </span>
            <span className="text-white font-medium">{step.title}</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            {step.method && (
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold border border-slate-700">
                {step.method} {step.endpoint}
              </span>
            )}
            <span>
              {step.source} → {step.target}
            </span>
            {step.durationMs !== undefined && (
              <span className="text-slate-500">{step.durationMs}ms</span>
            )}
          </div>
        </div>
      )}

      {/* JSON Viewer Box */}
      <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex-1 overflow-auto max-h-[460px] font-mono text-xs">
        {!step ? (
          <div className="text-center py-12 text-slate-500">
            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No step selected. Run an interoperability flow to inspect payloads.</p>
          </div>
        ) : activeTab === 'decoded' && decoded ? (
          <pre className="text-purple-300 whitespace-pre-wrap break-all leading-relaxed">
            {JSON.stringify(decoded, null, 2)}
          </pre>
        ) : activeTab === 'request' ? (
          <pre className="text-cyan-300 whitespace-pre-wrap break-all leading-relaxed">
            {JSON.stringify(step.requestPayload, null, 2) || '// No request body'}
          </pre>
        ) : (
          <pre className="text-emerald-300 whitespace-pre-wrap break-all leading-relaxed">
            {JSON.stringify(step.responsePayload, null, 2) || '// No response payload'}
          </pre>
        )}
      </div>
    </div>
  );
};
