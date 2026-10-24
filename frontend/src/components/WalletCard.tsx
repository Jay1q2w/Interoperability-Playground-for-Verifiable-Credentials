import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CredentialFormat, CredentialProfileId } from '../types';
import { Wallet, ShieldCheck, CheckSquare, Square, Eye, EyeOff, QrCode, ExternalLink, Lock } from 'lucide-react';

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
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100 uppercase tracking-wider">
                Inji Wallet Credential Holding
              </h3>
              <p className="text-[11px] text-slate-400">
                Local Secure Keystore & Selective Disclosure
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            {isIssued ? 'CREDENTIAL HELD' : 'AWAITING ISSUANCE'}
          </span>
        </div>

        {/* Visual Identity Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden mb-5">
          {/* Subtle Watermark */}
          <div className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none">
            <ShieldCheck className="w-48 h-48 text-emerald-400" />
          </div>

          {/* Card Top Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide uppercase">
                  {profileId === 'MOSIP_NATIONAL_ID'
                    ? 'MOSIP National Identity Card'
                    : profileId === 'DIGITAL_DRIVING_LICENSE'
                    ? 'Digital Driving License'
                    : 'Digital Health Certificate'}
                </h4>
                <p className="text-[10px] text-slate-400">Cryptographically Signed Credential</p>
              </div>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-emerald-500/30">
              {format}
            </span>
          </div>

          {/* Claims List with Selective Disclosure Toggles */}
          <div className="space-y-2 mt-3">
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
              <span>Claims in Subject Identity</span>
              {isSelectiveFormat && (
                <span className="text-[10px] text-inji-400 font-normal">
                  (Toggle to selectively disclose)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {Object.entries(claims).map(([key, value]) => {
                const isDisclosed = selectedClaims.includes(key);

                return (
                  <div
                    key={key}
                    onClick={() => isSelectiveFormat && onToggleClaim(key)}
                    className={`p-2.5 rounded-xl border transition-all text-xs flex items-center justify-between ${
                      isSelectiveFormat ? 'cursor-pointer' : ''
                    } ${
                      isDisclosed
                        ? 'bg-slate-900/80 border-slate-700/80 text-slate-200'
                        : 'bg-slate-950/40 border-slate-900 text-slate-500 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="text-[10px] text-slate-400 font-mono capitalize">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </div>
                      <div className="font-medium truncate max-w-[150px]">
                        {Array.isArray(value) ? value.join(', ') : String(value)}
                      </div>
                    </div>

                    {isSelectiveFormat && (
                      <div className="ml-2 flex-shrink-0">
                        {isDisclosed ? (
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-slate-600" />
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
      <div className="space-y-4 pt-3 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* QR Code for Mobile Scanning */}
          {qrPayload && (
            <div className="flex items-center space-x-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="bg-white p-1.5 rounded-lg">
                <QRCodeSVG value={qrPayload} size={84} />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-white flex items-center space-x-1.5">
                  <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cross-Device QR</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Scan with Inji Wallet Mobile app
                </p>
                <div className="text-[9px] text-slate-500 font-mono mt-1">OpenID4VP draft 21-23</div>
              </div>
            </div>
          )}

          {/* Same-Device Flow Action */}
          <div className="flex-1 w-full sm:w-auto flex flex-col space-y-2">
            <button
              onClick={onPresent}
              disabled={isVerifying}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-lg transition-all ${
                isVerifying
                  ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 to-inji-600 hover:from-emerald-500 hover:to-inji-500 text-white shadow-emerald-500/20 active:scale-95'
              }`}
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Presentation...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Present & Verify Credential</span>
                </>
              )}
            </button>

            {deepLink && (
              <a
                href={deepLink}
                className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-mono flex items-center justify-center space-x-1.5 transition-colors"
                title="Open OpenID4VP same-device universal link"
              >
                <span>Same-Device Deep Link</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
