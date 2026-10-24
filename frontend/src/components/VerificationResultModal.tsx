import React, { useEffect } from 'react';
import { VerificationResult } from '../types';
import { Check, X } from 'lucide-react';

interface VerificationResultModalProps {
  result: VerificationResult | null;
  onClose: () => void;
}

export const VerificationResultModal: React.FC<VerificationResultModalProps> = ({
  result,
  onClose
}) => {
  // Prevent background scrolling and support Escape key
  useEffect(() => {
    if (!result) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [result, onClose]);

  if (!result) return null;

  const isSuccess = result.isValid;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm transition-opacity"
    >
      {/* Modal Dialog Card (Bounded to Viewport, Flex Column) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-950 border border-zinc-750 rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100 relative animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Pinned Fixed Header */}
        <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-zinc-800 bg-zinc-950/95 flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                Audit Report
              </span>
              <span className="font-mono text-[10px] text-zinc-600">•</span>
              <span className="font-mono text-[10px] text-blue-200 bg-[#0e2448] px-2 py-0.5 rounded border border-blue-900/70 font-semibold">
                {result.format}
              </span>
            </div>

            <div className="flex items-center space-x-3 mt-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isSuccess ? 'bg-blue-600 text-white' : 'bg-red-500/20 text-red-400 border border-red-500/40'
                }`}
              >
                {isSuccess ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <h3 className="font-semibold text-lg text-white tracking-tight">
                {result.status}
              </h3>
            </div>

            <p className="font-mono text-[11px] text-zinc-400 mt-1">
              Evaluated by Inji Verify in {result.latencyMs}ms at {result.timestamp.substring(11, 19)} UTC
            </p>
          </div>

          {/* Close Button X */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Close modal (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body with overscroll containment */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-5 text-zinc-100 custom-scrollbar">
          {/* Cryptographic Checks List */}
          <div className="space-y-3">
            <h4 className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
              Cryptographic Checks & Verification Policy
            </h4>

            <div className="space-y-1.5">
              {result.checks.map((chk, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-zinc-850 bg-zinc-900/40 flex items-start justify-between text-xs font-mono"
                >
                  <div className="pr-3">
                    <div className="font-medium text-zinc-100">{chk.name}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{chk.message}</div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex-shrink-0 ${
                      chk.passed
                        ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                        : 'bg-red-950/60 text-red-300 border border-red-800'
                    }`}
                  >
                    {chk.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Verified Disclosed Claims */}
          <div>
            <div className="flex items-center justify-between font-mono text-[10px] uppercase text-zinc-400 mb-2">
              <span>Verified Disclosed Claims</span>
              <span className="text-zinc-500 font-semibold">
                {result.disclosedClaimsCount} Disclosed / {result.hiddenClaimsCount} Hidden
              </span>
            </div>

            <div className="bg-zinc-900/40 rounded-lg p-3 border border-zinc-850 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {Object.entries(result.verifiedClaims).length === 0 ? (
                <div className="text-zinc-500 text-xs italic col-span-2 text-center py-3 font-mono">
                  No claims verified due to security rejection.
                </div>
              ) : (
                Object.entries(result.verifiedClaims).map(([key, val]) => (
                  <div key={key} className="bg-zinc-900/70 p-2.5 rounded border border-zinc-800">
                    <span className="text-[9px] font-mono uppercase text-zinc-500 block">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span className="font-mono text-zinc-100 text-xs block mt-0.5 truncate font-medium">
                      {Array.isArray(val) ? val.join(', ') : String(val)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cryptographic Technical Details */}
          <div className="bg-zinc-900/40 rounded-lg p-3.5 border border-zinc-850 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] font-mono text-zinc-400">
            <div>
              <span className="text-zinc-500 block text-[9px] uppercase tracking-wider">Algorithm</span>
              <span className="text-zinc-100 font-semibold">{result.cryptographicDetails.algorithm}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[9px] uppercase tracking-wider">Issuer Key</span>
              <span className="text-zinc-100 truncate block max-w-[120px]">
                {result.cryptographicDetails.issuerKeyId}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[9px] uppercase tracking-wider">Holder Binding</span>
              <span className={result.cryptographicDetails.holderBindingVerified ? 'text-zinc-100 font-semibold' : 'text-zinc-500'}>
                {result.cryptographicDetails.holderBindingVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[9px] uppercase tracking-wider">Replay Defense</span>
              <span className={result.cryptographicDetails.replayProtectionVerified ? 'text-zinc-100 font-semibold' : 'text-zinc-500'}>
                {result.cryptographicDetails.replayProtectionVerified ? 'Validated' : 'Failed'}
              </span>
            </div>
          </div>
        </div>

        {/* Pinned Fixed Footer */}
        <div className="flex-shrink-0 px-6 py-3.5 border-t border-zinc-800 bg-zinc-950/90 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
            <span
              className={`w-2 h-2 rounded-full ${
                isSuccess ? 'bg-emerald-500' : 'bg-red-400'
              }`}
            />
            <span className="hidden sm:inline">
              {isSuccess ? 'Cryptographic validation succeeded' : 'Cryptographic check failed'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#0e2448] hover:bg-[#122e5c] text-white border border-blue-800 font-medium text-xs transition-colors shadow-sm"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
