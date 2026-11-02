import React, { useState } from 'react';
import { ProtocolExchangeStep } from '../types';
import { Copy, Download, Check } from 'lucide-react';

interface ProtocolInspectorProps {
  steps: ProtocolExchangeStep[];
  selectedStepIndex: number;
  onSelectStep: (index: number) => void;
}

export const ProtocolInspector: React.FC<ProtocolInspectorProps> = ({
  steps,
  selectedStepIndex
}) => {
  const [activeTab, setActiveTab] = useState<'response' | 'request' | 'decoded'>('response');
  const [copied, setCopied] = useState(false);

  const step = steps[selectedStepIndex] || steps[0];

  const handleCopy = (content: any) => {
    navigator.clipboard.writeText(typeof content === 'string' ? content : JSON.stringify(content, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = (content: any, filename: string) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(content, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `${filename}.json`);
    dlAnchorElem.click();
  };

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
        standard: 'IETF SD-JWT VC (draft-ietf-oauth-sd-jwt-vc)',
        issuerJwt: decodedIssuerJwt,
        disclosures: decodedDisclosures,
        kbJwt: decodedKbJwt
      };
    } else if (targetToken.split('.').length >= 3) {
      try {
        const [h, p] = targetToken.split('.');
        return {
          standard: 'JSON Web Signature (RFC 7515)',
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
    <div className="border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md rounded-xl p-5 flex flex-col h-full shadow-sm">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-zinc-800/80">
        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            Protocol Inspector
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Raw payload exchanges, JSON-LD contexts & token preimages
          </p>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex items-center space-x-2">
          <div className="flex p-0.5 rounded-lg border border-zinc-800 bg-zinc-900/40">
            <button
              onClick={() => setActiveTab('response')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all duration-150 ${
                activeTab === 'response' ? 'bg-[#0e2448] text-white border border-blue-900/80 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Response
            </button>
            <button
              onClick={() => setActiveTab('request')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all duration-150 ${
                activeTab === 'request' ? 'bg-[#0e2448] text-white border border-blue-900/80 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Request
            </button>
            {decoded && (
              <button
                onClick={() => setActiveTab('decoded')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all duration-150 ${
                  activeTab === 'decoded' ? 'bg-[#0e2448] text-white border border-blue-900/80 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Decoded
              </button>
            )}
          </div>

          {step && (
            <div className="flex items-center space-x-1">
              <button
                onClick={() =>
                  handleCopy(
                    activeTab === 'response'
                      ? step.responsePayload
                      : activeTab === 'request'
                      ? step.requestPayload
                      : decoded
                  )
                }
                className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
                title="Copy JSON"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-zinc-200" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() =>
                  handleDownload(
                    activeTab === 'response' ? step.responsePayload : step.requestPayload,
                    `step-${step.stepIndex}-${step.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
                  )
                }
                className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
                title="Download JSON"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Step Metadata Hairline Bar */}
      {step && (
        <div className="bg-zinc-900/40 rounded-lg p-2.5 border border-zinc-850 mb-3 flex flex-wrap items-center justify-between text-xs font-mono text-zinc-400 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-zinc-200">
              [{step.stepIndex}] {step.title}
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[10px] text-zinc-500">
            {step.endpoint && <span>{step.method} {step.endpoint}</span>}
            <span>{step.source} → {step.target}</span>
            {step.durationMs !== undefined && <span>{step.durationMs}ms</span>}
          </div>
        </div>
      )}

      {/* Code Canvas */}
      <div className="bg-zinc-950/60 backdrop-blur-sm rounded-lg p-4 border border-zinc-800/80 flex-1 overflow-auto max-h-[440px] overscroll-contain font-mono text-xs leading-relaxed">
        {!step ? (
          <div className="text-center py-10 text-zinc-600 font-mono">
            Awaiting payload exchange.
          </div>
        ) : activeTab === 'decoded' && decoded ? (
          <pre className="text-zinc-300 whitespace-pre-wrap break-all">
            {JSON.stringify(decoded, null, 2)}
          </pre>
        ) : activeTab === 'request' ? (
          <pre className="text-zinc-300 whitespace-pre-wrap break-all">
            {JSON.stringify(step.requestPayload, null, 2) || '// No request body'}
          </pre>
        ) : (
          <pre className="text-zinc-300 whitespace-pre-wrap break-all">
            {JSON.stringify(step.responsePayload, null, 2) || '// No response payload'}
          </pre>
        )}
      </div>
    </div>
  );
};
