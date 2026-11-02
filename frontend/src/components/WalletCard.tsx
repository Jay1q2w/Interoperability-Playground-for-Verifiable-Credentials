import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CredentialFormat, CredentialProfileId } from '../types';
import { ExternalLink, Check, Plus, RotateCcw, Shield, Sliders, Edit2 } from 'lucide-react';

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
  const [activeKeystoreTab, setActiveKeystoreTab] = useState<'edit' | 'disclosure'>('edit');
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

  const holderName =
    claims.fullName ||
    claims.name ||
    claims.given_name ||
    (claims.firstName ? `${claims.firstName} ${claims.lastName || ''}` : 'Alexandre Dubois');

  const documentNumber =
    claims.nationalId ||
    claims.uin ||
    claims.document_number ||
    claims.license_number ||
    '784-1988-1234567-1';

  return (
    <div className="border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md rounded-xl p-5 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Physical / Biometric Security Document Card (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
              Security Document Card
            </span>
            <span
              className={`font-mono text-[10px] px-2 py-0.5 rounded border uppercase font-medium ${
                isIssued
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}
            >
              {isIssued ? 'Active / In Keystore' : 'Draft / Pre-Issuance'}
            </span>
          </div>

          {/* Biometric Card Visual */}
          <div className="border border-blue-900/70 bg-[#0a1628]/85 backdrop-blur-md rounded-xl p-5 shadow-md shadow-blue-950/40 text-white relative overflow-hidden">
            {/* Subtle Header */}
            <div className="flex items-start justify-between pb-3 mb-3 border-b border-blue-900/50">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-blue-300/80 block">
                  Official Credential
                </span>
                <h4 className="font-semibold text-sm text-white tracking-tight mt-0.5">
                  {profileId === 'MOSIP_NATIONAL_ID'
                    ? 'MOSIP National Identity Card'
                    : profileId === 'DIGITAL_DRIVING_LICENSE'
                    ? 'ISO 18013-5 Driving License'
                    : 'WHO Vaccination Record'}
                </h4>
              </div>
              <span className="font-mono text-[10px] text-blue-200 bg-[#0e2448] px-2 py-0.5 rounded border border-blue-800">
                {format}
              </span>
            </div>

            {/* Card Body */}
            <div className="flex items-start space-x-3.5 my-3">
              {/* Photo Avatar */}
              <div className="w-14 h-16 bg-blue-950/80 rounded-lg border border-blue-800/60 flex flex-col items-center justify-center flex-shrink-0 text-blue-400">
                <Shield className="w-6 h-6 stroke-[1.5]" />
                <span className="text-[8px] font-mono mt-1 text-blue-300">PHOTO</span>
              </div>

              {/* Identity Details */}
              <div className="flex-1 min-w-0 space-y-1 font-mono">
                <div>
                  <span className="text-[9px] text-blue-300/70 uppercase block">Holder Full Name</span>
                  <p className="text-xs font-semibold text-white truncate">{holderName}</p>
                </div>
                <div>
                  <span className="text-[9px] text-blue-300/70 uppercase block">Document ID / UIN</span>
                  <p className="text-[11px] text-blue-100 font-semibold truncate">{documentNumber}</p>
                </div>
              </div>
            </div>

            {/* Card Footer Details */}
            <div className="grid grid-cols-2 gap-2 pt-2.5 mt-2 border-t border-blue-900/40 text-[10px] font-mono text-zinc-300">
              <div>
                <span className="text-blue-300/60 text-[9px] uppercase block">Authority</span>
                <span className="text-white truncate block">MOSIP Republic ID</span>
              </div>
              <div>
                <span className="text-blue-300/60 text-[9px] uppercase block">Validity</span>
                <span className="text-white truncate block">10 Years (Valid)</span>
              </div>
            </div>
          </div>

          {/* QR Code Presentation (if available) */}
          {qrPayload ? (
            <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center space-x-3.5">
              <div className="bg-white p-1 rounded-md flex-shrink-0">
                <QRCodeSVG value={qrPayload} size={64} />
              </div>
              <div className="font-mono text-xs">
                <span className="font-semibold text-white block">Cross-Device Presentation</span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  Scan with Inji Wallet Mobile for OpenID4VP exchange
                </span>
                {deepLink && (
                  <a
                    href={deepLink}
                    className="inline-flex items-center space-x-1 text-[10px] text-blue-300 hover:text-white underline mt-1"
                  >
                    <span>Same-device universal link</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl text-center font-mono text-[11px] text-zinc-500">
              QR presentation payload generated upon protocol execution.
            </div>
          )}
        </div>

        {/* Right Side: Keystore Attributes & Disclosure Engine (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                Keystore Identity Attributes
              </span>
              <p className="text-[11px] text-zinc-500">
                {activeKeystoreTab === 'edit'
                  ? 'Edit or add claims stored in the holder key container'
                  : 'Toggle selective disclosures presented to verifier'}
              </p>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center space-x-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 font-mono text-[10px]">
              <button
                type="button"
                onClick={() => setActiveKeystoreTab('edit')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center space-x-1 ${
                  activeKeystoreTab === 'edit'
                    ? 'bg-[#0e2448] text-white border border-blue-900 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Edit2 className="w-3 h-3" />
                <span>Attributes ({Object.keys(claims).length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveKeystoreTab('disclosure')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center space-x-1 ${
                  activeKeystoreTab === 'disclosure'
                    ? 'bg-[#0e2448] text-white border border-blue-900 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>Disclosure ({selectedClaims.length}/{Object.keys(claims).length})</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Edit Attributes */}
          {activeKeystoreTab === 'edit' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span>Directly modify subject claims prior to issuance:</span>
                {onResetClaims && (
                  <button
                    type="button"
                    onClick={onResetClaims}
                    className="flex items-center space-x-1 text-zinc-400 hover:text-white transition-colors"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset Defaults</span>
                  </button>
                )}
              </div>

              {/* Claims inputs list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {Object.entries(claims).map(([key, value]) => (
                  <div key={key} className="bg-zinc-900/40 backdrop-blur-sm p-2 rounded-lg border border-zinc-800/70">
                    <label className="text-[9px] text-blue-300/80 uppercase font-semibold block mb-1">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </label>
                    <input
                      type="text"
                      value={Array.isArray(value) ? value.join(', ') : String(value)}
                      onChange={(e) => onUpdateClaim && onUpdateClaim(key, e.target.value)}
                      className="w-full bg-zinc-950/70 border border-zinc-800/80 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                ))}
              </div>

              {/* Add Custom Claim Attribute Form */}
              {onAddClaim && (
                <form
                  onSubmit={handleAddNewField}
                  className="pt-2 border-t border-zinc-800 flex flex-col sm:flex-row items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="New Attribute Name (e.g. bloodGroup)"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="w-full sm:flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-600 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Attribute Value (e.g. O+)"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full sm:flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-600 font-mono"
                  />
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-[#0e2448] hover:bg-[#122e5c] text-white border border-blue-800 text-xs font-semibold flex items-center justify-center space-x-1 transition-colors flex-shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Claim</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: Selective Disclosure Toggles */}
          {activeKeystoreTab === 'disclosure' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span>Select attributes to disclose to the Verifier (SD-JWT / mdoc):</span>
                <span className="text-blue-300">
                  {selectedClaims.length} of {Object.keys(claims).length} Disclosed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {Object.entries(claims).map(([key, value]) => {
                  const isDisclosed = selectedClaims.includes(key);

                  return (
                    <div
                      key={key}
                      onClick={() => onToggleClaim(key)}
                      className={`p-2.5 rounded-lg border transition-all duration-150 flex items-center justify-between cursor-pointer select-none ${
                        isDisclosed
                          ? 'border-blue-700/80 bg-[#0a1628]/85 backdrop-blur-sm text-white shadow-sm ring-1 ring-blue-500/20'
                          : 'border-zinc-800/60 bg-zinc-900/20 backdrop-blur-sm text-zinc-500 opacity-60 hover:opacity-80'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-[9px] text-blue-300/70 uppercase tracking-wider font-semibold">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </div>
                        <div className="text-xs text-zinc-200 mt-0.5 truncate">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        {isDisclosed ? (
                          <div className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded border border-zinc-700" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-lg text-[10px] text-zinc-400">
                {isSelectiveFormat ? (
                  <span>
                    Active standard supports cryptographic selective disclosure. Unselected attributes will be omitted or blinded with salted hashes.
                  </span>
                ) : (
                  <span>
                    Format <strong className="text-zinc-200">{format}</strong> signs all attributes in the full JSON-LD document proof.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Quick presentation trigger */}
          <div className="pt-2 border-t border-zinc-850 flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500">
              Ready to present to Relying Party:
            </span>
            <button
              type="button"
              onClick={onPresent}
              disabled={isVerifying}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center space-x-1.5 transition-colors ${
                isVerifying
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                  : 'bg-[#0e2448] hover:bg-[#122e5c] text-white border border-blue-800'
              }`}
            >
              {isVerifying ? (
                <>
                  <span className="w-3 h-3 border-2 border-blue-400 border-t-white rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Present to Verifier</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
