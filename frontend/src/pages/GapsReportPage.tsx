import React, { useState } from 'react';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Github, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldAlert, 
  Cpu, 
  QrCode, 
  Layers 
} from 'lucide-react';

export const GapsReportPage: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const gaps = [
    {
      id: 'GAP-01',
      title: 'QR Code Data Density Limit in Offline Cross-Device Presentations',
      severity: 'HIGH',
      repository: 'mosip/inji-wallet',
      category: 'Transport & Offline Media',
      summary: 'W3C VC JSON-LD and uncompressed mdoc credentials exceed standard QR optical scanning capacity on mobile cameras.',
      details: `When credentials contain complete W3C JSON-LD context URLs, assertion proofs, and biometric claims, the resulting Verifiable Presentation payload routinely exceeds 2.5 KB to 4 KB. Standard Version 40 QR codes max out at 2,953 alphanumeric characters, causing optical capture failure on budget smartphone cameras.`,
      injiImpact: 'Affects offline verification scenarios using Tuvali BLE and camera-based QR presentation.',
      recommendation: `1. Adopt MOSIP PixelPass chunked animated QR code streaming (BC-UR standard) for payloads > 1.8 KB.\n2. Standardize on IETF SD-JWT VC for QR presentations to keep payload size under 1 KB.\n3. Utilize brotli/gzip compression headers prior to base64url encoding.`,
      githubTemplate: `### Issue Title: [BUG] Optical QR failure for W3C VC JSON-LD payloads exceeding 2.2KB

**Repository:** mosip/inji-wallet
**Module:** QR Presentation & PixelPass
**Severity:** High

#### Description
When presenting a W3C VC JSON-LD identity credential via OpenID4VP QR code, the raw JSON payload size exceeds 2,400 bytes. On mid-range mobile devices running Inji Wallet, scanning fails due to excessive QR code density.

#### Steps to Reproduce
1. Issue a W3C VC JSON-LD with standard MOSIP National ID schema.
2. Select Cross-Device QR Presentation.
3. Observe QR density; camera autofocus fails to resolve data modules.

#### Expected Behavior
Payload should be automatically compressed via PixelPass or fragmented into an animated multi-frame QR stream (BC-UR format).`
    },
    {
      id: 'GAP-02',
      title: 'OpenID4VP direct_post vs direct_post.jwt Response Mode Divergence',
      severity: 'CRITICAL',
      repository: 'mosip/inji-verify',
      category: 'Protocol Standards & Security',
      summary: 'Cross-ecosystem verifiers (EUDI, German PID) strictly require direct_post.jwt with JWE encryption, while Inji Verify default is plaintext direct_post.',
      details: `OpenID4VP draft 21-23 specifies response_mode 'direct_post.jwt' where the wallet encrypts the authorization response (including vp_token) as a JWE using the Verifier client_metadata public encryption key. Plain direct_post exposes personal identity claims over the wire if TLS is terminated at a reverse proxy.`,
      injiImpact: 'Blocks true interoperability between Inji Wallet and European EUDI Relying Parties.',
      recommendation: `1. Add support in Inji Verify for 'direct_post.jwt' response mode.\n2. Publish Verifier ECDH-ES public encryption keys (P-256 / secp256r1) in client_metadata.\n3. Enable JWE decryption pipeline in Inji Verify BFF prior to cryptographic validation.`,
      githubTemplate: `### Issue Title: [FEATURE] Support direct_post.jwt with JWE response encryption in Inji Verify

**Repository:** mosip/inji-verify
**Module:** verify-service & SDK
**Severity:** Critical

#### Description
Currently Inji Verify relies predominantly on unencrypted direct_post for receiving vp_token submissions. In cross-border eIDAS 2.0 / EUDI wallet testing, all relying parties mandate 'response_mode: direct_post.jwt' with ECDH-ES JWE encryption.

#### Proposed Solution
1. Update OpenID4VP presentation request builder to declare 'response_mode: direct_post.jwt' support.
2. Provide 'client_metadata.jwks' containing the verifier encryption public key.
3. Decrypt incoming JWE before dispatching to DIF PEX schema verification.`
    },
    {
      id: 'GAP-03',
      title: 'DID Method and Cryptographic Signature Suite Incompatibilities',
      severity: 'HIGH',
      repository: 'mosip/inji-certify',
      category: 'Cryptography & Identity Resolution',
      summary: 'Inji Certify default to Ed25519Signature2020 / did:key conflicts with verifiers expecting did:web and ECDSA secp256r1 (ES256).',
      details: `While Ed25519 (EdDSA) offers superior performance and security, NIST P-256 (ES256) and RSA (RS256) remain legally mandated by government PKI profiles and Apple/Google Wallet digital driving license specifications. Furthermore, did:key does not support key rotation, which relying parties reject in favor of did:web.`,
      injiImpact: 'Prevents Inji Certify credentials from being validated by NIST-only or Apple Wallet ecosystem verifiers.',
      recommendation: `1. Implement modular cryptographic signing plugins in Inji Certify allowing issuers to choose between EdDSA, ES256, and RS256.\n2. Add did:web resolution support across Inji Verify and Inji Wallet.\n3. Publish well-known did.json documents for Inji Certify instances.`,
      githubTemplate: `### Issue Title: [FEATURE] Multi-suite cryptographic signing (ES256 / did:web) for Inji Certify

**Repository:** mosip/inji-certify
**Module:** inji-certify-core
**Severity:** High

#### Description
Inji Certify currently defaults to Ed25519 did:key for credential signing. International standards (ISO 18013-5 mdoc and EUDI Architecture Reference Framework) mandate support for NIST P-256 (ES256) and did:web.

#### Implementation Request
- Add ES256 (P-256) key generation and COSE_Sign1 / JWS signing support.
- Enable did:web identifier resolution in credential issuer metadata.`
    },
    {
      id: 'GAP-04',
      title: 'DIF Presentation Exchange 2.0 Path Traversal Mismatch in SD-JWT',
      severity: 'MEDIUM',
      repository: 'mosip/inji-verify',
      category: 'Schema & Query Resolution',
      summary: 'PEX JSONPath queries formatted for W3C envelope ($.credentialSubject) fail when evaluating flat IETF SD-JWT VC claims.',
      details: `DIF PEX input descriptors often specify constraints with JSONPath like '$.credentialSubject.uin'. In IETF SD-JWT VC, claims are emitted directly at the root payload level ('$.uin'). Without dual-path expression support, an SD-JWT presentation will fail schema validation even when the claim is cryptographically valid.`,
      injiImpact: 'Causes false-negative schema evaluation errors when verifying SD-JWT credentials.',
      recommendation: `1. Standardize Presentation Definitions to declare fallback JSONPath queries: ['$.credentialSubject.<claim>', '$.<claim>'].\n2. Normalize SD-JWT payload into an internal canonical claim map inside Inji Verify before running JSONPath constraint evaluators.`,
      githubTemplate: `### Issue Title: [BUG] DIF PEX constraint evaluation fails on flat SD-JWT VC claim paths

**Repository:** mosip/inji-verify
**Module:** react-inji-verify-sdk
**Severity:** Medium

#### Description
When an OpenID4VP presentation definition requests '$.credentialSubject.fullName', Inji Verify fails to match valid SD-JWT presentations because SD-JWT claims reside at the root level '$.fullName'.

#### Fix
Update DIF PEX constraint engine to normalize claim roots or automatically evaluate fallback paths for vc+sd-jwt format descriptors.`
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <span>Real Interoperability Gaps & Actionable Findings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Detailed technical write-up of interoperability bottlenecks discovered across OpenID4VCI, OpenID4VP, W3C VC, SD-JWT VC, and ISO 18013-5 mdoc.
        </p>
      </div>

      {/* Gaps List */}
      <div className="space-y-6">
        {gaps.map((gap) => (
          <div key={gap.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            {/* Top row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-inji-500/20 text-inji-300 border border-inji-500/30">
                  {gap.id}
                </span>
                <h3 className="font-bold text-base text-white tracking-wide">{gap.title}</h3>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  gap.severity === 'CRITICAL'
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {gap.severity}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {gap.repository}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 font-medium mb-4">{gap.summary}</p>

            {/* Analysis Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono mb-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 text-[10px] uppercase block mb-1 font-sans font-bold">
                  Technical Root Cause & Protocol Gap:
                </span>
                <p className="text-slate-300 leading-relaxed font-sans">{gap.details}</p>
                <div className="mt-3 pt-2 border-t border-slate-800/60 text-[11px] text-amber-400">
                  <strong>Impact on Inji: </strong>{gap.injiImpact}
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <span className="text-emerald-400 text-[10px] uppercase block mb-1 font-sans font-bold">
                  Recommended Engineering Solution:
                </span>
                <pre className="text-slate-300 whitespace-pre-wrap font-sans text-xs leading-relaxed">
                  {gap.recommendation}
                </pre>
              </div>
            </div>

            {/* GitHub Issue Template Box */}
            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
                  <Github className="w-4 h-4 text-slate-300" />
                  <span>GitHub Issue Template (Ready to File against {gap.repository})</span>
                </div>

                <button
                  onClick={() => handleCopy(gap.id, gap.githubTemplate)}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center space-x-1.5 transition-colors border border-slate-700"
                >
                  {copiedId === gap.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied Markdown!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Issue Markdown</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="text-[11px] font-mono text-slate-400 bg-slate-900/60 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap border border-slate-800/80">
                {gap.githubTemplate}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
