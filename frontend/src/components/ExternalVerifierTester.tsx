import React, { useState } from 'react';
import { VerificationResult } from '../types';
import { verifyRawCredential } from '../services/api';
import { Upload, FileText, Check, AlertTriangle, ShieldCheck, ArrowUpRight, Copy } from 'lucide-react';

interface ExternalVerifierTesterProps {
  onVerificationResult: (result: VerificationResult) => void;
}

export const ExternalVerifierTester: React.FC<ExternalVerifierTesterProps> = ({
  onVerificationResult
}) => {
  const [rawPayload, setRawPayload] = useState<string>('');
  const [format, setFormat] = useState<'auto' | 'ldp_vc' | 'vc+sd-jwt'>('auto');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Sample payloads for instant testing
  const SAMPLE_W3C_VC = JSON.stringify({
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://schema.mosip.io/credentials/v1"
    ],
    "id": "urn:uuid:mosip-external-demo-sample",
    "type": ["VerifiableCredential", "MosipNationalIdCredential"],
    "issuer": "did:key:z6Mkuw9MazCyq5tuScFkbedZb7EZAdbau7FWFi29DvrYCVgA",
    "issuanceDate": new Date().toISOString(),
    "validUntil": new Date(Date.now() + 365 * 86400000).toISOString(),
    "credentialSubject": {
      "uin": "7788-9900-1122",
      "fullName": "Custom User Sample",
      "nationality": "Morocco",
      "birthDate": "1995-12-10",
      "gender": "Female"
    },
    "proof": {
      "type": "Ed25519Signature2020",
      "created": new Date().toISOString(),
      "verificationMethod": "did:key:z6Mkuw9MazCyq5tuScFkbedZb7EZAdbau7FWFi29DvrYCVgA#z6Mkuw9MazCyq5tuScFkbedZb7EZAdbau7FWFi29DvrYCVgA",
      "proofPurpose": "assertionMethod",
      "jws": "demo-signature"
    }
  }, null, 2);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setRawPayload(content);
      setErrorMsg(null);
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleVerify = async () => {
    if (!rawPayload.trim()) {
      setErrorMsg('Please paste a credential or upload a .json / .jwt file first.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const formatToUse = format === 'auto' ? undefined : format;
      const verifyRes = await verifyRawCredential(rawPayload, formatToUse);
      setResult(verifyRes);
      onVerificationResult(verifyRes);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="border border-zinc-800 bg-zinc-950 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="font-mono text-xs uppercase tracking-wider text-zinc-200 font-medium">
              External Credential Verification Engine
            </h3>
            <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-[#0d1e38] text-blue-200 border border-blue-900/60 uppercase">
              Inji Verify Direct
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Drop or paste an external W3C VC (.json), IETF SD-JWT string (.jwt), or Verifiable Presentation to test Inji Verify standards compliance
          </p>
        </div>

        {/* Format Selector */}
        <div className="flex items-center space-x-1 font-mono text-[11px] bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          {(['auto', 'ldp_vc', 'vc+sd-jwt'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                format === fmt
                  ? 'bg-[#0e2448] text-white border border-blue-900/70 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {fmt === 'auto' ? 'Auto-Detect' : fmt === 'ldp_vc' ? 'W3C VC' : 'SD-JWT'}
            </button>
          ))}
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-[#0a1628]'
            : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
        }`}
      >
        <Upload className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
        <div className="text-xs text-zinc-200 font-medium">
          Drag and drop your credential file here, or{' '}
          <label className="text-blue-400 hover:text-blue-300 cursor-pointer underline underline-offset-2">
            browse from computer
            <input
              type="file"
              accept=".json,.jwt,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
          </label>
        </div>
        <p className="text-[10px] text-zinc-500 font-mono mt-1">
          Supports W3C Verifiable Credentials (.json), Verifiable Presentations, and IETF SD-JWT strings (.jwt)
        </p>
      </div>

      {/* Raw Payload Textarea */}
      <div>
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1.5">
          <span>Or Paste Raw Credential Content:</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setRawPayload(SAMPLE_W3C_VC)}
              className="text-[10px] text-blue-300 hover:text-white underline underline-offset-2"
            >
              Load Sample W3C VC
            </button>
            <span className="text-zinc-700">•</span>
            <button
              onClick={() => setRawPayload('')}
              className="text-[10px] text-zinc-500 hover:text-zinc-300"
            >
              Clear
            </button>
          </div>
        </div>

        <textarea
          value={rawPayload}
          onChange={(e) => setRawPayload(e.target.value)}
          placeholder='Paste raw JSON credential (e.g. { "@context": [...], "type": ["VerifiableCredential"], ... }) or SD-JWT compact string (eyJ...~...)'
          className="w-full h-36 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 font-mono text-xs text-zinc-200 focus:outline-none focus:border-blue-700 leading-relaxed custom-scrollbar"
        />
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3 bg-red-950/20 border border-red-900/50 rounded-lg text-xs font-mono text-red-300 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Action CTA */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-[11px] font-mono text-zinc-500">
          Evaluated locally using Inji Verify cryptographic assertion rules
        </span>

        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className={`px-5 py-2.5 rounded-lg text-xs font-medium flex items-center space-x-2 transition-all duration-150 ${
            isVerifying
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-[#0e2448] hover:bg-[#122e5c] text-white border border-blue-800 shadow-sm'
          }`}
        >
          {isVerifying ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-white rounded-full animate-spin" />
              <span>Asserting Cryptographic Proofs...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
              <span>Verify with Inji Verify</span>
            </>
          )}
        </button>
      </div>

      {/* Verification Result Output */}
      {result && (
        <div
          className={`mt-4 rounded-xl p-4 border transition-all duration-150 ${
            result.isValid ? 'border-blue-900/70 bg-[#0a1628]' : 'border-amber-900/70 bg-amber-950/20'
          }`}
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80">
            <div className="flex items-center space-x-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  result.isValid ? 'bg-blue-600 text-white' : 'bg-amber-500/20 text-amber-300 border border-amber-600/50'
                }`}
              >
                {result.isValid ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              </div>
              <div>
                <span className="font-semibold text-sm text-white">{result.status}</span>
                <span className="text-[11px] font-mono text-zinc-400 ml-2">{result.latencyMs}ms latency</span>
              </div>
            </div>

            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0d1e38] text-blue-200 border border-blue-900/60 uppercase">
              Format: {result.format}
            </span>
          </div>

          {/* Checks list */}
          <div className="space-y-1.5 font-mono text-xs mb-3">
            {result.checks.map((chk, i) => (
              <div key={i} className="p-2 rounded bg-zinc-900/60 border border-zinc-850 flex items-center justify-between">
                <div>
                  <span className="text-zinc-200 font-medium">{chk.name}</span>
                  <span className="text-[11px] text-zinc-500 block">{chk.message}</span>
                </div>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                    chk.passed ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' : 'bg-red-950/60 text-red-300 border border-red-800'
                  }`}
                >
                  {chk.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>

          {/* Verified Claims */}
          {Object.keys(result.verifiedClaims).length > 0 && (
            <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-850">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-2 font-semibold">
                Extracted Verified Subject Claims ({Object.keys(result.verifiedClaims).length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                {Object.entries(result.verifiedClaims).map(([k, v]) => (
                  <div key={k} className="p-2 rounded bg-zinc-900/80 border border-zinc-800">
                    <span className="text-[9px] text-zinc-500 uppercase block">{k}</span>
                    <span className="text-zinc-200 truncate block mt-0.5">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
