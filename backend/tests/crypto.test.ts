import { initKeyInfrastructure, generateEd25519KeyPair, generateRsaKeyPair } from '../src/crypto/keys.js';
import { createW3CCredential, createW3CPresentation, verifyW3CPresentation } from '../src/crypto/w3c.js';
import { issueSDJwtCredential, createSDJwtPresentation, verifySDJwtPresentation } from '../src/crypto/sdjwt.js';
import { issueMDocCredential, createMDocPresentation, verifyMDocPresentation } from '../src/crypto/mdoc.js';

describe('Cryptographic Engines & Credential Formats', () => {
  beforeAll(async () => {
    await initKeyInfrastructure();
  });

  describe('Key Infrastructure', () => {
    it('generates valid Ed25519 key pair with did:key', async () => {
      const kp = await generateEd25519KeyPair('test-ed25519');
      expect(kp.did).toMatch(/^did:key:z[1-9A-HJ-NP-Za-km-z]+$/);
      expect(kp.publicKeyJwk.crv).toBe('Ed25519');
      expect(kp.alg).toBe('EdDSA');
    });

    it('generates valid RSA key pair with did:jwk', async () => {
      const kp = await generateRsaKeyPair('test-rsa');
      expect(kp.did).toMatch(/^did:jwk:.+$/);
      expect(kp.publicKeyJwk.kty).toBe('RSA');
      expect(kp.alg).toBe('RS256');
    });
  });

  describe('W3C Verifiable Credentials 1.1 / 2.0 (ldp_vc)', () => {
    it('creates, wraps, and verifies valid W3C VC and VP', async () => {
      const issuer = await generateEd25519KeyPair('issuer-test');
      const holder = await generateEd25519KeyPair('holder-test');

      const claims = {
        uin: '1234-5678-9012',
        fullName: 'Fatima Zahra',
        birthDate: '1992-05-14',
        nationality: 'Morocco'
      };

      const vc = await createW3CCredential(issuer, holder.did, ['MosipNationalIdCredential'], claims);
      expect(vc.type).toContain('MosipNationalIdCredential');
      expect(vc.issuer).toBe(issuer.did);
      expect(vc.proof.jws).toBeDefined();

      const challenge = 'verifier_challenge_123';
      const domain = 'https://verifier.inji.io';

      const vp = await createW3CPresentation(holder, vc, challenge, domain);
      expect(vp.type).toContain('VerifiablePresentation');
      expect(vp.holder).toBe(holder.did);
      expect(vp.proof.challenge).toBe(challenge);

      const verification = await verifyW3CPresentation(vp, challenge, domain, issuer);
      expect(verification.isValid).toBe(true);
      expect(verification.errors.length).toBe(0);
      expect(verification.verifiedClaims.fullName).toBe('Fatima Zahra');
    });
  });

  describe('IETF SD-JWT VC (vc+sd-jwt)', () => {
    it('issues, selectively discloses, and verifies SD-JWT with KB-JWT', async () => {
      const issuer = await generateEd25519KeyPair('sdjwt-issuer');
      const holder = await generateEd25519KeyPair('sdjwt-holder');

      const allClaims = {
        uin: '9876-5432-1098',
        fullName: 'Omar Hassan',
        birthDate: '1985-11-20',
        gender: 'Male',
        address: 'Casablanca'
      };

      const sdPkg = await issueSDJwtCredential(issuer, holder, 'urn:mosip:id:national_id', allClaims);
      expect(sdPkg.combinedSdJwt).toContain('~');
      expect(sdPkg.disclosures.length).toBe(5);

      const nonce = 'nonce_challenge_888';
      const audience = 'https://relyingparty.inji.io';

      // Selectively disclose ONLY fullName and uin (hiding birthDate, gender, address)
      const presPkg = await createSDJwtPresentation(holder, sdPkg, ['fullName', 'uin'], nonce, audience);
      expect(presPkg.disclosedClaims.fullName).toBe('Omar Hassan');
      expect(presPkg.disclosedClaims.birthDate).toBeUndefined();
      expect(presPkg.hiddenClaimsCount).toBe(3);

      const verification = await verifySDJwtPresentation(presPkg.presentationToken, nonce, audience, issuer);
      expect(verification.isValid).toBe(true);
      expect(verification.verifiedClaims.fullName).toBe('Omar Hassan');
      expect(verification.verifiedClaims.uin).toBe('9876-5432-1098');
      expect(verification.verifiedClaims.birthDate).toBeUndefined();
      expect(verification.hiddenCount).toBe(3);
    });
  });

  describe('ISO/IEC 18013-5 mdoc / mDL (mso_mdoc)', () => {
    it('issues and verifies mDoc DeviceResponse with MSO digest tree', async () => {
      const issuer = await generateEd25519KeyPair('mdoc-issuer');
      const holder = await generateEd25519KeyPair('mdoc-holder');

      const mdocClaims = {
        documentNumber: 'DL-998877',
        fullName: 'Sara Benali',
        birthDate: '1990-03-15',
        vehicleClasses: ['B']
      };

      const mdoc = await issueMDocCredential(issuer, holder, 'org.iso.18013.5.1.mDL', mdocClaims);
      expect(mdoc.docType).toBe('org.iso.18013.5.1.mDL');
      expect(mdoc.issuerSigned.issuerAuth.payload.valueDigests['org.iso.18013.5.1']).toBeDefined();

      const nonce = 'session_nonce_777';
      const clientId = 'https://traffic-police.gov.ma';

      const devResponse = await createMDocPresentation(holder, mdoc, ['fullName', 'documentNumber'], nonce, clientId);
      expect(devResponse.documents.length).toBe(1);

      const verification = await verifyMDocPresentation(devResponse, nonce, clientId, issuer);
      expect(verification.isValid).toBe(true);
      expect(verification.verifiedClaims.fullName).toBe('Sara Benali');
      expect(verification.verifiedClaims.documentNumber).toBe('DL-998877');
      expect(verification.hiddenCount).toBe(2);
    });
  });
});
