import { initKeyInfrastructure } from '../src/crypto/keys.js';
import { executeInteroperabilityRun } from '../src/matrix/suiteRunner.js';

describe('Replay & Tamper Negative-Path Tests', () => {
  beforeAll(async () => {
    await initKeyInfrastructure();
  });

  it('rejects corrupted signature with TAMPERED_SIGNATURE', async () => {
    const result = await executeInteroperabilityRun({
      issuerId: 'inji-certify',
      walletId: 'inji-web',
      verifierId: 'inji-verify',
      format: 'ldp_vc',
      profileId: 'MOSIP_NATIONAL_ID',
      tamperScenario: 'CORRUPTED_SIGNATURE'
    });

    expect(result.verificationResult?.isValid).toBe(false);
    expect(result.outcome).toBe('TAMPERED_SIGNATURE');
    expect(result.passed).toBe(true); // negative test passed because verifier rejected corruption!
  });

  it('rejects tampered claim (MITM attribute modification)', async () => {
    const result = await executeInteroperabilityRun({
      issuerId: 'inji-certify',
      walletId: 'inji-web',
      verifierId: 'inji-verify',
      format: 'vc+sd-jwt',
      profileId: 'MOSIP_NATIONAL_ID',
      tamperScenario: 'TAMPERED_CLAIM'
    });

    expect(result.verificationResult?.isValid).toBe(false);
    expect(result.passed).toBe(true);
  });

  it('rejects expired credential with VALID_BUT_EXPIRED', async () => {
    const result = await executeInteroperabilityRun({
      issuerId: 'inji-certify',
      walletId: 'inji-web',
      verifierId: 'inji-verify',
      format: 'ldp_vc',
      profileId: 'MOSIP_NATIONAL_ID',
      tamperScenario: 'EXPIRED_CREDENTIAL'
    });

    expect(result.verificationResult?.isValid).toBe(false);
    expect(result.outcome).toBe('VALID_BUT_EXPIRED');
    expect(result.passed).toBe(true);
  });

  it('rejects replayed nonce with INVALID_NONCE', async () => {
    const result = await executeInteroperabilityRun({
      issuerId: 'inji-certify',
      walletId: 'inji-web',
      verifierId: 'inji-verify',
      format: 'ldp_vc',
      profileId: 'MOSIP_NATIONAL_ID',
      tamperScenario: 'INVALID_NONCE'
    });

    expect(result.verificationResult?.isValid).toBe(false);
    expect(result.outcome).toBe('INVALID_NONCE');
    expect(result.passed).toBe(true);
  });

  it('rejects audience mismatch with MISMATCHED_AUDIENCE', async () => {
    const result = await executeInteroperabilityRun({
      issuerId: 'inji-certify',
      walletId: 'inji-web',
      verifierId: 'inji-verify',
      format: 'ldp_vc',
      profileId: 'MOSIP_NATIONAL_ID',
      tamperScenario: 'MISMATCHED_AUDIENCE'
    });

    expect(result.verificationResult?.isValid).toBe(false);
    expect(result.outcome).toBe('MISMATCHED_AUDIENCE');
    expect(result.passed).toBe(true);
  });

  it('rejects revoked credential with REVOKED', async () => {
    const result = await executeInteroperabilityRun({
      issuerId: 'inji-certify',
      walletId: 'inji-web',
      verifierId: 'inji-verify',
      format: 'ldp_vc',
      profileId: 'MOSIP_NATIONAL_ID',
      tamperScenario: 'REVOKED_STATUS'
    });

    expect(result.verificationResult?.isValid).toBe(false);
    expect(result.outcome).toBe('REVOKED');
    expect(result.passed).toBe(true);
  });
});
