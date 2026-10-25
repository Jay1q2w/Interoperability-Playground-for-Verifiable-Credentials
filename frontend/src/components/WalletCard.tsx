import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CredentialFormat, CredentialProfileId } from '../types';
import { ExternalLink, Check, Edit3, Plus, RotateCcw, CreditCard } from 'lucide-react';

interface WalletCardProps {
  format: CredentialFormat;
  profileId: CredentialProfileId;
  claims: Record<string, any>;
  selectedClaims: string[];
  onToggleClaim: (claimKey: string) => void;
  onUpdateClaim?: (key: string, value: string) => void;
  onAddClaim?: (key: string, value: string) => void;
  onResetClaims?: () => void;
  deepLink?: string;
  qrPayload?: string;
  isIssued: boolean;
  onPresent: () => void;
  isVerifying: boolean;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  format,
  profileId,
  claims,
  selectedClaims,
  onToggleClaim,
  onUpdateClaim,
  onAddClaim,
  onResetClaims,
  deepLink,
  qrPayload,
  isIssued,
  onPresent,
  isVerifying
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const isSelectiveFormat = format === 'vc+sd-jwt' || format === 'mso_mdoc';

  const handleAddNewField = (e: React.FormEvent) => {
    e.preventDefault();
    if (newKey.trim() && newValue.trim() && onAddClaim) {
      onAddClaim(newKey.trim(), newValue.trim());
      setNewKey('');
      setNewValue('');
    }
  };

  return (
    <div className="border border-zinc-800 bg-zinc-950 rounded-xl p-5 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800/80">
          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
              Inji Wallet Secure Keystore
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">Hardware-bound device keys & selective disclosure</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="font-mono text-[10px] px-2.5 py-1 rounded border border-blue-900/60 bg-[#0d1e38] hover:bg-[#12284c] text-blue-200 flex items-center space-x-1 transition-colors"
            >
              {isEditing ? (
                <>
                  <CreditCard className="w-3 h-3 text-blue-300" />
                  <span>View Card</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3 h-3 text-blue-300" />
                  <span>Customize Claims</span>
                </>
              )}
            </button>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 uppercase">
              {isIssued ? 'Active' : 'Unissued'}
            </span>
          </div>
        </div>

        {/* Editorial Security Document Card or Claims Editor */}
        <div className="border border-blue-900/60 bg-[#0a1628] rounded-xl p-5 mb-5 relative shadow-sm">
          <div className="flex items-start justify-between pb-3 mb-4 border-b border-blue-900/50">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-blue-300/80 block">
                Official Credential Document
              </span>
              <h4 className="font-semibold text-sm text-white tracking-tight mt-0.5">
                {profileId === 'MOSIP_NATIONAL_ID'
                  ? 'MOSIP National Identity Card'
                  : profileId === 'DIGITAL_DRIVING_LICENSE'
                  ? 'ISO 18013-5 Driving License'
                  : 'WHO International Vaccination Record'}
              </h4>
            </div>

            <span className="font-mono text-[10px] text-blue-200 bg-[#0e2448] px-2 py-0.5 rounded border border-blue-800">
              {format}
            </span>
          </div>

          {isEditing ? (
            /* Custom Claims Input Editor Mode */
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-[10px] text-blue-300/80 uppercase">
                <span>Edit Identity Attributes</span>
                {onResetClaims && (
                  <button
                    onClick={onResetClaims}
                    className="flex items-center space-x-1 text-zinc-400 hover:text-white"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset Defaults</span>
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                {Object.entries(claims).map(([key, value]) => (
                  <div key={key} className="bg-[#0e2448]/50 p-2 rounded border border-blue-900/60">
                    <label className="text-[9px] text-blue-300/70 uppercase block mb-1">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </label>
                    <input
                      type="text"
                      value={Array.isArray(value) ? value.join(', ') : String(value)}
                      onChange={(e) => onUpdateClaim && onUpdateClaim(key, e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-600"
                    />
                  </div>
                ))}
              </div>

              {/* Add Custom Field Form */}
              {onAddClaim && (
                <form onSubmit={handleAddNewField} className="pt-2 border-t border-blue-900/50 flex gap-2">
                  <input
                    type="text"
                    placeholder="Attribute Name (e.g. bloodGroup)"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="flex-1 bg-zinc-950/80 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-600"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="flex-1 bg-zinc-950/80 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </form>
              )}

              <button
                onClick={() => setIsEditing(false)}
                className="w-full py-1.5 mt-2 rounded bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-xs font-mono border border-zinc-800 transition-colors"
              >
                Done Editing (Save to Keystore)
              </button>
            </div>
          ) : (
            /* Standard Identity Card Display with Selective Disclosure Toggles */
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase text-blue-300/70 mb-1">
                <span>Identity Attributes ({Object.keys(claims).length})</span>
                {isSelectiveFormat && <span>Click to toggle disclosure</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                {Object.entries(claims).map(([key, value]) => {
                  const isDisclosed = selectedClaims.includes(key);

                  return (
                    <div
                      key={key}
                      onClick={() => isSelectiveFormat && onToggleClaim(key)}
                      className={`p-2.5 rounded-lg border transition-all duration-150 flex items-center justify-between ${
                        isSelectiveFormat ? 'cursor-pointer select-none' : ''
                      } ${
                        isDisclosed
                          ? 'border-blue-800/70 bg-[#0e2448]/60 text-white'
                          : 'border-zinc-850/80 bg-zinc-950/60 text-zinc-500 opacity-50'
                      }`}
                    >
                      <div>
                        <div className="font-mono text-[9px] text-blue-300/70 uppercase tracking-wider">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </div>
                        <div className="font-mono text-xs text-zinc-100 mt-0.5 truncate max-w-[170px]">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </div>
                      </div>

                      {isSelectiveFormat && (
                        <div className="ml-2 flex-shrink-0">
                          {isDisclosed ? (
                            <div className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded border border-blue-900/60" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Presentation Controls & QR Display */}
      <div className="pt-4 border-t border-zinc-800/80">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* QR Code Presentation Box */}
          {qrPayload && (
            <div className="flex items-center space-x-4 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
              <div className="bg-white p-1.5 rounded-md">
                <QRCodeSVG value={qrPayload} size={78} />
              </div>
              <div className="text-left font-mono text-xs">
                <span className="font-semibold text-zinc-200 block">Cross-Device Flow</span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Scan via Inji Wallet Mobile</span>
                <span className="text-[9px] text-zinc-600 block mt-1">OpenID4VP draft 21-23</span>
              </div>
            </div>
          )}

          {/* Action Trigger Buttons */}
          <div className="flex-1 w-full sm:w-auto flex flex-col space-y-2">
            <button
              onClick={onPresent}
              disabled={isVerifying}
              className={`w-full py-2.5 px-4 rounded-lg font-medium text-xs flex items-center justify-center space-x-2 transition-all duration-150 active:scale-[0.99] ${
                isVerifying
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                  : 'bg-[#0e2448] hover:bg-[#122e5c] text-white border border-blue-800 shadow-sm'
              }`}
            >
              {isVerifying ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-white rounded-full animate-spin" />
                  <span className="text-blue-100">Evaluating Presentation Proofs...</span>
                </>
              ) : (
                <span>Present Disclosed Claims to Verifier</span>
              )}
            </button>

            {deepLink && (
              <a
                href={deepLink}
                className="w-full py-1.5 px-3 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-[11px] font-mono flex items-center justify-center space-x-1.5 transition-colors"
              >
                <span>Same-Device Universal Link</span>
                <ExternalLink className="w-3 h-3 text-zinc-500" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
