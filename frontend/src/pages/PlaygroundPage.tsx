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
import { ArrowUpRight, AlertCircle } from 'lucide-react';

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
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [deepLink, setDeepLink] = useState<string>('');
  const [qrPayload, setQrPayload] = useState<string>('');
  const [isIssued, setIsIssued] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
          setShowResultModal(true);
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
        setShowResultModal(true);
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Editorial Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
            Sandbox Environment
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Interoperability Testing Workspace
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Configure issuer, wallet, and verifier implementations to evaluate end-to-end credential issuance, holding, and cryptographic verification across open standards.
          </p>
        </div>

        {/* Primary Action Button */}
        <div>
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
                <span className="font-mono text-[11px] text-blue-100">Executing Protocol Flow...</span>
              </>
            ) : (
              <>
                <span>Run Interoperability Flow</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-200" />
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

      {/* 1. Three-Column Selector */}
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

      {/* 2. Format & Profile Selector */}
      <FormatProfileSelector
        format={selectedFormat}
        profileId={selectedProfileId}
        profiles={modules.profiles}
        onSelectFormat={setSelectedFormat}
        onSelectProfile={setSelectedProfileId}
        disabled={isRunning}
      />

      {/* 3. Replay & Tamper Mode */}
      <TamperSelector
        tamperScenario={selectedTamper}
        scenarios={modules.tamperScenarios}
        onSelectTamper={setSelectedTamper}
        disabled={isRunning}
      />

      {/* 4. Wallet Presentation Card */}
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

      {/* 5. Sequence Timeline & Protocol Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SequenceDiagram
          steps={steps}
          selectedStepIndex={selectedStepIndex}
          onSelectStep={setSelectedStepIndex}
          isRunning={isRunning}
        />

        <ProtocolInspector
          steps={steps}
          selectedStepIndex={selectedStepIndex}
          onSelectStep={setSelectedStepIndex}
        />
      </div>

      {/* Verification Result Modal */}
      {showResultModal && (
        <VerificationResultModal
          result={verificationResult}
          onClose={() => setShowResultModal(false)}
        />
      )}
    </div>
  );
};
