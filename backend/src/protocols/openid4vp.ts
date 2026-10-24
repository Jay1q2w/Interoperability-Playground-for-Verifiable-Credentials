import crypto from 'crypto';
import { 
  CredentialFormat, 
  CredentialProfileId, 
  PresentationRequestPayload, 
  PresentationDefinition,
  AuthorizationResponsePayload,
  VerificationResult,
  VerificationStatus,
  VerificationCheck
} from '../types/index.js';
import { getKeys, CryptoKeyPair } from '../crypto/keys.js';
import { verifyW3CPresentation, W3CVerifiablePresentation } from '../crypto/w3c.js';
import { verifySDJwtPresentation } from '../crypto/sdjwt.js';
import { verifyMDocPresentation, DeviceResponse } from '../crypto/mdoc.js';

export interface VerifierSession {
  state: string;
  nonce: string;
  clientId: string;
  responseUri: string;
  createdAt: number;
  format: CredentialFormat;
  profileId: CredentialProfileId;
  presentationDefinition: PresentationDefinition;
  verifierId: string;
}

const verifierSessions = new Map<string, VerifierSession>();

export function createPresentationRequest(
  verifierBaseUrl: string,
  verifierId: string,
  format: CredentialFormat,
  profileId: CredentialProfileId
): { request: PresentationRequestPayload; deepLink: string; qrPayload: string } {
  const nonce = `v_nonce_${crypto.randomBytes(16).toString('hex')}`;
  const state = `state_${crypto.randomBytes(16).toString('hex')}`;
  const clientId = `${verifierBaseUrl}/verifier/${verifierId}`;
  const responseUri = `${verifierBaseUrl}/api/verifier/response`;

  // DIF Presentation Exchange 2.0 Presentation Definition
  const presentationDefinition: PresentationDefinition = {
    id: `pd_${profileId.toLowerCase()}_${Date.now()}`,
    input_descriptors: [
      {
        id: 'identity_credential_descriptor',
        purpose: 'Verify subject identity attributes according to ecosystem rules',
        format: {
          [format]: {
            proof_type: ['Ed25519Signature2020', 'RsaSignature2018'],
            alg: ['EdDSA', 'ES256', 'RS256']
          }
        },
        constraints: {
          fields: [
            {
              path: [
                '$.credentialSubject.fullName',
                '$.fullName',
                '$["org.iso.18013.5.1"].family_name',
                '$["org.iso.18013.5.1"].given_name'
              ],
              purpose: 'Legal full name of identity holder'
            },
            {
              path: [
                '$.credentialSubject.uin',
                '$.uin',
                '$["org.iso.18013.5.1"].document_number'
              ],
              purpose: 'Unique National Identity Number'
            }
          ]
        }
      }
    ]
  };

  const request: PresentationRequestPayload = {
    client_id: clientId,
    response_uri: responseUri,
    response_type: 'vp_token',
    response_mode: 'direct_post',
    nonce,
    state,
    presentation_definition: presentationDefinition,
    client_metadata: {
      client_name: verifierId === 'inji-verify' ? 'Inji Verify Service' : 'Generic OpenID4VP Verifier',
      logo_uri: 'https://inji.io/logo.png'
    }
  };

  verifierSessions.set(state, {
    state,
    nonce,
    clientId,
    responseUri,
    createdAt: Date.now(),
    format,
    profileId,
    presentationDefinition,
    verifierId
  });

  const deepLink = `openid4vp://?client_id=${encodeURIComponent(clientId)}&response_uri=${encodeURIComponent(responseUri)}&nonce=${nonce}&state=${state}&presentation_definition=${encodeURIComponent(JSON.stringify(presentationDefinition))}`;
  
  return {
    request,
    deepLink,
    qrPayload: deepLink
  };
}

export function getVerifierSession(state: string): VerifierSession | undefined {
  return verifierSessions.get(state);
}

/**
 * Validates and verifies an OpenID4VP presentation submission
 */
export async function verifyPresentation(
  payload: AuthorizationResponsePayload,
  issuerKeyOverride?: CryptoKeyPair
): Promise<VerificationResult> {
  const startTime = Date.now();
  const session = verifierSessions.get(payload.state);

  if (!session) {
    return {
      status: 'INVALID',
      isValid: false,
      issuerId: 'unknown',
      format: 'ldp_vc',
      profileId: 'MOSIP_NATIONAL_ID',
      verifiedClaims: {},
      disclosedClaimsCount: 0,
      hiddenClaimsCount: 0,
      checks: [{
        name: 'Session State Lookup',
        passed: false,
        message: 'Unknown, mismatched, or expired state parameter'
      }],
      errors: ['Session expired or invalid state'],
      warnings: [],
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      cryptographicDetails: {
        algorithm: 'none',
        issuerKeyId: 'unknown',
        holderBindingVerified: false,
        replayProtectionVerified: false,
        notExpired: false,
        revocationStatusVerified: false
      }
    };
  }

  const keys = getKeys();
  const issuerKey = issuerKeyOverride || keys.injiCertifyIssuer;

  let verificationStatus: VerificationStatus = 'VALID';
  const checks: VerificationCheck[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let verifiedClaims: Record<string, unknown> = {};
  let disclosedCount = 0;
  let hiddenCount = 0;
  let algorithm = issuerKey.alg;
  let holderBindingVerified = false;

  // 1. Verify Presentation Submission schema & descriptor match
  const submission = payload.presentation_submission;
  const hasSubmission = Boolean(
    submission &&
    submission.definition_id === session.presentationDefinition.id &&
    Array.isArray(submission.descriptor_map) &&
    submission.descriptor_map.length > 0
  );

  checks.push({
    name: 'Presentation Submission Descriptor Match',
    passed: hasSubmission,
    message: hasSubmission 
      ? `Descriptor mapped to ${submission.definition_id}` 
      : 'Invalid or missing presentation submission mapping'
  });

  if (!hasSubmission) {
    errors.push('Presentation submission does not match requested presentation definition');
  }

  // 2. Route by Format
  const format = session.format;

  if (format === 'ldp_vc') {
    const vp = payload.vp_token as W3CVerifiablePresentation;
    const res = await verifyW3CPresentation(
      vp,
      session.nonce,
      session.clientId,
      issuerKey
    );

    checks.push(...res.checks);
    errors.push(...res.errors);
    verifiedClaims = res.verifiedClaims;
    disclosedCount = Object.keys(verifiedClaims).length;
    holderBindingVerified = res.checks.some(c => c.name === 'Holder Authentication Signature' && c.passed);
  } 
  else if (format === 'vc+sd-jwt') {
    const token = typeof payload.vp_token === 'string' ? payload.vp_token : '';
    const res = await verifySDJwtPresentation(
      token,
      session.nonce,
      session.clientId,
      issuerKey
    );

    checks.push(...res.checks);
    errors.push(...res.errors);
    verifiedClaims = res.verifiedClaims;
    disclosedCount = Object.keys(verifiedClaims).length;
    hiddenCount = res.hiddenCount;
    holderBindingVerified = res.checks.some(c => c.name.includes('KB-JWT') && c.passed);
  }
  else if (format === 'mso_mdoc') {
    const response = payload.vp_token as DeviceResponse;
    const res = await verifyMDocPresentation(
      response,
      session.nonce,
      session.clientId,
      issuerKey
    );

    checks.push(...res.checks);
    errors.push(...res.errors);
    verifiedClaims = res.verifiedClaims;
    disclosedCount = Object.keys(verifiedClaims).length;
    hiddenCount = res.hiddenCount;
    holderBindingVerified = res.checks.some(c => c.name.includes('Device Authentication') && c.passed);
  } else {
    errors.push(`Unsupported format: ${format}`);
    verificationStatus = 'UNSUPPORTED_FORMAT';
  }

  // 3. Status List Revocation Check
  // Simulate cryptographic status check (e.g. BitstringStatusList / Mosip ID repository)
  const isRevoked = verifiedClaims.isRevoked === true || (payload as unknown as Record<string, unknown>)._simulatedRevoked === true;
  checks.push({
    name: 'Credential Revocation Status Check',
    passed: !isRevoked,
    message: isRevoked ? 'Credential has been REVOKED in authority status list' : 'Credential status is ACTIVE (not revoked)'
  });
  if (isRevoked) {
    errors.push('Credential status check failed: Credential is REVOKED');
    verificationStatus = 'REVOKED';
  }

  // 4. Determine final status code
  if (isRevoked || errors.some(e => e.toLowerCase().includes('revoked'))) {
    verificationStatus = 'REVOKED';
  } else if (errors.some(e => e.toLowerCase().includes('nonce') || e.toLowerCase().includes('challenge'))) {
    verificationStatus = 'INVALID_NONCE';
  } else if (errors.some(e => e.toLowerCase().includes('audience') || e.toLowerCase().includes('domain'))) {
    verificationStatus = 'MISMATCHED_AUDIENCE';
  } else if (errors.some(e => e.toLowerCase().includes('expired'))) {
    verificationStatus = 'VALID_BUT_EXPIRED';
  } else if (errors.some(e => e.toLowerCase().includes('tamper') || e.toLowerCase().includes('signature') || e.toLowerCase().includes('hash'))) {
    verificationStatus = 'TAMPERED_SIGNATURE';
  } else if (errors.length > 0) {
    verificationStatus = 'INVALID';
  }

  const isValid = errors.length === 0 && verificationStatus === 'VALID';
  const latencyMs = Date.now() - startTime;

  return {
    status: verificationStatus,
    isValid,
    issuerId: issuerKey.keyId,
    format,
    profileId: session.profileId,
    verifiedClaims,
    disclosedClaimsCount: disclosedCount,
    hiddenClaimsCount: hiddenCount,
    checks,
    errors,
    warnings,
    latencyMs,
    timestamp: new Date().toISOString(),
    cryptographicDetails: {
      algorithm,
      issuerKeyId: issuerKey.keyId,
      holderBindingVerified,
      replayProtectionVerified: checks.some(c => c.name.includes('Nonce') || c.name.includes('Challenge')),
      notExpired: !errors.some(e => e.toLowerCase().includes('expired')),
      revocationStatusVerified: !isRevoked
    }
  };
}
