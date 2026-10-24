import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { VerificationResult, VerificationStatus } from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Cpu, 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  X 
} from 'lucide-react';

interface VerificationResultModalProps {
  result: VerificationResult | null;
  onClose: () => void;
}

export const VerificationResultModal: React.FC<VerificationResultModalProps> = ({
  result,
  onClose
}) => {
  useEffect(() => {
    if (result && result.isValid) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
  }, [result]);

  if (!result) return null;

  const getStatusConfig = (status: VerificationStatus) => {
    switch (status) {
      case 'VALID':
        return {
          title: 'VERIFIED & VALID',
          color: 'emerald',
          icon: CheckCircle2,
          bg: 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
        };
      case 'VALID_BUT_EXPIRED':
        return {
          title: 'VALID SIGNATURE BUT EXPIRED',
          color: 'amber',
          icon: AlertTriangle,
          bg: 'bg-amber-950/40 border-amber-500/50 text-amber-400',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        };
      case 'TAMPERED_SIGNATURE':
        return {
          title: 'CRYPTOGRAPHIC SIGNATURE TAMPERED',
          color: 'red',
          icon: XCircle,
          bg: 'bg-red-950/40 border-red-500/50 text-red-400',
          badge: 'bg-red-500/20 text-red-300 border-red-500/30'
        };
      case 'INVALID_NONCE':
        return {
          title: 'REPLAY ATTACK / NONCE MISMATCH',
          color: 'red',
          icon: ShieldAlert,
          bg: 'bg-red-950/40 border-red-500/50 text-red-400',
          badge: 'bg-red-500/20 text-red-300 border-red-500/30'
        };
      case 'MISMATCHED_AUDIENCE':
        return {
          title: 'CROSS-SITE AUDIENCE MISMATCH',
          color: 'red',
          icon: ShieldAlert,
          bg: 'bg-red-950/40 border-red-500/50 text-red-400',
          badge: 'bg-red-500/20 text-red-300 border-red-500/30'
        };
      case 'REVOKED':
        return {
          title: 'CREDENTIAL REVOKED',
          color: 'red',
          icon: XCircle,
          bg: 'bg-red-950/40 border-red-500/50 text-red-400',
          badge: 'bg-red-500/20 text-red-300 border-red-500/30'
        };
      default:
        return {
          title: 'VERIFICATION FAILED',
          color: 'red',
          icon: XCircle,
          bg: 'bg-red-950/40 border-red-500/50 text-red-400',
          badge: 'bg-red-500/20 text-red-300 border-red-500/30'
        };
    }
  };

  const statusConfig = getStatusConfig(result.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Status Banner */}
        <div className={`p-4 rounded-2xl border flex items-center space-x-3.5 mb-6 ${statusConfig.bg}`}>
          <StatusIcon className="w-8 h-8 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-wide">{statusConfig.title}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${statusConfig.badge}`}>
                {result.format}
              </span>
            </div>
            <p className="text-xs opacity-90 mt-0.5 font-mono">
              Evaluated by Inji Verify in {result.latencyMs}ms at {result.timestamp.substring(11, 19)} UTC
            </p>
          </div>
        </div>

        {/* Cryptographic Checks Breakdown */}
        <div className="space-y-4 mb-6">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <Lock className="w-3.5 h-3.5 text-inji-400" />
            <span>Cryptographic Assertions & Policy Evaluation:</span>
          </h4>

          <div className="space-y-2">
            {result.checks.map((chk, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl border flex items-start justify-between text-xs ${
                  chk.passed
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                    : 'bg-red-950/30 border-red-500/40 text-red-200'
                }`}
              >
                <div className="flex items-start space-x-2.5">
                  {chk.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold">{chk.name}</span>
                    <p className="text-[11px] opacity-80 mt-0.5 font-mono">{chk.message}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  chk.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  {chk.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Verified Claims */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <Eye className="w-3.5 h-3.5 text-mosip-400" />
              <span>Verified Disclosed Subject Claims:</span>
            </h4>
            <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-2">
              <span className="text-emerald-400 font-semibold">{result.disclosedClaimsCount} Disclosed</span>
              {result.hiddenClaimsCount > 0 && (
                <span className="text-slate-500">/ {result.hiddenClaimsCount} Hidden</span>
              )}
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {Object.entries(result.verifiedClaims).length === 0 ? (
              <p className="text-slate-500 text-xs italic col-span-2 text-center py-2">
                No claims verified due to security rejection.
              </p>
            ) : (
              Object.entries(result.verifiedClaims).map(([key, val]) => (
                <div key={key} className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-mono capitalize block">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <span className="font-semibold text-slate-200">
                    {Array.isArray(val) ? val.join(', ') : String(val)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Audit Details */}
        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-[11px] font-mono text-slate-400 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <span className="text-slate-500 block text-[9px]">ALGORITHM</span>
            <span className="text-white font-semibold">{result.cryptographicDetails.algorithm}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px]">ISSUER KEY</span>
            <span className="text-white font-semibold truncate block max-w-[120px]">
              {result.cryptographicDetails.issuerKeyId}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px]">HOLDER PROOF</span>
            <span className={result.cryptographicDetails.holderBindingVerified ? 'text-emerald-400' : 'text-red-400'}>
              {result.cryptographicDetails.holderBindingVerified ? 'Bound & Signed' : 'Not Verified'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px]">REPLAY DEFENSE</span>
            <span className={result.cryptographicDetails.replayProtectionVerified ? 'text-emerald-400' : 'text-red-400'}>
              {result.cryptographicDetails.replayProtectionVerified ? 'Nonce Validated' : 'Bypassed'}
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-inji-600 hover:bg-inji-500 text-white font-semibold text-xs shadow-md shadow-inji-500/20 transition-all"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
