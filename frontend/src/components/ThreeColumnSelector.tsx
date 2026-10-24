import React from 'react';
import { ModuleItem, IssuerId, WalletId, VerifierId } from '../types';
import { Landmark, Wallet, CheckCircle2, Shield, Smartphone, Globe, ExternalLink } from 'lucide-react';

interface ThreeColumnSelectorProps {
  issuers: ModuleItem[];
  wallets: ModuleItem[];
  verifiers: ModuleItem[];
  selectedIssuerId: IssuerId;
  selectedWalletId: WalletId;
  selectedVerifierId: VerifierId;
  onSelectIssuer: (id: IssuerId) => void;
  onSelectWallet: (id: WalletId) => void;
  onSelectVerifier: (id: VerifierId) => void;
  disabled?: boolean;
}

export const ThreeColumnSelector: React.FC<ThreeColumnSelectorProps> = ({
  issuers,
  wallets,
  verifiers,
  selectedIssuerId,
  selectedWalletId,
  selectedVerifierId,
  onSelectIssuer,
  onSelectWallet,
  onSelectVerifier,
  disabled = false
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 1. Issuer Column */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100 uppercase tracking-wider">1. Credential Issuer</h3>
              <p className="text-[11px] text-slate-400">OpenID4VCI draft 13 Endpoint</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
            OID4VCI
          </span>
        </div>

        <div className="space-y-3 flex-1">
          {issuers.map((item) => {
            const isSelected = item.id === selectedIssuerId;
            return (
              <div
                key={item.id}
                onClick={() => !disabled && onSelectIssuer(item.id as IssuerId)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500'
                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70'
                } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-xs text-white">{item.name}</span>
                    {item.type === 'inji' && (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-semibold px-1.5 py-0.2 rounded border border-emerald-500/30">
                        Inji Core
                      </span>
                    )}
                    {item.type === 'external' && (
                      <span className="text-[9px] bg-purple-500/20 text-purple-300 font-semibold px-1.5 py-0.2 rounded border border-purple-500/30">
                        External Ref
                      </span>
                    )}
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'bg-blue-500 border-blue-400 text-white' : 'border-slate-600'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{item.description}</p>

                <div className="flex flex-wrap gap-1 mt-2.5">
                  {item.supportedFormats.map(fmt => (
                    <span key={fmt} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {fmt}
                    </span>
                  ))}
                  <span className="text-[9px] text-slate-500 ml-auto font-mono">{item.version}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Wallet Column */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100 uppercase tracking-wider">2. Holder Wallet</h3>
              <p className="text-[11px] text-slate-400">Holds, Signs & Presents VCs</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            HOLDER
          </span>
        </div>

        <div className="space-y-3 flex-1">
          {wallets.map((item) => {
            const isSelected = item.id === selectedWalletId;
            return (
              <div
                key={item.id}
                onClick={() => !disabled && onSelectWallet(item.id as WalletId)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500'
                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70'
                } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {item.id === 'inji-mobile' ? (
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span className="font-medium text-xs text-white">{item.name}</span>
                    {item.type === 'inji' && (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-semibold px-1.5 py-0.2 rounded border border-emerald-500/30">
                        Inji Core
                      </span>
                    )}
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-slate-600'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{item.description}</p>

                <div className="flex flex-wrap gap-1 mt-2.5">
                  {item.supportedFormats.map(fmt => (
                    <span key={fmt} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {fmt}
                    </span>
                  ))}
                  <span className="text-[9px] text-slate-500 ml-auto font-mono">{item.version}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Verifier Column */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100 uppercase tracking-wider">3. Verifier Relying Party</h3>
              <p className="text-[11px] text-slate-400">OpenID4VP draft 21-23 Verifier</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            OID4VP
          </span>
        </div>

        <div className="space-y-3 flex-1">
          {verifiers.map((item) => {
            const isSelected = item.id === selectedVerifierId;
            return (
              <div
                key={item.id}
                onClick={() => !disabled && onSelectVerifier(item.id as VerifierId)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500'
                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70'
                } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-xs text-white">{item.name}</span>
                    {item.type === 'inji' && (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-semibold px-1.5 py-0.2 rounded border border-emerald-500/30">
                        Inji Core
                      </span>
                    )}
                    {item.type === 'external' && (
                      <span className="text-[9px] bg-purple-500/20 text-purple-300 font-semibold px-1.5 py-0.2 rounded border border-purple-500/30">
                        External Ref
                      </span>
                    )}
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-slate-600'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{item.description}</p>

                <div className="flex flex-wrap gap-1 mt-2.5">
                  {item.supportedFormats.map(fmt => (
                    <span key={fmt} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {fmt}
                    </span>
                  ))}
                  <span className="text-[9px] text-slate-500 ml-auto font-mono">{item.version}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
