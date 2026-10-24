import React, { useState, useEffect } from 'react';
import { 
  ModuleItem, 
  ProfileItem, 
  TamperItem, 
  IssuerId, 
  WalletId, 
  VerifierId, 
  CredentialFormat, 
  CredentialProfileId, 
  TamperScenario, 
  ProtocolExchangeStep, 
  VerificationResult
} from '../types';
import { ThreeColumnSelector } from '../components/ThreeColumnSelector';
import { FormatProfileSelector } from '../components/FormatProfileSelector';
import { TamperSelector } from '../components/TamperSelector';
import { SequenceDiagram } from '../components/SequenceDiagram';
import { ProtocolInspector } from '../components/ProtocolInspector';
import { WalletCard } from '../components/WalletCard';
import { VerificationResultModal } from '../components/VerificationResultModal';
import { runSingleFlow, subscribeWebSocket } from '../services/api';
import { 
  ArrowUpRight, 
  AlertCircle, 
  Check, 
  ShieldCheck, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface PlaygroundPageProps {
  modules: {
    issuers: ModuleItem[];
    wallets: ModuleItem[];
    verifiers: ModuleItem[];
    profiles: Record<CredentialProfileId, ProfileItem>;
    tamperScenarios: TamperItem[];
  };
}

export const PlaygroundPage: React.FC<PlaygroundPageProps> = ({ modules }) => {
  const [selectedIssuerId, setSelectedIssuerId] = useState<IssuerId>('inji-certify');
  const [selectedWalletId, setSelectedWalletId] = useState<WalletId>('inji-web');
  const [selectedVerifierId, setSelectedVerifierId] = useState<VerifierId>('inji-verify');
  const [selectedFormat, setSelectedFormat] = useState<CredentialFormat>('ldp_vc');
  const [selectedProfileId, setSelectedProfileId] = useState<CredentialProfileId>('MOSIP_NATIONAL_ID');
  const [selectedTamper, setSelectedTamper] = useState<TamperScenario>('NONE');

  const currentProfile = modules.profiles[selectedProfileId] || modules.profiles.MOSIP_NATIONAL_ID;
  const [selectedClaims, setSelectedClaims] = useState<string[]>(Object.keys(currentProfile.claims));

  const [steps, setSteps] = useState<ProtocolExchangeStep[]>([]);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [deepLink, setDeepLink] = useState<string>('');
  const [qrPayload, setQrPayload] = useState<string>('');
  const [isIssued, setIsIssued] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Scenario Presets
  const presets = [
    {
      id: 'core-mosip',
      label: 'MOSIP National ID',
      formatBadge: 'W3C VC',
      issuerId: 'inji-certify' as IssuerId,
      walletId: 'inji-web' as WalletId,
      verifierId: 'inji-verify' as VerifierId,
      format: 'ldp_vc' as CredentialFormat,
      profileId: 'MOSIP_NATIONAL_ID' as CredentialProfileId,
      tamper: 'NONE' as TamperScenario
    },
    {
      id: 'sd-jwt',
      label: 'Selective Disclosure ID',
      formatBadge: 'SD-JWT VC',
      issuerId: 'inji-certify' as IssuerId,
      walletId: 'inji-web' as WalletId,
      verifierId: 'inji-verify' as VerifierId,
      format: 'vc+sd-jwt' as CredentialFormat,
      profileId: 'MOSIP_NATIONAL_ID' as CredentialProfileId,
      tamper: 'NONE' as TamperScenario
    },
    {
      id: 'mdoc-mdl',
      label: 'Mobile Driving License',
      formatBadge: 'ISO mdoc',
      issuerId: 'inji-certify' as IssuerId,
      walletId: 'inji-mobile' as WalletId,
      verifierId: 'inji-verify' as VerifierId,
      format: 'mso_mdoc' as CredentialFormat,
      profileId: 'DIGITAL_DRIVING_LICENSE' as CredentialProfileId,
      tamper: 'NONE' as TamperScenario
    },
    {
      id: 'cross-walt',
      label: 'Cross-Ecosystem',
      formatBadge: 'Walt.id → Inji',
      issuerId: 'walt-id' as IssuerId,
      walletId: 'inji-web' as WalletId,
      verifierId: 'inji-verify' as VerifierId,
      format: 'ldp_vc' as CredentialFormat,
      profileId: 'MOSIP_NATIONAL_ID' as CredentialProfileId,
      tamper: 'NONE' as TamperScenario
    },
    {
      id: 'tamper-sig',
      label: 'Security Attack Test',
      formatBadge: 'Tampered Signature',
      issuerId: 'inji-certify' as IssuerId,
      walletId: 'inji-web' as WalletId,
      verifierId: 'inji-verify' as VerifierId,
      format: 'ldp_vc' as CredentialFormat,
      profileId: 'MOSIP_NATIONAL_ID' as CredentialProfileId,
      tamper: 'TAMPERED_SIGNATURE' as TamperScenario
    }
  ];

  const handleApplyPreset = (preset: typeof presets[0]) => {
    setSelectedIssuerId(preset.issuerId);
    setSelectedWalletId(preset.walletId);
    setSelectedVerifierId(preset.verifierId);
    setSelectedFormat(preset.format);
    setSelectedProfileId(preset.profileId);
    setSelectedTamper(preset.tamper);
    const prof = modules.profiles[preset.profileId] || modules.profiles.MOSIP_NATIONAL_ID;
    setSelectedClaims(Object.keys(prof.claims));
  };

  // Sync selected claims when profile changes
  useEffect(() => {
    setSelectedClaims(Object.keys(currentProfile.claims));
  }, [selectedProfileId]);

  // Connect WebSocket for live steps
  useEffect(() => {
    const unsubscribe = subscribeWebSocket(
      (newStep) => {
        setSteps((prev) => {
          const existing = prev.findIndex((s) => s.id === newStep.id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = newStep;
            return updated;
          }
          return [...prev, newStep];
        });
      },
      (completedRun) => {
        setIsRunning(false);
        if (completedRun.verificationResult) {
          setVerificationResult(completedRun.verificationResult);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  const handleToggleClaim = (claimKey: string) => {
    setSelectedClaims((prev) =>
      prev.includes(claimKey) ? prev.filter((k) => k !== claimKey) : [...prev, claimKey]
    );
  };

  const handleRunFlow = async () => {
    setIsRunning(true);
    setSteps([]);
    setErrorMsg(null);
    setVerificationResult(null);

    try {
      const runRecord = await runSingleFlow({
        issuerId: selectedIssuerId,
        walletId: selectedWalletId,
        verifierId: selectedVerifierId,
        format: selectedFormat,
        profileId: selectedProfileId,
        tamperScenario: selectedTamper,
        selectedClaims
      });

      setSteps(runRecord.steps);
      setSelectedStepIndex(runRecord.steps.length - 1);
      setIsIssued(true);

      const step4 = runRecord.steps.find((s) => s.endpoint?.includes('presentation-request'));
      if (step4?.responsePayload) {
        setDeepLink(step4.responsePayload.deepLink || '');
        setQrPayload(step4.responsePayload.qrPayload || '');
      }

      if (runRecord.verificationResult) {
        setVerificationResult(runRecord.verificationResult);
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  const currentIssuerName = modules.issuers.find((i) => i.id === selectedIssuerId)?.name || selectedIssuerId;
  const currentWalletName = modules.wallets.find((w) => w.id === selectedWalletId)?.name || selectedWalletId;
  const currentVerifierName = modules.verifiers.find((v) => v.id === selectedVerifierId)?.name || selectedVerifierId;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* 1. Header Bar with Global Run Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
              Ecosystem Sandbox
            </span>
            <span className="text-zinc-600">•</span>
            <span className="font-mono text-[10px] text-blue-300">OpenID4VCI draft 13 & OpenID4VP draft 21-23</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight mt-0.5">
            Interoperability Testing Workspace
          </h1>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRunFlow}
            disabled={isRunning}
            className={`px-5 py-2.5 rounded-lg font-medium text-xs flex items-center space-x-2 transition-all duration-150 active:scale-[0.98] ${
              isRunning
                ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                : 'bg-[#0e2448] hover:bg-[#122e5c] text-white border border-blue-800 shadow-sm'
            }`}
          >
            {isRunning ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-white rounded-full animate-spin" />
                <span className="font-mono text-[11px] text-blue-100">Executing Protocol Exchange...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-blue-200 fill-current" />
                <span>Run Full Interoperability Flow</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center space-x-2.5 text-zinc-300 text-xs font-mono">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div>
            <span className="font-semibold text-zinc-100">Execution Error: </span>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* 2. One-Click Scenario Presets Bar */}
      <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] uppercase text-zinc-400 tracking-wider flex items-center space-x-1.5 font-semibold">
            <Sparkles className="w-3 h-3 text-blue-300" />
            <span>One-Click Test Scenarios</span>
          </span>
          <span className="text-[10px] font-mono text-zinc-500">Instant multi-standard configurations</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {presets.map((p) => {
            const isPresetActive =
              selectedIssuerId === p.issuerId &&
              selectedWalletId === p.walletId &&
              selectedVerifierId === p.verifierId &&
              selectedFormat === p.format &&
              selectedTamper === p.tamper;

            return (
              <button
                key={p.id}
                onClick={() => handleApplyPreset(p)}
                disabled={isRunning}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center space-x-2 transition-all duration-150 ${
                  isPresetActive
                    ? 'border-blue-700/80 bg-[#0a1628] text-white shadow-sm ring-1 ring-blue-600/30'
                    : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>{p.label}</span>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                    isPresetActive
                      ? 'bg-[#0e2448] text-blue-200 border-blue-900/70'
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`}
                >
                  {p.formatBadge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Visual Architectural Pipeline Strip */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-2 flex-wrap gap-y-2 text-xs font-mono">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mr-1">Pipeline:</span>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#0a1628] border border-blue-900/60 text-white">
            <span className="text-[9px] text-blue-300 font-semibold uppercase">01 ISSUER</span>
            <span className="text-zinc-600">•</span>
            <span className="font-semibold">{currentIssuerName}</span>
          </div>

          <span className="text-zinc-500 font-mono text-[10px] px-1 hidden sm:inline">──(OpenID4VCI)──▶</span>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#0a1628] border border-blue-900/60 text-white">
            <span className="text-[9px] text-blue-300 font-semibold uppercase">02 HOLDER</span>
            <span className="text-zinc-600">•</span>
            <span className="font-semibold">{currentWalletName}</span>
          </div>

          <span className="text-zinc-500 font-mono text-[10px] px-1 hidden sm:inline">──(OpenID4VP)──▶</span>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#0a1628] border border-blue-900/60 text-white">
            <span className="text-[9px] text-blue-300 font-semibold uppercase">03 VERIFIER</span>
            <span className="text-zinc-600">•</span>
            <span className="font-semibold">{currentVerifierName}</span>
          </div>

          <div className="ml-auto flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-[#0d1e38] text-blue-200 border border-blue-900/70 text-[10px] font-mono">
              {selectedFormat}
            </span>
            {selectedTamper !== 'NONE' && (
              <span className="px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800 text-[10px] font-mono font-semibold">
                Attack: {selectedTamper}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowConfig(!showConfig)}
          className="self-start md:self-auto px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white font-mono text-xs flex items-center space-x-1.5 transition-colors flex-shrink-0"
        >
          <span>{showConfig ? 'Hide Custom Configuration' : 'Customize Modules & Formats'}</span>
          {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 4. Collapsible Detailed Configuration Panel */}
      {showConfig && (
        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
          <ThreeColumnSelector
            issuers={modules.issuers}
            wallets={modules.wallets}
            verifiers={modules.verifiers}
            selectedIssuerId={selectedIssuerId}
            selectedWalletId={selectedWalletId}
            selectedVerifierId={selectedVerifierId}
            onSelectIssuer={setSelectedIssuerId}
            onSelectWallet={setSelectedWalletId}
            onSelectVerifier={setSelectedVerifierId}
            disabled={isRunning}
          />

          <FormatProfileSelector
            format={selectedFormat}
            profileId={selectedProfileId}
            profiles={modules.profiles}
            onSelectFormat={setSelectedFormat}
            onSelectProfile={setSelectedProfileId}
            disabled={isRunning}
          />

          <TamperSelector
            tamperScenario={selectedTamper}
            scenarios={modules.tamperScenarios}
            onSelectTamper={setSelectedTamper}
            disabled={isRunning}
          />
        </div>
      )}

      {/* 5. Interactive Split Workbench (Side-by-Side: Wallet on Left, Protocol & Audit on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Holder Wallet & Security Document Keystore */}
        <div className="lg:col-span-5 space-y-4">
          <WalletCard
            format={selectedFormat}
            profileId={selectedProfileId}
            claims={currentProfile.claims}
            selectedClaims={selectedClaims}
            onToggleClaim={handleToggleClaim}
            deepLink={deepLink}
            qrPayload={qrPayload}
            isIssued={isIssued}
            onPresent={handleRunFlow}
            isVerifying={isRunning}
          />
        </div>

        {/* Right Column: Protocol Exchange Trace, Verdict Banner & Protocol Inspector */}
        <div className="lg:col-span-7 space-y-4">
          {/* Inline Live Verification Verdict Banner */}
          {verificationResult ? (
            <div
              className={`rounded-xl p-4 border transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
                verificationResult.isValid
                  ? 'border-blue-900/70 bg-[#0a1628]'
                  : 'border-amber-900/70 bg-amber-950/20'
              }`}
            >
              <div className="flex items-start sm:items-center space-x-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0 ${
                    verificationResult.isValid ? 'bg-blue-600 text-white' : 'bg-amber-500/20 text-amber-300 border border-amber-600/50'
                  }`}
                >
                  {verificationResult.isValid ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-white tracking-tight">
                      {verificationResult.status}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${
                        verificationResult.isValid
                          ? 'bg-[#0e2448] text-blue-200 border-blue-800'
                          : 'bg-amber-950/70 text-amber-300 border-amber-800'
                      }`}
                    >
                      {verificationResult.isValid
                        ? `${verificationResult.checks.filter((c) => c.passed).length}/${verificationResult.checks.length} Checks Passed`
                        : 'Security Policy Rejected'}
                    </span>
                    <span className="font-mono text-[11px] text-zinc-400">
                      {verificationResult.latencyMs}ms
                    </span>
                  </div>

                  <p className="font-mono text-[11px] text-zinc-300 mt-1 leading-relaxed">
                    Algorithm: <strong className="text-white">{verificationResult.cryptographicDetails.algorithm}</strong> • Key: <strong className="text-white truncate max-w-[140px] inline-block align-bottom">{verificationResult.cryptographicDetails.issuerKeyId}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowResultModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-200 hover:text-white border border-zinc-700 text-xs font-mono flex items-center space-x-1.5 transition-colors self-start sm:self-auto flex-shrink-0"
              >
                <span>View Full Audit Certificate</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-300" />
              </button>
            </div>
          ) : (
            <div className="rounded-xl p-3.5 border border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-zinc-500" />
                <span className="text-zinc-400">Ready to execute protocol flow. Click "Run Full Interoperability Flow".</span>
              </div>
            </div>
          )}

          {/* Sequence Timeline */}
          <SequenceDiagram
            steps={steps}
            selectedStepIndex={selectedStepIndex}
            onSelectStep={setSelectedStepIndex}
            isRunning={isRunning}
          />

          {/* Protocol Payload Inspector */}
          <ProtocolInspector
            steps={steps}
            selectedStepIndex={selectedStepIndex}
            onSelectStep={setSelectedStepIndex}
          />
        </div>
      </div>

      {/* Verification Result Modal (On Demand Only) */}
      {showResultModal && (
        <VerificationResultModal
          result={verificationResult}
          onClose={() => setShowResultModal(false)}
        />
      )}
    </div>
  );
};
