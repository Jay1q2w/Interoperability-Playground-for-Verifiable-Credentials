import React from 'react';
import { VerificationResult, VerificationStatus } from '../types';
import { Check, X, AlertTriangle } from 'lucide-react';

interface VerificationResultModalProps {
  result: VerificationResult | null;
  onClose: () => void;
}

export const VerificationResultModal: React.FC<VerificationResultModalProps> = ({
  result,
  onClose
}) => {
  if (!result) return null;

  const isSuccess = result.isValid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-750 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative my-8 text-zinc-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-md hover:bg-zinc-900 text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Status Header */}
        <div className="pb-4 mb-5 border-b border-zinc-800">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Audit Report
            </span>
            <span className="font-mono text-[10px] text-zinc-600">•</span>
            <span className="font-mono text-[10px] text-zinc-400">{result.format}</span>
          </div>

          <div className="flex items-center space-x-3 mt-1.5">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center ${
                isSuccess
                  ? 'bg-zinc-100 text-zinc-950'
                  : 'bg-zinc-800 text-zinc-300'
              }`}
            >
              {isSuccess ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
            <h3 className="font-semibold text-lg text-white tracking-tight">
              {result.status}
            </h3>
          </div>

          <p className="font-mono text-xs text-zinc-400 mt-1">
            Evaluated by Inji Verify in {result.latencyMs}ms at {result.timestamp.substring(11, 19)} UTC
          </p>
        </div>

        {/* Cryptographic Assertions List */}
        <div className="space-y-3 mb-5">
          <h4 className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            Cryptographic Checks & Verification Policy
          </h4>

          <div className="space-y-1.5">
            {result.checks.map((chk, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg border border-zinc-850 bg-zinc-900/40 flex items-start justify-between text-xs font-mono"
              >
                <div>
                  <div className="font-medium text-zinc-200">{chk.name}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{chk.message}</div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    chk.passed
                      ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  {chk.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Verified Subject Claims */}
        <div className="mb-5">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase text-zinc-500 mb-2">
            <span>Verified Disclosed Claims</span>
            <span>
              {result.disclosedClaimsCount} Disclosed / {result.hiddenClaimsCount} Hidden
            </span>
          </div>

          <div className="bg-zinc-900/30 rounded-lg p-3 border border-zinc-850 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {Object.entries(result.verifiedClaims).length === 0 ? (
              <div className="text-zinc-500 text-xs italic col-span-2 text-center py-2 font-mono">
                No claims verified due to security rejection.
              </div>
            ) : (
              Object.entries(result.verifiedClaims).map(([key, val]) => (
                <div key={key} className="bg-zinc-900/60 p-2 rounded border border-zinc-850">
                  <span className="text-[9px] font-mono uppercase text-zinc-500 block">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <span className="font-mono text-zinc-200 text-xs block mt-0.5 truncate">
                    {Array.isArray(val) ? val.join(', ') : String(val)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cryptographic Technical Details */}
        <div className="bg-zinc-900/40 rounded-lg p-3 border border-zinc-850 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-zinc-400">
          <div>
            <span className="text-zinc-600 block text-[9px] uppercase">Algorithm</span>
            <span className="text-zinc-200 font-semibold">{result.cryptographicDetails.algorithm}</span>
          </div>
          <div>
            <span className="text-zinc-600 block text-[9px] uppercase">Issuer Key</span>
            <span className="text-zinc-200 truncate block max-w-[100px]">
              {result.cryptographicDetails.issuerKeyId}
            </span>
          </div>
          <div>
            <span className="text-zinc-600 block text-[9px] uppercase">Holder Binding</span>
            <span className={result.cryptographicDetails.holderBindingVerified ? 'text-zinc-200' : 'text-zinc-500'}>
              {result.cryptographicDetails.holderBindingVerified ? 'Verified' : 'Unverified'}
            </span>
          </div>
          <div>
            <span className="text-zinc-600 block text-[9px] uppercase">Replay Defense</span>
            <span className={result.cryptographicDetails.replayProtectionVerified ? 'text-zinc-200' : 'text-zinc-500'}>
              {result.cryptographicDetails.replayProtectionVerified ? 'Validated' : 'Failed'}
            </span>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
