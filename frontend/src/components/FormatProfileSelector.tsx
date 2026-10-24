import React from 'react';
import { CredentialFormat, CredentialProfileId, ProfileItem } from '../types';
import { Check } from 'lucide-react';

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
      badge: 'Selective Disclosure'
    },
    {
      id: 'mso_mdoc',
      name: 'ISO/IEC 18013-5 mdoc',
      standard: 'ISO 18013-5 Standard',
      badge: 'CBOR + MSO Tree'
    }
  ];

  return (
    <div className="border border-zinc-800 bg-zinc-950 rounded-xl p-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formats Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
              Credential Format Specification
            </label>
            <span className="font-mono text-[10px] text-zinc-500">FORMAT</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {formats.map((fmt) => {
              const isSelected = fmt.id === format;
              return (
                <div
                  key={fmt.id}
                  onClick={() => !disabled && onSelectFormat(fmt.id)}
                  className={`p-3 rounded-lg border transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'border-blue-700/80 bg-[#0a1628]/80 text-white shadow-sm'
                      : 'border-zinc-850 bg-zinc-900/30 hover:border-zinc-750 text-zinc-400 hover:text-zinc-200'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium text-xs text-white">{fmt.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-300 stroke-[2.5]" />}
                  </div>
                  <p className="text-[10px] text-zinc-400 font-mono mt-1">{fmt.standard}</p>
                  <div className={`mt-2 text-[9px] font-mono px-1.5 py-0.5 rounded inline-block ${
                    isSelected
                      ? 'bg-[#0d1e38] text-blue-200 border border-blue-900/70'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}>
                    {fmt.badge}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Profile Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
              Credential Schema Profile
            </label>
            <span className="font-mono text-[10px] text-zinc-500">SCHEMA</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {Object.entries(profiles).map(([id, prof]) => {
              const isSelected = id === profileId;
              return (
                <div
                  key={id}
                  onClick={() => !disabled && onSelectProfile(id as CredentialProfileId)}
                  className={`p-3 rounded-lg border transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'border-blue-700/80 bg-[#0a1628]/80 text-white shadow-sm'
                      : 'border-zinc-850 bg-zinc-900/30 hover:border-zinc-750 text-zinc-400 hover:text-zinc-200'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium text-xs text-white">{prof.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-300 stroke-[2.5]" />}
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {prof.description}
                  </p>
                  <div className={`mt-2 text-[9px] font-mono ${isSelected ? 'text-blue-300' : 'text-zinc-500'}`}>
                    {Object.keys(prof.claims).length} claims defined
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
