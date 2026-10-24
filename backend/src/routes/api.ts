import express, { Request, Response } from 'express';
import { ISSUER_MODULES, SAMPLE_PROFILES } from '../modules/issuers.js';
import { WALLET_MODULES } from '../modules/wallets.js';
import { VERIFIER_MODULES } from '../modules/verifiers.js';
import { TAMPER_CATALOG } from '../tamper/tamperEngine.js';
import { getIssuerMetadata, createCredentialOffer, exchangeToken, processCredentialRequest } from '../protocols/openid4vci.js';
import { createPresentationRequest, verifyPresentation, getVerifierSession } from '../protocols/openid4vp.js';
import { executeInteroperabilityRun, runAutomatedTestSuite } from '../matrix/suiteRunner.js';
import { matrixStore, MatrixFilter } from '../matrix/store.js';
import { broadcastEvent } from '../websocket/server.js';
import { getKeys } from '../crypto/keys.js';
import { CredentialFormat, CredentialProfileId, IssuerId, WalletId, VerifierId, TamperScenario } from '../types/index.js';

const router = express.Router();

/**
 * GET /api/config/modules
 * Returns catalogue of modules, credential profiles, and tamper options
 */
router.get('/config/modules', (_req: Request, res: Response) => {
  res.json({
    issuers: Object.values(ISSUER_MODULES),
    wallets: Object.values(WALLET_MODULES),
    verifiers: Object.values(VERIFIER_MODULES),
    profiles: SAMPLE_PROFILES,
    tamperScenarios: TAMPER_CATALOG
  });
});

/**
 * GET /.well-known/openid-credential-issuer
 * Standards-compliant OpenID4VCI draft 13 issuer metadata
 */
router.get('/.well-known/openid-credential-issuer', (req: Request, res: Response) => {
  const protocol = req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  res.json(getIssuerMetadata(baseUrl));
});

/**
 * POST /api/issuer/offer
 * Creates OpenID4VCI credential offer
 */
router.post('/issuer/offer', (req: Request, res: Response) => {
  try {
    const { format = 'ldp_vc', profileId = 'MOSIP_NATIONAL_ID', customClaims } = req.body;
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    const profile = SAMPLE_PROFILES[profileId as CredentialProfileId] || SAMPLE_PROFILES.MOSIP_NATIONAL_ID;
    const claims = customClaims || profile.claims;

    const offerData = createCredentialOffer(baseUrl, format as CredentialFormat, profileId as CredentialProfileId, claims);
    
    broadcastEvent({
      type: 'CREDENTIAL_OFFER_CREATED',
      payload: offerData
    });

    res.json(offerData);
  } catch (err: unknown) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/issuer/token
 * OpenID4VCI OAuth 2.0 token endpoint
 */
router.post('/issuer/token', (req: Request, res: Response) => {
  try {
    const grantType = req.body.grant_type;
    const preAuthorizedCode = req.body['pre-authorized_code'] || req.body.pre_authorized_code;

    if (!grantType || !preAuthorizedCode) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'grant_type and pre-authorized_code are required'
      });
    }

    const result = exchangeToken(grantType, preAuthorizedCode);
    res.json(result.tokenResponse);
  } catch (err: unknown) {
    res.status(400).json({
      error: 'invalid_grant',
      error_description: (err as Error).message
    });
  }
});

/**
 * POST /api/issuer/credential
 * OpenID4VCI Credential Request endpoint
 */
router.post('/issuer/credential', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Bearer access token required'
      });
    }

    const accessToken = authHeader.substring(7);
    const keys = getKeys();
    const issuerKey = keys.injiCertifyIssuer;

    const credentialResponse = await processCredentialRequest(accessToken, req.body, issuerKey);
    res.json(credentialResponse);
  } catch (err: unknown) {
    res.status(400).json({
      error: 'invalid_credential_request',
      error_description: (err as Error).message
    });
  }
});

/**
 * GET /api/verifier/presentation-request
 * Generates OpenID4VP presentation request (Authorization Request)
 */
router.get('/verifier/presentation-request', (req: Request, res: Response) => {
  try {
    const format = (req.query.format as CredentialFormat) || 'ldp_vc';
    const profileId = (req.query.profileId as CredentialProfileId) || 'MOSIP_NATIONAL_ID';
    const verifierId = (req.query.verifierId as string) || 'inji-verify';

    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    const presReq = createPresentationRequest(baseUrl, verifierId, format, profileId);

    broadcastEvent({
      type: 'PRESENTATION_REQUEST_CREATED',
      payload: presReq
    });

    res.json(presReq);
  } catch (err: unknown) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/verifier/response
 * Direct_post endpoint for OpenID4VP authorization response
 */
router.post('/verifier/response', async (req: Request, res: Response) => {
  try {
    const { vp_token, presentation_submission, state } = req.body;
    if (!vp_token || !presentation_submission || !state) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'vp_token, presentation_submission, and state are required'
      });
    }

    const verificationResult = await verifyPresentation({
      vp_token,
      presentation_submission,
      state
    });

    broadcastEvent({
      type: 'PRESENTATION_VERIFIED',
      payload: verificationResult
    });

    res.json(verificationResult);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/interop/run
 * Executes a full interactive live flow (Issue -> Hold -> Present -> Verify)
 */
router.post('/interop/run', async (req: Request, res: Response) => {
  try {
    const {
      issuerId = 'inji-certify',
      walletId = 'inji-web',
      verifierId = 'inji-verify',
      format = 'ldp_vc',
      profileId = 'MOSIP_NATIONAL_ID',
      tamperScenario = 'NONE',
      selectedClaims
    } = req.body;

    const record = await executeInteroperabilityRun({
      issuerId: issuerId as IssuerId,
      walletId: walletId as WalletId,
      verifierId: verifierId as VerifierId,
      format: format as CredentialFormat,
      profileId: profileId as CredentialProfileId,
      tamperScenario: tamperScenario as TamperScenario,
      selectedClaims,
      broadcastStep: (step) => {
        broadcastEvent({
          type: 'STEP_PROCESSED',
          payload: step
        });
      }
    });

    broadcastEvent({
      type: 'RUN_COMPLETED',
      payload: record
    });

    res.json(record);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/interop/suite
 * Runs the automated CI test suite across the test matrix
 */
router.post('/interop/suite', async (_req: Request, res: Response) => {
  try {
    const suiteResult = await runAutomatedTestSuite((current, total, record) => {
      broadcastEvent({
        type: 'SUITE_PROGRESS',
        payload: { current, total, record }
      });
    });

    broadcastEvent({
      type: 'SUITE_COMPLETED',
      payload: suiteResult
    });

    res.json(suiteResult);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/matrix/runs
 * Historical runs with filtering
 */
router.get('/matrix/runs', (req: Request, res: Response) => {
  const filter: MatrixFilter = {
    issuerId: req.query.issuerId as IssuerId,
    walletId: req.query.walletId as WalletId,
    verifierId: req.query.verifierId as VerifierId,
    format: req.query.format as CredentialFormat,
    outcome: req.query.outcome as any
  };

  const runs = matrixStore.getRuns(filter);
  res.json({ count: runs.length, runs });
});

/**
 * GET /api/matrix/stats
 * Summary statistics and compatibility cell grid
 */
router.get('/matrix/stats', (_req: Request, res: Response) => {
  const stats = matrixStore.getMatrixStats();
  res.json(stats);
});

/**
 * GET /api/matrix/report/markdown
 * Exports report as Markdown
 */
router.get('/matrix/report/markdown', (_req: Request, res: Response) => {
  const md = matrixStore.exportMarkdownReport();
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="inji-interop-report.md"');
  res.send(md);
});

/**
 * DELETE /api/matrix/runs
 * Resets run history
 */
router.delete('/matrix/runs', (_req: Request, res: Response) => {
  matrixStore.clearRuns();
  res.json({ message: 'Run history cleared' });
});

export default router;
