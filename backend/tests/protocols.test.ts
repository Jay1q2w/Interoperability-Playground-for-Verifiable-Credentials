import { initKeyInfrastructure } from '../src/crypto/keys.js';
import { executeInteroperabilityRun, runAutomatedTestSuite } from '../src/matrix/suiteRunner.js';
import { matrixStore } from '../src/matrix/store.js';

describe('OpenID4VCI & OpenID4VP Protocol Flows', () => {
  beforeAll(async () => {
    await initKeyInfrastructure();
  });

  it('runs Core Inji Stack end-to-end with W3C VC JSON-LD', async () => {
    const result = await executeInteroperabilityRun({
      issuerId: 'inji-certify',
      walletId: 'inji-web',
      verifierId: 'inji-verify',
      format: 'ldp_vc',
      profileId: 'MOSIP_NATIONAL_ID',
      tamperScenario: 'NONE'
    });

    expect(result.passed).toBe(true);
    expect(result.outcome).toBe('VALID');
    expect(result.steps.length).toBeGreaterThanOrEqual(5);
    expect(result.verificationResult?.isValid).toBe(true);
    expect(result.verificationResult?.verifiedClaims.fullName).toBe('Amina Al-Mansoor');
  });

  it('runs Core Inji Stack end-to-end with SD-JWT VC', async () => {
    const result = await executeInteroperabilityRun({
      issuerId: 'inji-certify',
      walletId: 'inji-web',
      verifierId: 'inji-verify',
      format: 'vc+sd-jwt',
      profileId: 'MOSIP_NATIONAL_ID',
      tamperScenario: 'NONE'
    });

    expect(result.passed).toBe(true);
    expect(result.outcome).toBe('VALID');
    expect(result.verificationResult?.isValid).toBe(true);
    expect(result.verificationResult?.cryptographicDetails.holderBindingVerified).toBe(true);
  });

  it('runs Cross-Ecosystem interop: Walt.id Issuer -> Inji Web -> Inji Verify', async () => {
    const result = await executeInteroperabilityRun({
      issuerId: 'waltid-issuer',
      walletId: 'inji-web',
      verifierId: 'inji-verify',
      format: 'ldp_vc',
      profileId: 'MOSIP_NATIONAL_ID',
      tamperScenario: 'NONE'
    });

    expect(result.passed).toBe(true);
    expect(result.outcome).toBe('VALID');
  });

  it('runs automated test matrix suite', async () => {
    const suite = await runAutomatedTestSuite();
    expect(suite.total).toBe(12);
    expect(suite.passed).toBe(12); // All positive pass, all negative tampered tests correctly caught and rejected!
    expect(suite.failed).toBe(0);

    const stats = matrixStore.getMatrixStats();
    expect(stats.total).toBeGreaterThanOrEqual(12);
    expect(stats.matrixCells.length).toBeGreaterThanOrEqual(3);
  });
});
