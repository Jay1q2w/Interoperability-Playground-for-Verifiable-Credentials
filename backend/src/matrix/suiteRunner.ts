import crypto from 'crypto';
import { 
  CredentialFormat, 
  CredentialProfileId, 
  IssuerId, 
  WalletId, 
  VerifierId, 
  TamperScenario,
  InteropRunRecord,
  ProtocolExchangeStep,
  AuthorizationResponsePayload,
  PresentationSubmission
} from '../types/index.js';
import { ISSUER_MODULES, SAMPLE_PROFILES } from '../modules/issuers.js';
import { WALLET_MODULES } from '../modules/wallets.js';
import { VERIFIER_MODULES } from '../modules/verifiers.js';
import { getKeys, initKeyInfrastructure } from '../crypto/keys.js';
import { createCredentialOffer, exchangeToken, processCredentialRequest } from '../protocols/openid4vci.js';
import { createPresentationRequest, verifyPresentation } from '../protocols/openid4vp.js';
import { createW3CPresentation, W3CVerifiableCredential } from '../crypto/w3c.js';
import { createSDJwtPresentation, SDJwtCredentialPackage } from '../crypto/sdjwt.js';
import { createMDocPresentation, MDocDocument } from '../crypto/mdoc.js';
import { applyTamperScenario } from '../tamper/tamperEngine.js';
import { matrixStore } from './store.js';
import * as jose from 'jose';

export interface ExecuteRunOptions {
  issuerId: IssuerId;
  walletId: WalletId;
  verifierId: VerifierId;
  format: CredentialFormat;
  profileId: CredentialProfileId;
  tamperScenario?: TamperScenario;
  selectedClaims?: string[];
  customClaims?: Record<string, unknown>;
  broadcastStep?: (step: ProtocolExchangeStep) => void;
}

export async function executeInteroperabilityRun(options: ExecuteRunOptions): Promise<InteropRunRecord> {
  // Auto-initialize key infrastructure if not yet bootstrapped
  try {
    getKeys();
  } catch (_) {
    await initKeyInfrastructure();
  }

  const startTime = Date.now();
  const runId = `run_${crypto.randomUUID()}`;
  const tamper = options.tamperScenario || 'NONE';
  const steps: ProtocolExchangeStep[] = [];
  const broadcast = options.broadcastStep || (() => {});

  const issuer = ISSUER_MODULES[options.issuerId];
  const wallet = WALLET_MODULES[options.walletId];
  const verifier = VERIFIER_MODULES[options.verifierId];
  const profile = SAMPLE_PROFILES[options.profileId];

  const baseUrl = 'http://localhost:4000';

  // Helper to append and broadcast steps
  const recordStep = (
    title: string,
    source: ProtocolExchangeStep['source'],
    target: ProtocolExchangeStep['target'],
    protocol: ProtocolExchangeStep['protocol'],
    endpoint: string,
    method: string,
    reqPayload: unknown,
    resPayload: unknown,
    status: 'SUCCESS' | 'ERROR',
    durationMs: number,
    notes?: string
  ): ProtocolExchangeStep => {
    const step: ProtocolExchangeStep = {
      stepIndex: steps.length + 1,
      id: `step_${steps.length + 1}`,
      title,
      source,
      target,
      protocol,
      endpoint,
      method,
      requestPayload: reqPayload,
      responsePayload: resPayload,
      status,
      durationMs,
      timestamp: new Date().toISOString(),
      notes
    };
    steps.push(step);
    broadcast(step);
    return step;
  };

  try {
    // -------------------------------------------------------------
    // Step 1: Issuer Metadata Discovery & Credential Offer Generation
    // -------------------------------------------------------------
    const s1Start = Date.now();
    const claimsToUse = (options.customClaims && Object.keys(options.customClaims).length > 0)
      ? options.customClaims
      : profile.claims;

    const { offer, preAuthorizedCode, offerUri } = createCredentialOffer(
      baseUrl,
      options.format,
      options.profileId,
      claimsToUse
    );
    recordStep(
      'Issue Credential Offer (OpenID4VCI)',
      'Issuer',
      'Wallet',
      'OpenID4VCI',
      '/api/issuer/offer',
      'POST',
      { issuerId: options.issuerId, format: options.format, profileId: options.profileId },
      { credential_offer: offer, offer_uri: offerUri },
      'SUCCESS',
      Date.now() - s1Start,
      'Initiated OpenID4VCI draft 13 pre-authorized code flow'
    );

    // -------------------------------------------------------------
    // Step 2: OAuth 2.0 Token Exchange
    // -------------------------------------------------------------
    const s2Start = Date.now();
    const { tokenResponse, session } = exchangeToken(
      'urn:ietf:params:oauth:grant-type:pre-authorized_code',
      preAuthorizedCode
    );
    recordStep(
      'OAuth 2.0 Token Exchange',
      'Wallet',
      'Issuer',
      'OpenID4VCI',
      '/api/issuer/token',
      'POST',
      {
        grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
        'pre-authorized_code': preAuthorizedCode
      },
      tokenResponse,
      'SUCCESS',
      Date.now() - s2Start,
      `Issued bearer access token and c_nonce: ${tokenResponse.c_nonce}`
    );

    // -------------------------------------------------------------
    // Step 3: Holder Proof of Possession & Credential Request
    // -------------------------------------------------------------
    const s3Start = Date.now();
    const keys = getKeys();
    const holderKey = wallet.getKey();
    const issuerKey = issuer.getKey();

    // Create Holder Proof JWT
    const nowSec = Math.floor(Date.now() / 1000);
    const holderPrivKey = await jose.importJWK(holderKey.privateKeyJwk, holderKey.alg);
    const proofJwt = await new jose.SignJWT({
      iss: holderKey.did,
      aud: baseUrl,
      iat: nowSec,
      nonce: tokenResponse.c_nonce
    })
      .setProtectedHeader({
        alg: holderKey.alg,
        typ: 'openid4vci-proof+jwt',
        jwk: holderKey.publicKeyJwk
      })
      .sign(holderPrivKey);

    const credentialRequestPayload = {
      format: options.format,
      proof: {
        proof_type: 'jwt' as const,
        jwt: proofJwt
      }
    };

    const credentialResponse = await processCredentialRequest(
      tokenResponse.access_token,
      credentialRequestPayload,
      issuerKey
    );

    recordStep(
      'Credential Issuance Request & Cryptographic Signing',
      'Wallet',
      'Issuer',
      'OpenID4VCI',
      '/api/issuer/credential',
      'POST',
      credentialRequestPayload,
      credentialResponse,
      'SUCCESS',
      Date.now() - s3Start,
      `Successfully signed ${options.format} using ${issuerKey.alg}`
    );

    // -------------------------------------------------------------
    // Step 4: Verifier Creates OpenID4VP Presentation Request
    // -------------------------------------------------------------
    const s4Start = Date.now();
    const { request: presReq, deepLink, qrPayload } = createPresentationRequest(
      baseUrl,
      options.verifierId,
      options.format,
      options.profileId
    );

    recordStep(
      'OpenID4VP Authorization Request (Presentation Definition)',
      'Verifier',
      'Wallet',
      'OpenID4VP',
      '/api/verifier/presentation-request',
      'GET',
      { verifierId: options.verifierId, format: options.format },
      { request: presReq, deepLink, qrPayload },
      'SUCCESS',
      Date.now() - s4Start,
      `Generated Presentation Definition ${presReq.presentation_definition.id} with challenge nonce`
    );

    // -------------------------------------------------------------
    // Step 5: Wallet Creates Verifiable Presentation
    // -------------------------------------------------------------
    const s5Start = Date.now();
    let rawVpToken: unknown;
    const presentedClaimKeys = options.selectedClaims || Object.keys(claimsToUse);

    if (options.format === 'ldp_vc') {
      const vc = credentialResponse.credential as W3CVerifiableCredential;
      const vp = await createW3CPresentation(
        holderKey,
        vc,
        presReq.nonce,
        presReq.client_id
      );
      rawVpToken = vp;
    } else if (options.format === 'vc+sd-jwt') {
      const rawSdJwt = credentialResponse.credential as string;
      const parts = rawSdJwt.split('~');
      const issuerJwt = parts[0];
      const rawDisclosures = parts.slice(1, parts.length - 1);
      
      const disclosures = rawDisclosures.map(raw => {
        const decoded = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
        const digest = crypto.createHash('sha256').update(raw).digest('base64url');
        return {
          salt: decoded[0],
          claimKey: decoded[1],
          claimValue: decoded[2],
          rawDisclosure: raw,
          digest
        };
      });

      const sdPkg: SDJwtCredentialPackage = {
        issuerJwt,
        disclosures,
        combinedSdJwt: rawSdJwt,
        claims: profile.claims as Record<string, unknown>
      };

      const presPkg = await createSDJwtPresentation(
        holderKey,
        sdPkg,
        presentedClaimKeys,
        presReq.nonce,
        presReq.client_id
      );
      rawVpToken = presPkg.presentationToken;
    } else if (options.format === 'mso_mdoc') {
      const mdocDoc = credentialResponse.credential as MDocDocument;
      const devResponse = await createMDocPresentation(
        holderKey,
        mdocDoc,
        presentedClaimKeys,
        presReq.nonce,
        presReq.client_id
      );
      rawVpToken = devResponse;
    }

    const submission: PresentationSubmission = {
      id: `sub_${crypto.randomUUID()}`,
      definition_id: presReq.presentation_definition.id,
      descriptor_map: [
        {
          id: 'identity_credential_descriptor',
          format: options.format,
          path: '$'
        }
      ]
    };

    let authResponsePayload: AuthorizationResponsePayload = {
      vp_token: rawVpToken,
      presentation_submission: submission,
      state: presReq.state
    };

    // -------------------------------------------------------------
    // Step 6: Apply Tampering (if enabled)
    // -------------------------------------------------------------
    if (tamper !== 'NONE') {
      authResponsePayload = applyTamperScenario(authResponsePayload, options.format, tamper);
      recordStep(
        `Replay & Tamper Mutation: [${tamper}]`,
        'Wallet',
        'Verifier',
        'Internal',
        '/api/tamper/inject',
        'MUTATE',
        { scenario: tamper },
        { tamperedPayloadSummary: `Injected mutation '${tamper}' into ${options.format}` },
        'SUCCESS',
        5,
        `Deliberately corrupted token to test negative-path rejection`
      );
    }

    recordStep(
      'Wallet Presentation Submission (direct_post)',
      'Wallet',
      'Verifier',
      'OpenID4VP',
      presReq.response_uri,
      'POST',
      authResponsePayload,
      { status: 'SUBMITTED' },
      'SUCCESS',
      Date.now() - s5Start,
      `Submitted ${options.format} vp_token bound to nonce ${presReq.nonce}`
    );

    // -------------------------------------------------------------
    // Step 7: Verifier Verification Execution
    // -------------------------------------------------------------
    const s7Start = Date.now();
    const verificationResult = await verifyPresentation(authResponsePayload, issuerKey);

    recordStep(
      'Verifier Cryptographic Verification Result',
      'Verifier',
      'Orchestrator',
      'OpenID4VP',
      '/api/verifier/verify',
      'EVALUATE',
      { state: presReq.state },
      verificationResult,
      verificationResult.isValid ? 'SUCCESS' : 'ERROR',
      Date.now() - s7Start,
      `Verification evaluated to status ${verificationResult.status}`
    );

    const totalDuration = Date.now() - startTime;
    const isPassing = tamper === 'NONE' ? verificationResult.isValid : !verificationResult.isValid;

    const record: InteropRunRecord = {
      id: runId,
      timestamp: new Date().toISOString(),
      issuer: { id: issuer.id, name: issuer.name, version: issuer.version },
      wallet: { id: wallet.id, name: wallet.name, version: wallet.version },
      verifier: { id: verifier.id, name: verifier.name, version: verifier.version },
      format: options.format,
      profile: options.profileId,
      tamperScenario: tamper,
      outcome: verificationResult.status,
      passed: isPassing,
      durationMs: totalDuration,
      steps,
      verificationResult
    };

    matrixStore.addRun(record);
    return record;

  } catch (err: unknown) {
    const totalDuration = Date.now() - startTime;
    recordStep(
      'Fatal Execution Error',
      'Orchestrator',
      'Orchestrator',
      'Internal',
      '/error',
      'ERROR',
      {},
      { error: (err as Error).message },
      'ERROR',
      0,
      (err as Error).message
    );

    const record: InteropRunRecord = {
      id: runId,
      timestamp: new Date().toISOString(),
      issuer: { id: issuer.id, name: issuer.name, version: issuer.version },
      wallet: { id: wallet.id, name: wallet.name, version: wallet.version },
      verifier: { id: verifier.id, name: verifier.name, version: verifier.version },
      format: options.format,
      profile: options.profileId,
      tamperScenario: tamper,
      outcome: 'INVALID',
      passed: false,
      durationMs: totalDuration,
      steps
    };

    matrixStore.addRun(record);
    return record;
  }
}

/**
 * Executes an automated CI-style batch test suite across key matrix combinations
 */
export async function runAutomatedTestSuite(onProgress?: (index: number, total: number, record: InteropRunRecord) => void) {
  const testMatrix: Array<ExecuteRunOptions> = [
    // 1. Core Inji Stack: Inji Certify -> Inji Web -> Inji Verify (W3C VC JSON-LD)
    {
      issuerId: 'inji-certify',
      walletId: 'inji-web',
      verifierId: 'inji-verify',
      format: 'ldp_vc',
      profileId: 'MOSIP_NATIONAL_ID',
      tamperScenario: 'NONE'
    },
    // 2. Core Inji Stack: Inji Certify -> Inji Web -> Inji Verify (SD-JWT VC)
    {
      issuerId: 'inji-certify',
      walletId: 'inji-web',
      verifierId: 'inji-verify',
      format: 'vc+sd-jwt',
      profileId: 'MOSIP_NATIONAL_ID',
      tamperScenario: 'NONE'
    },
    // 3. Core Inji Stack: Inji Certify -> Inji Mobile -> Inji Verify (mDoc ISO 18013-5)
    {
      issuerId: 'inji-certify',
      walletId: 'inji-mobile',
      verifierId: 'inji-verify',
      format: 'mso_mdoc',
      profileId: 'DIGITAL_DRIVING_LICENSE',
      tamperScenario: 'NONE'
    },
    // 4. Cross-Ecosystem: Walt.id Issuer -> Inji Web -> Inji Verify (W3C VC)
    {
      issuerId: 'waltid-issuer',
      walletId: 'inji-web',
      verifierId: 'inji-verify',
      format: 'ldp_vc',
      profileId: 'MOSIP_NATIONAL_ID',
      tamperScenario: 'NONE'
    },
    // 5. Cross-Ecosystem: Inji Certify -> Generic Wallet -> Sphereon Verifier (SD-JWT VC)
    {
      issuerId: 'inji-certify',
      walletId: 'generic-wallet',
      verifierId: 'sphereon-verifier',
      format: 'vc+sd-jwt',
      profileId: 'VACCINATION_CREDENTIAL',
      tamperScenario: 'NONE'
    },
    // 6. Complete Non-Inji External Reference Suite
    {
      issuerId: 'waltid-issuer',
      walletId: 'generic-wallet',
      verifierId: 'sphereon-verifier',
      format: 'vc+sd-jwt',
      profileId: 'MOSIP_NATIONAL_ID',
      tamperScenario: 'NONE'
    },
    // 7. Negative Tamper Test: Corrupted Cryptographic Signature
    {
      issuerId: 'inji-certify',
      walletId: 'inji-web',
      verifierId: 'inji-verify',
      format: 'ldp_vc',
      profileId: 'MOSIP_NATIONAL_ID',
      tamperScenario: 'CORRUPTED_SIGNATURE'
    },
    // 8. Negative Tamper Test: Tampered Claim (MITM attack)
    {
      issuerId: 'inji-certify',
      walletId: 'inji-web',
      verifierId: 'inji-verify',
      format: 'vc+sd-jwt',
      profileId: 'MOSIP_NATIONAL_ID',
      tamperScenario: 'TAMPERED_CLAIM'
    },
    // 9. Negative Tamper Test: Expired Credential
    {
      issuerId: 'inji-certify',
      walletId: 'inji-web',
      verifierId: 'inji-verify',
      format: 'ldp_vc',
      profileId: 'MOSIP_NATIONAL_ID',
      tamperScenario: 'EXPIRED_CREDENTIAL'
    },
    // 10. Negative Tamper Test: Replay Attack (Invalid Nonce)
    {
      issuerId: 'inji-certify',
      walletId: 'inji-mobile',
      verifierId: 'inji-verify',
      format: 'vc+sd-jwt',
      profileId: 'MOSIP_NATIONAL_ID',
      tamperScenario: 'INVALID_NONCE'
    },
    // 11. Negative Tamper Test: Cross-Site Audience Mismatch
    {
      issuerId: 'inji-certify',
      walletId: 'inji-web',
      verifierId: 'inji-verify',
      format: 'ldp_vc',
      profileId: 'MOSIP_NATIONAL_ID',
      tamperScenario: 'MISMATCHED_AUDIENCE'
    },
    // 12. Negative Tamper Test: Revoked Credential
    {
      issuerId: 'inji-certify',
      walletId: 'inji-web',
      verifierId: 'inji-verify',
      format: 'ldp_vc',
      profileId: 'MOSIP_NATIONAL_ID',
      tamperScenario: 'REVOKED_STATUS'
    }
  ];

  const results: InteropRunRecord[] = [];
  for (let i = 0; i < testMatrix.length; i++) {
    const config = testMatrix[i];
    const run = await executeInteroperabilityRun(config);
    results.push(run);
    if (onProgress) {
      onProgress(i + 1, testMatrix.length, run);
    }
  }

  return {
    total: testMatrix.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    results
  };
}
