import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CredentialFormat, CredentialProfileId } from '../types';
import { ExternalLink, Check, Eye, EyeOff } from 'lucide-react';

interface WalletCardProps {
  format: CredentialFormat;
  profileId: CredentialProfileId;
  claims: Record<string, any>;
  selectedClaims: string[];
  onToggleClaim: (claimKey: string) => void;
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
  deepLink,
  qrPayload,
  isIssued,
  onPresent,
  isVerifying
}) => {
  const isSelectiveFormat = format === 'vc+sd-jwt' || format === 'mso_mdoc';

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
          <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 uppercase">
            {isIssued ? 'Credential Active' : 'Unissued'}
          </span>
        </div>

        {/* Editorial Security Document Card */}
        <div className="border border-zinc-700 bg-zinc-900/60 rounded-xl p-5 mb-5 relative">
          <div className="flex items-start justify-between pb-3 mb-4 border-b border-zinc-800">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 block">
                Official Credential Document
              </span>
              <h4 className="font-semibold text-sm text-zinc-100 tracking-tight mt-0.5">
                {profileId === 'MOSIP_NATIONAL_ID'
                  ? 'MOSIP National Identity Card'
                  : profileId === 'DIGITAL_DRIVING_LICENSE'
                  ? 'ISO 18013-5 Driving License'
                  : 'WHO International Vaccination Record'}
              </h4>
            </div>

            <span className="font-mono text-[10px] text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
              {format}
            </span>
          </div>

          {/* Claims Grid with Minimalist Toggles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-zinc-500 mb-1">
              <span>Identity Attributes</span>
              {isSelectiveFormat && <span>Click to toggle disclosure</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                        ? 'border-zinc-700 bg-zinc-850/80 text-zinc-200'
                        : 'border-zinc-850 bg-zinc-950/40 text-zinc-600 opacity-50'
                    }`}
                  >
                    <div>
                      <div className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </div>
                      <div className="font-mono text-xs text-zinc-100 mt-0.5 truncate max-w-[170px]">
                        {Array.isArray(value) ? value.join(', ') : String(value)}
                      </div>
                    </div>

                    {isSelectiveFormat && (
                      <div className="ml-2 flex-shrink-0">
                        {isDisclosed ? (
                          <div className="w-4 h-4 rounded bg-zinc-200 text-zinc-950 flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded border border-zinc-700" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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
                  : 'bg-zinc-100 text-zinc-950 hover:bg-white border border-zinc-200 shadow-sm'
              }`}
            >
              {isVerifying ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
                  <span>Evaluating Presentation Proofs...</span>
                </>
              ) : (
                <span>Submit Presentation (direct_post)</span>
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
