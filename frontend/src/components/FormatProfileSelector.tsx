import React from 'react';
import { CredentialFormat, CredentialProfileId, ProfileItem } from '../types';
import { FileBadge, Award, Check } from 'lucide-react';

interface FormatProfileSelectorProps {
  format: CredentialFormat;
  profileId: CredentialProfileId;
  profiles: Record<CredentialProfileId, ProfileItem>;
  onSelectFormat: (format: CredentialFormat) => void;
  onSelectProfile: (profileId: CredentialProfileId) => void;
  disabled?: boolean;
}

export const FormatProfileSelector: React.FC<FormatProfileSelectorProps> = ({
  format,
  profileId,
  profiles,
  onSelectFormat,
  onSelectProfile,
  disabled = false
}) => {
  const formats: Array<{ id: CredentialFormat; name: string; standard: string; badge: string }> = [
    {
      id: 'ldp_vc',
      name: 'W3C VC 1.1 / 2.0 (JSON-LD)',
      standard: 'W3C Recommendation',
      badge: 'Ed25519 / RSA'
    },
    {
      id: 'vc+sd-jwt',
      name: 'IETF SD-JWT VC',
      standard: 'draft-ietf-oauth-sd-jwt-vc',
      badge: 'Selective Disclosure + KB-JWT'
    },
    {
      id: 'mso_mdoc',
      name: 'ISO/IEC 18013-5 mdoc / mDL',
      standard: 'ISO 18013-5 Standard',
      badge: 'CBOR + MSO Digest Tree'
    }
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formats Selection */}
        <div>
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-2 mb-3">
            <FileBadge className="w-4 h-4 text-inji-400" />
            <span>Select Credential Format Standard:</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {formats.map((fmt) => {
              const isSelected = fmt.id === format;
              return (
                <div
                  key={fmt.id}
                  onClick={() => !disabled && onSelectFormat(fmt.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-inji-950/50 border-inji-500 shadow-md ring-1 ring-inji-500 text-white'
                      : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70 text-slate-300'
                  } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs">{fmt.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-inji-400" />}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">{fmt.standard}</p>
                  <span className="inline-block mt-2 text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-inji-300 border border-slate-700 font-mono">
                    {fmt.badge}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Profile Selection */}
        <div>
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-2 mb-3">
            <Award className="w-4 h-4 text-mosip-400" />
            <span>Select Credential Schema Profile:</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {Object.entries(profiles).map(([id, prof]) => {
              const isSelected = id === profileId;
              return (
                <div
                  key={id}
                  onClick={() => !disabled && onSelectProfile(id as CredentialProfileId)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-mosip-950/50 border-mosip-500 shadow-md ring-1 ring-mosip-500 text-white'
                      : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70 text-slate-300'
                  } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs">{prof.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-mosip-400" />}
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2">{prof.description}</p>
                  <div className="mt-2 text-[9px] text-slate-400 font-mono">
                    {Object.keys(prof.claims).length} Attributes
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
