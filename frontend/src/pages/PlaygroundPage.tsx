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
  VerificationResult,
  InteropRunRecord
} from '../types';
import { ThreeColumnSelector } from '../components/ThreeColumnSelector';
import { FormatProfileSelector } from '../components/FormatProfileSelector';
import { TamperSelector } from '../components/TamperSelector';
import { SequenceDiagram } from '../components/SequenceDiagram';
import { ProtocolInspector } from '../components/ProtocolInspector';
import { WalletCard } from '../components/WalletCard';
import { VerificationResultModal } from '../components/VerificationResultModal';
import { runSingleFlow, subscribeWebSocket } from '../services/api';
import { Play, RotateCcw, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

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
        setSelectedStepIndex((prev) => prev);
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

      // Extract deepLink and QR from steps if available
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Interoperability Playground Sandbox</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Live
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure any combination of Issuer, Wallet, and Verifier to test end-to-end credential issuance and verification.
          </p>
        </div>

        {/* Big Action CTA Button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRunFlow}
            disabled={isRunning}
            className={`px-6 py-3 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-xl transition-all ${
              isRunning
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-inji-600 via-blue-600 to-mosip-600 hover:from-inji-500 hover:to-mosip-500 text-white shadow-inji-500/25 active:scale-95'
            }`}
          >
            {isRunning ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Running Interoperability Exchange...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Run Interoperability Flow</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-4 bg-red-950/40 border border-red-500/50 rounded-2xl flex items-center space-x-3 text-red-200 text-xs">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <span className="font-bold">Execution Error: </span>
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

      {/* 4. Wallet Presentation Card (Hold & Present) */}
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

      {/* 5. Live Sequence Diagram & Protocol Inspector Split */}
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
