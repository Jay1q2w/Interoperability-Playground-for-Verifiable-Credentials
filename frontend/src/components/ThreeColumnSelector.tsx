import React from 'react';
import { ModuleItem, IssuerId, WalletId, VerifierId } from '../types';
import { Check } from 'lucide-react';

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
      <div className="border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md rounded-xl p-5 flex flex-col shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80">
          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
              01 / Credential Issuer
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">OpenID4VCI draft 13 Endpoint</p>
          </div>
          <span className="font-mono text-[10px] text-blue-200 bg-[#0d1e38] px-2 py-0.5 rounded border border-blue-900/70">
            ISSUANCE
          </span>
        </div>

        <div className="space-y-2.5 flex-1">
          {issuers.map((item) => {
            const isSelected = item.id === selectedIssuerId;
            return (
              <div
                key={item.id}
                onClick={() => !disabled && onSelectIssuer(item.id as IssuerId)}
                className={`p-3 rounded-lg border transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'border-blue-600/80 bg-[#0a1628]/85 backdrop-blur-md text-white shadow-sm ring-1 ring-blue-500/20'
                    : 'border-zinc-800/60 bg-zinc-900/30 backdrop-blur-sm hover:border-blue-800/50 hover:bg-[#0a1628]/40 text-zinc-300'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-xs text-white">{item.name}</span>
                    {item.type === 'inji' && (
                      <span className="text-[9px] font-mono uppercase bg-[#0e2448] text-blue-200 px-1.5 py-0.2 rounded border border-blue-900/70">
                        Inji Core
                      </span>
                    )}
                    {item.type === 'external' && (
                      <span className="text-[9px] font-mono uppercase bg-zinc-850 text-zinc-400 px-1.5 py-0.2 rounded border border-zinc-750">
                        External Ref
                      </span>
                    )}
                  </div>
                  {isSelected ? (
                    <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-zinc-700 flex-shrink-0" />
                  )}
                </div>

                <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">{item.description}</p>

                <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-zinc-850/60 font-mono text-[9px]">
                  {item.supportedFormats.map((fmt) => (
                    <span key={fmt} className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                      {fmt}
                    </span>
                  ))}
                  <span className="text-zinc-600 ml-auto">{item.version}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Wallet Column */}
      <div className="border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md rounded-xl p-5 flex flex-col shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80">
          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
              02 / Holder Wallet
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">Keystore, Signer & Presentation</p>
          </div>
          <span className="font-mono text-[10px] text-blue-200 bg-[#0d1e38] px-2 py-0.5 rounded border border-blue-900/70">
            HOLDER
          </span>
        </div>

        <div className="space-y-2.5 flex-1">
          {wallets.map((item) => {
            const isSelected = item.id === selectedWalletId;
            return (
              <div
                key={item.id}
                onClick={() => !disabled && onSelectWallet(item.id as WalletId)}
                className={`p-3 rounded-lg border transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'border-blue-600/80 bg-[#0a1628]/85 backdrop-blur-md text-white shadow-sm ring-1 ring-blue-500/20'
                    : 'border-zinc-800/60 bg-zinc-900/30 backdrop-blur-sm hover:border-blue-800/50 hover:bg-[#0a1628]/40 text-zinc-300'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-xs text-white">{item.name}</span>
                    {item.type === 'inji' && (
                      <span className="text-[9px] font-mono uppercase bg-[#0e2448] text-blue-200 px-1.5 py-0.2 rounded border border-blue-900/70">
                        Inji Core
                      </span>
                    )}
                  </div>
                  {isSelected ? (
                    <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-zinc-700 flex-shrink-0" />
                  )}
                </div>

                <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">{item.description}</p>

                <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-zinc-850/60 font-mono text-[9px]">
                  {item.supportedFormats.map((fmt) => (
                    <span key={fmt} className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                      {fmt}
                    </span>
                  ))}
                  <span className="text-zinc-600 ml-auto">{item.version}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Verifier Column */}
      <div className="border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md rounded-xl p-5 flex flex-col shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80">
          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
              03 / Verifier Relying Party
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">OpenID4VP draft 21-23 Verifier</p>
          </div>
          <span className="font-mono text-[10px] text-blue-200 bg-[#0d1e38] px-2 py-0.5 rounded border border-blue-900/70">
            VERIFICATION
          </span>
        </div>

        <div className="space-y-2.5 flex-1">
          {verifiers.map((item) => {
            const isSelected = item.id === selectedVerifierId;
            return (
              <div
                key={item.id}
                onClick={() => !disabled && onSelectVerifier(item.id as VerifierId)}
                className={`p-3 rounded-lg border transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'border-blue-600/80 bg-[#0a1628]/85 backdrop-blur-md text-white shadow-sm ring-1 ring-blue-500/20'
                    : 'border-zinc-800/60 bg-zinc-900/30 backdrop-blur-sm hover:border-blue-800/50 hover:bg-[#0a1628]/40 text-zinc-300'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-xs text-white">{item.name}</span>
                    {item.type === 'inji' && (
                      <span className="text-[9px] font-mono uppercase bg-[#0e2448] text-blue-200 px-1.5 py-0.2 rounded border border-blue-900/70">
                        Inji Core
                      </span>
                    )}
                    {item.type === 'external' && (
                      <span className="text-[9px] font-mono uppercase bg-zinc-850 text-zinc-400 px-1.5 py-0.2 rounded border border-zinc-750">
                        External Ref
                      </span>
                    )}
                  </div>
                  {isSelected ? (
                    <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-zinc-700 flex-shrink-0" />
                  )}
                </div>

                <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">{item.description}</p>

                <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-zinc-850/60 font-mono text-[9px]">
                  {item.supportedFormats.map((fmt) => (
                    <span key={fmt} className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                      {fmt}
                    </span>
                  ))}
                  <span className="text-zinc-600 ml-auto">{item.version}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
