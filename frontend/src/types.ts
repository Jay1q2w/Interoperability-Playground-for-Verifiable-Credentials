export type CredentialFormat = 'ldp_vc' | 'vc+sd-jwt' | 'mso_mdoc';
export type CredentialProfileId = 'MOSIP_NATIONAL_ID' | 'DIGITAL_DRIVING_LICENSE' | 'VACCINATION_CREDENTIAL';

export type IssuerId = 'inji-certify' | 'waltid-issuer' | 'generic-oid4vci';
export type WalletId = 'inji-web' | 'inji-mobile' | 'generic-wallet';
export type VerifierId = 'inji-verify' | 'sphereon-verifier' | 'generic-oid4vp';

export type VerificationStatus = 
  | 'VALID'
  | 'INVALID'
  | 'VALID_BUT_EXPIRED'
  | 'TAMPERED_SIGNATURE'
  | 'TAMPERED_CLAIM'
  | 'INVALID_NONCE'
  | 'MISMATCHED_AUDIENCE'
  | 'REVOKED'
  | 'UNSUPPORTED_FORMAT';

export type TamperScenario =
  | 'NONE'
  | 'EXPIRED_CREDENTIAL'
  | 'CORRUPTED_SIGNATURE'
  | 'TAMPERED_CLAIM'
  | 'INVALID_NONCE'
  | 'MISMATCHED_AUDIENCE'
  | 'REVOKED_STATUS'
  | 'UNSUPPORTED_FORMAT';

export interface ModuleItem {
  id: string;
  name: string;
  version: string;
  type: 'inji' | 'external' | 'generic';
  description: string;
  supportedFormats: CredentialFormat[];
}

export interface ProfileItem {
  name: string;
  description: string;
  defaultFormat: CredentialFormat;
  claims: Record<string, any>;
}

export interface TamperItem {
  id: TamperScenario;
  name: string;
  category: 'Cryptographic' | 'Temporal' | 'Replay/Audience' | 'Revocation' | 'Format';
  description: string;
  expectedOutcome: string;
}

export interface ProtocolExchangeStep {
  stepIndex: number;
  id: string;
  title: string;
  source: 'Issuer' | 'Wallet' | 'Verifier' | 'Orchestrator';
  target: 'Issuer' | 'Wallet' | 'Verifier' | 'Orchestrator';
  protocol: 'OpenID4VCI' | 'OpenID4VP' | 'Internal';
  endpoint?: string;
  method?: string;
  requestPayload?: any;
  responsePayload?: any;
  status: 'SUCCESS' | 'ERROR' | 'PENDING';
  durationMs?: number;
  timestamp: string;
  notes?: string;
}

export interface VerificationCheck {
  name: string;
  passed: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface VerificationResult {
  status: VerificationStatus;
  isValid: boolean;
  issuerId: string;
  holderDid?: string;
  format: CredentialFormat;
  profileId: CredentialProfileId;
  verifiedClaims: Record<string, any>;
  disclosedClaimsCount: number;
  hiddenClaimsCount: number;
  checks: VerificationCheck[];
  errors: string[];
  warnings: string[];
  latencyMs: number;
  timestamp: string;
  cryptographicDetails: {
    algorithm: string;
    issuerKeyId: string;
    holderBindingVerified: boolean;
    replayProtectionVerified: boolean;
    notExpired: boolean;
    revocationStatusVerified: boolean;
  };
}

export interface InteropRunRecord {
  id: string;
  timestamp: string;
  issuer: { id: IssuerId; name: string; version: string };
  wallet: { id: WalletId; name: string; version: string };
  verifier: { id: VerifierId; name: string; version: string };
  format: CredentialFormat;
  profile: CredentialProfileId;
  tamperScenario: TamperScenario;
  outcome: VerificationStatus;
  passed: boolean;
  durationMs: number;
  steps: ProtocolExchangeStep[];
  verificationResult?: VerificationResult;
}

export interface CompatibilityCell {
  issuerId: IssuerId;
  walletId: WalletId;
  verifierId: VerifierId;
  format: CredentialFormat;
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  lastOutcome: VerificationStatus;
  lastRunTimestamp: string;
}

export interface MatrixStats {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  avgLatencyMs: number;
  formatStats: Record<string, { total: number; passed: number }>;
  matrixCells: CompatibilityCell[];
}
