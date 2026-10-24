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

export interface CredentialSubjectClaims {
  uin?: string;
  fullName?: string;
  birthDate?: string;
  gender?: string;
  nationality?: string;
  address?: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  vehicleClasses?: string[];
  vaccineCode?: string;
  doseNumber?: number;
  totalDoses?: number;
  dateOfVaccination?: string;
  countryOfVaccination?: string;
  [key: string]: unknown;
}

export interface CredentialOffer {
  credential_issuer: string;
  credentials: string[];
  grants: {
    'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
      'pre-authorized_code': string;
      user_pin_required?: boolean;
      tx_code?: {
        input_mode: string;
        length: number;
        description: string;
      };
    };
  };
}

export interface OpenID4VCIssuerMetadata {
  credential_issuer: string;
  authorization_servers: string[];
  credential_endpoint: string;
  batch_credential_endpoint?: string;
  credentials_supported: Array<{
    id: string;
    format: CredentialFormat;
    scope?: string;
    vct?: string;
    doctype?: string;
    cryptographic_binding_methods_supported?: string[];
    cryptographic_suites_supported?: string[];
    display?: Array<{
      name: string;
      locale?: string;
      logo?: { url: string; alt_text: string };
      background_color?: string;
      text_color?: string;
    }>;
    credential_definition?: {
      type: string[];
      credentialSubject?: Record<string, unknown>;
    };
  }>;
}

export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  c_nonce: string;
  c_nonce_expires_in: number;
}

export interface CredentialRequestPayload {
  format: CredentialFormat;
  credential_definition?: {
    type: string[];
  };
  doctype?: string;
  vct?: string;
  proof: {
    proof_type: 'jwt';
    jwt: string;
  };
}

export interface CredentialResponsePayload {
  credential: unknown;
  c_nonce?: string;
  c_nonce_expires_in?: number;
  format: CredentialFormat;
}

export interface PresentationDefinition {
  id: string;
  input_descriptors: Array<{
    id: string;
    purpose?: string;
    format?: Partial<Record<CredentialFormat, { proof_type?: string[]; alg?: string[] }>>;
    constraints: {
      fields: Array<{
        path: string[];
        filter?: {
          type?: string;
          pattern?: string;
          const?: string;
        };
        purpose?: string;
        optional?: boolean;
      }>;
    };
  }>;
}

export interface PresentationRequestPayload {
  client_id: string;
  response_uri: string;
  response_type: 'vp_token';
  response_mode: 'direct_post';
  nonce: string;
  state: string;
  presentation_definition: PresentationDefinition;
  client_metadata?: {
    client_name: string;
    logo_uri?: string;
  };
}

export interface DescriptorMapItem {
  id: string;
  format: CredentialFormat;
  path: string;
  path_nested?: {
    format: string;
    path: string;
  };
}

export interface PresentationSubmission {
  id: string;
  definition_id: string;
  descriptor_map: DescriptorMapItem[];
}

export interface AuthorizationResponsePayload {
  vp_token: unknown;
  presentation_submission: PresentationSubmission;
  state: string;
}

export interface VerificationCheck {
  name: string;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface VerificationResult {
  status: VerificationStatus;
  isValid: boolean;
  issuerId: string;
  holderDid?: string;
  format: CredentialFormat;
  profileId: CredentialProfileId;
  verifiedClaims: Record<string, unknown>;
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

export interface ProtocolExchangeStep {
  stepIndex: number;
  id: string;
  title: string;
  source: 'Issuer' | 'Wallet' | 'Verifier' | 'Orchestrator';
  target: 'Issuer' | 'Wallet' | 'Verifier' | 'Orchestrator';
  protocol: 'OpenID4VCI' | 'OpenID4VP' | 'Internal';
  endpoint?: string;
  method?: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
  headers?: Record<string, string>;
  status: 'PENDING' | 'SUCCESS' | 'ERROR';
  durationMs?: number;
  timestamp: string;
  notes?: string;
}

export interface InteropRunRecord {
  id: string;
  timestamp: string;
  issuer: {
    id: IssuerId;
    name: string;
    version: string;
  };
  wallet: {
    id: WalletId;
    name: string;
    version: string;
  };
  verifier: {
    id: VerifierId;
    name: string;
    version: string;
  };
  format: CredentialFormat;
  profile: CredentialProfileId;
  tamperScenario: TamperScenario;
  outcome: VerificationStatus;
  passed: boolean;
  durationMs: number;
  steps: ProtocolExchangeStep[];
  verificationResult?: VerificationResult;
}
