import { VerifierId, CredentialFormat } from '../types/index.js';
import { getKeys, CryptoKeyPair } from '../crypto/keys.js';

export interface VerifierModuleInfo {
  id: VerifierId;
  name: string;
  version: string;
  type: 'inji' | 'external' | 'generic';
  description: string;
  supportedFormats: CredentialFormat[];
  verificationPolicies: {
    enforceNonce: boolean;
    enforceAudience: boolean;
    enforceExpiration: boolean;
    checkRevocation: boolean;
  };
  getKey: () => CryptoKeyPair;
}

export const VERIFIER_MODULES: Record<VerifierId, VerifierModuleInfo> = {
  'inji-verify': {
    id: 'inji-verify',
    name: 'Inji Verify (MOSIP Core)',
    version: 'v0.10.4',
    type: 'inji',
    description: 'MOSIP Inji Verify service + SDK with strict DIF Presentation Exchange 2.0 schema validation, signature verification, and revocation checks.',
    supportedFormats: ['ldp_vc', 'vc+sd-jwt', 'mso_mdoc'],
    verificationPolicies: {
      enforceNonce: true,
      enforceAudience: true,
      enforceExpiration: true,
      checkRevocation: true
    },
    getKey: () => getKeys().injiVerifier
  },
  'sphereon-verifier': {
    id: 'sphereon-verifier',
    name: 'Sphereon / DIF Reference Verifier',
    version: 'v0.9.8',
    type: 'external',
    description: 'External standards-compliant OpenID4VP relying party evaluating cross-ecosystem presentation requests and responses.',
    supportedFormats: ['ldp_vc', 'vc+sd-jwt'],
    verificationPolicies: {
      enforceNonce: true,
      enforceAudience: true,
      enforceExpiration: true,
      checkRevocation: false
    },
    getKey: () => getKeys().injiVerifier
  },
  'generic-oid4vp': {
    id: 'generic-oid4vp',
    name: 'Generic OpenID4VP Relying Party',
    version: 'v2.1-draft',
    type: 'generic',
    description: 'Configurable lightweight OpenID4VP relying party conforming to drafts 21–23.',
    supportedFormats: ['ldp_vc', 'vc+sd-jwt', 'mso_mdoc'],
    verificationPolicies: {
      enforceNonce: true,
      enforceAudience: true,
      enforceExpiration: true,
      checkRevocation: true
    },
    getKey: () => getKeys().injiVerifier
  }
};
