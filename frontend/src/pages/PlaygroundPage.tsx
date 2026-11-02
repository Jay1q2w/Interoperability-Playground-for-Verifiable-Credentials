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
import { ExternalVerifierTester } from '../components/ExternalVerifierTester';
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
  Upload,
  Activity,
  ArrowRight,
  SlidersHorizontal
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
  const [customClaims, setCustomClaims] = useState<Record<string, any>>({ ...currentProfile.claims });
  const [selectedClaims, setSelectedClaims] = useState<string[]>(Object.keys(currentProfile.claims));

  const [steps, setSteps] = useState<ProtocolExchangeStep[]>([]);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [rightPanelTab, setRightPanelTab] = useState<'exchange' | 'external'>('exchange');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [deepLink, setDeepLink] = useState<string>('');
  const [qrPayload, setQrPayload] = useState<string>('');
  const [isIssued, setIsIssued] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Standard Interoperability Benchmarks
  const benchmarks = [
    {
      id: 'core-mosip',
      label: 'MOSIP National ID',
      formatBadge: 'W3C VC 1.1',
      description: 'Ed25519Signature2020 + JSON-LD proof',
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
      formatBadge: 'IETF SD-JWT VC',
      description: 'ES256 + salted attribute disclosures',
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
      formatBadge: 'ISO/IEC 18013-5 mdoc',
      description: 'CBOR + COSE Sign1 MSO hierarchy',
      issuerId: 'inji-certify' as IssuerId,
      walletId: 'inji-mobile' as WalletId,
      verifierId: 'inji-verify' as VerifierId,
      format: 'mso_mdoc' as CredentialFormat,
      profileId: 'DIGITAL_DRIVING_LICENSE' as CredentialProfileId,
      tamper: 'NONE' as TamperScenario
    },
    {
      id: 'cross-walt',
      label: 'Cross-Ecosystem Interop',
      formatBadge: 'Walt.id → Inji',
      description: 'External Issuer to Inji Web & Verify',
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
      description: 'Signature corruption rejection check',
      issuerId: 'inji-certify' as IssuerId,
      walletId: 'inji-web' as WalletId,
      verifierId: 'inji-verify' as VerifierId,
      format: 'ldp_vc' as CredentialFormat,
      profileId: 'MOSIP_NATIONAL_ID' as CredentialProfileId,
      tamper: 'TAMPERED_SIGNATURE' as TamperScenario
    }
  ];

  const handleApplyBenchmark = (b: typeof benchmarks[0]) => {
    setSelectedIssuerId(b.issuerId);
    setSelectedWalletId(b.walletId);
    setSelectedVerifierId(b.verifierId);
    setSelectedFormat(b.format);
    setSelectedProfileId(b.profileId);
    setSelectedTamper(b.tamper);
    const prof = modules.profiles[b.profileId] || modules.profiles.MOSIP_NATIONAL_ID;
    setCustomClaims({ ...prof.claims });
    setSelectedClaims(Object.keys(prof.claims));
  };

  // Sync claims when profile changes
  useEffect(() => {
    const prof = modules.profiles[selectedProfileId] || modules.profiles.MOSIP_NATIONAL_ID;
    setCustomClaims({ ...prof.claims });
    setSelectedClaims(Object.keys(prof.claims));
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

  const handleUpdateClaim = (key: string, value: string) => {
    setCustomClaims((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAddClaim = (key: string, value: string) => {
    setCustomClaims((prev) => ({
      ...prev,
      [key]: value
    }));
    setSelectedClaims((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const handleResetClaims = () => {
    const prof = modules.profiles[selectedProfileId] || modules.profiles.MOSIP_NATIONAL_ID;
    setCustomClaims({ ...prof.claims });
    setSelectedClaims(Object.keys(prof.claims));
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
        selectedClaims,
        customClaims
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Page Header */}
      <div className="border-b border-zinc-800 pb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
              MOSIP Inji • Multi-Standard Interoperability Playground
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              Protocol Conformance & Interoperability Testbed
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
              Verify end-to-end credential issuance (OpenID4VCI draft 13) and presentation exchange (OpenID4VP draft 21–23) across W3C VC, IETF SD-JWT, and ISO/IEC 18013-5 mdoc standards.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRunFlow}
              disabled={isRunning}
              className={`px-5 py-2.5 rounded-lg font-medium text-xs font-mono flex items-center space-x-2 transition-all duration-150 active:scale-[0.98] ${
                isRunning
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                  : 'bg-[#0e2448] hover:bg-[#122e5c] text-white border border-blue-700 shadow-sm'
              }`}
            >
              {isRunning ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-white rounded-full animate-spin" />
                  <span>Executing Protocol Flow...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-blue-200 fill-current" />
                  <span>Run Interoperability Flow</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mt-4 p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center space-x-2.5 text-zinc-300 text-xs font-mono">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div>
              <span className="font-semibold text-zinc-100">Execution Error: </span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 01: TEST MATRIX & PROTOCOL SPECIFICATION
          ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-blue-300">
              01
            </span>
            <div>
              <h2 className="font-mono text-sm font-semibold tracking-wider uppercase text-white">
                Test Matrix & Protocol Specification
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Select a reference benchmark or customize participant modules, credential formats, and attack parameters.
              </p>
            </div>
          </div>
        </div>

        {/* Benchmark Presets Grid */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
              Standard Interoperability Benchmarks
            </span>
            <span className="font-mono text-[10px] text-zinc-500">
              Click to load reference configuration
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {benchmarks.map((b) => {
              const isActive =
                selectedIssuerId === b.issuerId &&
                selectedWalletId === b.walletId &&
                selectedVerifierId === b.verifierId &&
                selectedFormat === b.format &&
                selectedTamper === b.tamper;

              return (
                <button
                  key={b.id}
                  onClick={() => handleApplyBenchmark(b)}
                  disabled={isRunning}
                  className={`p-3 rounded-lg border text-left transition-all duration-150 flex flex-col justify-between ${
                    isActive
                      ? 'border-blue-700 bg-[#0a1628] text-white shadow-sm ring-1 ring-blue-600/30'
                      : 'border-zinc-850 bg-zinc-900/40 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{b.label}</span>
                      {isActive && <Check className="w-3.5 h-3.5 text-blue-300 stroke-[2.5]" />}
                    </div>
                    <span
                      className={`inline-block mt-1 text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                        isActive
                          ? 'bg-[#0e2448] text-blue-200 border-blue-800'
                          : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                      }`}
                    >
                      {b.formatBadge}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono mt-2 leading-relaxed">
                    {b.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Pipeline Strip & Customization Trigger */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-2 flex-wrap gap-y-2 text-xs font-mono">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mr-1">
              Active Pipeline:
            </span>

            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#0a1628] border border-blue-900/60 text-white">
              <span className="text-[9px] text-blue-300 font-semibold uppercase">Issuer</span>
              <span className="text-zinc-600">•</span>
              <span className="font-semibold">{currentIssuerName}</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-zinc-600 hidden sm:inline" />

            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#0a1628] border border-blue-900/60 text-white">
              <span className="text-[9px] text-blue-300 font-semibold uppercase">Holder</span>
              <span className="text-zinc-600">•</span>
              <span className="font-semibold">{currentWalletName}</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-zinc-600 hidden sm:inline" />

            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#0a1628] border border-blue-900/60 text-white">
              <span className="text-[9px] text-blue-300 font-semibold uppercase">Verifier</span>
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
            className="self-start md:self-auto px-3.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white font-mono text-xs flex items-center space-x-2 transition-colors flex-shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
            <span>{showConfig ? 'Hide Detailed Controls' : 'Customize Actors & Formats'}</span>
            {showConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Granular Participant, Format, and Security Attack Selector Panel */}
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
      </section>

      {/* =========================================================================
          SECTION 02: HOLDER WALLET & CREDENTIAL DATA
          ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-blue-300">
              02
            </span>
            <div>
              <h2 className="font-mono text-sm font-semibold tracking-wider uppercase text-white">
                Holder Wallet & Credential Data Keystore
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Inspect the identity document issued to the wallet. Modify claims or configure selective disclosure prior to presentation.
              </p>
            </div>
          </div>
        </div>

        {/* Wallet Keystore & Claims Workspace */}
        <WalletCard
          format={selectedFormat}
          profileId={selectedProfileId}
          claims={customClaims}
          selectedClaims={selectedClaims}
          onToggleClaim={handleToggleClaim}
          onUpdateClaim={handleUpdateClaim}
          onAddClaim={handleAddClaim}
          onResetClaims={handleResetClaims}
          deepLink={deepLink}
          qrPayload={qrPayload}
          isIssued={isIssued}
          onPresent={handleRunFlow}
          isVerifying={isRunning}
        />
      </section>

      {/* =========================================================================
          SECTION 03: PROTOCOL EXECUTION & CRYPTOGRAPHIC VERIFICATION
          ========================================================================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-blue-300">
              03
            </span>
            <div>
              <h2 className="font-mono text-sm font-semibold tracking-wider uppercase text-white">
                Protocol Execution & Cryptographic Verification
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Execute the end-to-end issuance and presentation lifecycle, inspect wire messages, and audit cryptographic proofs.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRunFlow}
              disabled={isRunning}
              className={`px-4 py-2 rounded-lg font-medium text-xs font-mono flex items-center space-x-2 transition-all duration-150 ${
                isRunning
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                  : 'bg-[#0e2448] hover:bg-[#122e5c] text-white border border-blue-700 shadow-sm'
              }`}
            >
              <Play className="w-3.5 h-3.5 text-blue-200 fill-current" />
              <span>{isRunning ? 'Running Exchange...' : 'Execute Protocol Flow'}</span>
            </button>
          </div>
        </div>

        {/* View Mode Tabs: Live Exchange vs External Credential Tester */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center space-x-2 font-mono text-xs">
            <button
              onClick={() => setRightPanelTab('exchange')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
                rightPanelTab === 'exchange'
                  ? 'bg-[#0e2448] text-white border border-blue-900 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/50'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-blue-300" />
              <span>Live Protocol Exchange & Step Inspector</span>
            </button>
            <button
              onClick={() => setRightPanelTab('external')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 ${
                rightPanelTab === 'external'
                  ? 'bg-[#0e2448] text-white border border-blue-900 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/50'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-blue-300" />
              <span>Verify External Credential (Upload / Paste)</span>
            </button>
          </div>
        </div>

        {rightPanelTab === 'external' ? (
          <ExternalVerifierTester
            onVerificationResult={(res) => setVerificationResult(res)}
          />
        ) : (
          <div className="space-y-4">
            {/* Inline Cryptographic Verification Verdict Banner */}
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
                      verificationResult.isValid
                        ? 'bg-blue-600 text-white'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-600/50'
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
                      Algorithm: <strong className="text-white">{verificationResult.cryptographicDetails.algorithm}</strong> • Key: <strong className="text-white truncate max-w-[160px] inline-block align-bottom">{verificationResult.cryptographicDetails.issuerKeyId}</strong>
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
                  <span className="text-zinc-400">
                    Ready to execute protocol flow. Click "Execute Protocol Flow" to initiate OpenID4VCI issuance and OpenID4VP verification.
                  </span>
                </div>
              </div>
            )}

            {/* Sequence Diagram Visualizer */}
            <SequenceDiagram
              steps={steps}
              selectedStepIndex={selectedStepIndex}
              onSelectStep={setSelectedStepIndex}
              isRunning={isRunning}
            />

            {/* Wire Protocol Message Inspector */}
            <ProtocolInspector
              steps={steps}
              selectedStepIndex={selectedStepIndex}
              onSelectStep={setSelectedStepIndex}
            />
          </div>
        )}
      </section>

      {/* Cryptographic Audit Certificate Modal */}
      {showResultModal && (
        <VerificationResultModal
          result={verificationResult}
          onClose={() => setShowResultModal(false)}
        />
      )}
    </div>
  );
};
