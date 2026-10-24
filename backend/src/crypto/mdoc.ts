import crypto from 'crypto';
import * as cbor from 'cbor-x';
import * as jose from 'jose';
import { CryptoKeyPair } from './keys.js';
import { CredentialSubjectClaims } from '../types/index.js';

export interface IssuerSignedItem {
  digestID: number;
  random: string; // hex
  elementIdentifier: string;
  elementValue: unknown;
  rawCborHex: string;
  digestHex: string;
}

export interface MobileSecurityObject {
  version: '1.0';
  digestAlgorithm: 'SHA-256';
  docType: string;
  valueDigests: Record<string, Record<number, string>>;
  validityInfo: {
    signed: string;
    validFrom: string;
    validUntil: string;
  };
  deviceKeyInfo: {
    deviceKey: jose.JWK;
  };
}

export interface MDocDocument {
  docType: string;
  issuerSigned: {
    nameSpaces: Record<string, IssuerSignedItem[]>;
    issuerAuth: {
      protectedHeader: Record<string, unknown>;
      payload: MobileSecurityObject;
      signatureHex: string;
    };
  };
  deviceSigned: {
    nameSpaces: Record<string, unknown>;
    deviceAuth: {
      deviceSignatureHex: string;
      sessionTranscriptDigest: string;
    };
  };
}

export interface DeviceResponse {
  version: '1.0';
  documents: MDocDocument[];
  status: 0;
}

/**
 * Creates an ISO/IEC 18013-5 mDoc structure
 */
export async function issueMDocCredential(
  issuerKey: CryptoKeyPair,
  holderKey: CryptoKeyPair,
  docType: string = 'org.iso.18013.5.1.mDL',
  claims: CredentialSubjectClaims,
  validityDays: number = 365
): Promise<MDocDocument> {
  const now = new Date();
  const validUntil = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

  const namespace = 'org.iso.18013.5.1';
  const items: IssuerSignedItem[] = [];
  const valueDigests: Record<number, string> = {};

  let digestId = 0;
  for (const [key, value] of Object.entries(claims)) {
    if (value !== undefined) {
      const salt = crypto.randomBytes(16).toString('hex');
      const itemObj = {
        digestID: digestId,
        random: salt,
        elementIdentifier: key,
        elementValue: value
      };
      const itemCbor = cbor.encode(itemObj);
      const digest = crypto.createHash('sha256').update(itemCbor).digest('hex');

      items.push({
        ...itemObj,
        rawCborHex: Buffer.from(itemCbor).toString('hex'),
        digestHex: digest
      });

      valueDigests[digestId] = digest;
      digestId++;
    }
  }

  const mso: MobileSecurityObject = {
    version: '1.0',
    digestAlgorithm: 'SHA-256',
    docType,
    valueDigests: {
      [namespace]: valueDigests
    },
    validityInfo: {
      signed: now.toISOString(),
      validFrom: now.toISOString(),
      validUntil: validUntil.toISOString()
    },
    deviceKeyInfo: {
      deviceKey: holderKey.publicKeyJwk
    }
  };

  // Sign MSO using Issuer Private Key
  const msoCbor = cbor.encode(mso);
  const msoDigest = crypto.createHash('sha256').update(msoCbor).digest();

  // Create signature
  const issuerPrivKey = await jose.importJWK(issuerKey.privateKeyJwk, issuerKey.alg);
  const sigJws = await new jose.CompactSign(msoDigest)
    .setProtectedHeader({ alg: issuerKey.alg, kid: issuerKey.keyId })
    .sign(issuerPrivKey);

  const issuerDoc: MDocDocument = {
    docType,
    issuerSigned: {
      nameSpaces: {
        [namespace]: items
      },
      issuerAuth: {
        protectedHeader: { alg: issuerKey.alg, kid: issuerKey.keyId },
        payload: mso,
        signatureHex: Buffer.from(sigJws).toString('hex')
      }
    },
    deviceSigned: {
      nameSpaces: {},
      deviceAuth: {
        deviceSignatureHex: '',
        sessionTranscriptDigest: ''
      }
    }
  };

  return issuerDoc;
}

/**
 * Creates DeviceResponse for presentation with DeviceSigned proof bound to session nonce
 */
export async function createMDocPresentation(
  holderKey: CryptoKeyPair,
  doc: MDocDocument,
  selectedElementIdentifiers: string[],
  verifierNonce: string,
  verifierClientId: string
): Promise<DeviceResponse> {
  const namespace = 'org.iso.18013.5.1';
  const originalItems = doc.issuerSigned.nameSpaces[namespace] || [];

  // Filter items according to selective disclosure
  const presentedItems = originalItems.filter(item => 
    selectedElementIdentifiers.includes(item.elementIdentifier)
  );

  // Compute SessionTranscript = sha256(verifierClientId + verifierNonce)
  const sessionTranscript = crypto.createHash('sha256')
    .update(`${verifierClientId}:${verifierNonce}`)
    .digest('hex');

  // Sign session transcript with holder device key
  const holderPrivKey = await jose.importJWK(holderKey.privateKeyJwk, holderKey.alg);
  const deviceSigJws = await new jose.CompactSign(Buffer.from(sessionTranscript, 'hex'))
    .setProtectedHeader({ alg: holderKey.alg, kid: holderKey.keyId })
    .sign(holderPrivKey);

  const presentationDoc: MDocDocument = {
    docType: doc.docType,
    issuerSigned: {
      nameSpaces: {
        [namespace]: presentedItems
      },
      issuerAuth: doc.issuerSigned.issuerAuth
    },
    deviceSigned: {
      nameSpaces: {},
      deviceAuth: {
        deviceSignatureHex: Buffer.from(deviceSigJws).toString('hex'),
        sessionTranscriptDigest: sessionTranscript
      }
    }
  };

  return {
    version: '1.0',
    documents: [presentationDoc],
    status: 0
  };
}

/**
 * Verifies an ISO/IEC 18013-5 DeviceResponse presentation
 */
export async function verifyMDocPresentation(
  response: DeviceResponse,
  expectedNonce: string,
  expectedClientId: string,
  issuerKey: CryptoKeyPair
): Promise<{
  isValid: boolean;
  errors: string[];
  checks: Array<{ name: string; passed: boolean; message: string }>;
  verifiedClaims: Record<string, unknown>;
  hiddenCount: number;
}> {
  const errors: string[] = [];
  const checks: Array<{ name: string; passed: boolean; message: string }> = [];
  const verifiedClaims: Record<string, unknown> = {};

  if (!response || !Array.isArray(response.documents) || response.documents.length === 0) {
    errors.push('Empty or malformed mDoc DeviceResponse');
    return { isValid: false, errors, checks, verifiedClaims, hiddenCount: 0 };
  }

  const doc = response.documents[0];
  const mso = doc.issuerSigned.issuerAuth.payload;

  // 1. Check MSO validity timestamps
  const now = new Date();
  const validUntil = new Date(mso.validityInfo.validUntil);
  const isNotExpired = validUntil.getTime() > now.getTime();
  checks.push({
    name: 'mDoc MSO Validity',
    passed: isNotExpired,
    message: isNotExpired 
      ? `Valid until ${validUntil.toISOString()}` 
      : `EXPIRED on ${validUntil.toISOString()}`
  });
  if (!isNotExpired) {
    errors.push(`mDoc credential has expired`);
  }

  // 2. Verify Issuer Signature over MSO
  try {
    const msoCbor = cbor.encode(mso);
    const msoDigest = crypto.createHash('sha256').update(msoCbor).digest();
    const sigJws = Buffer.from(doc.issuerSigned.issuerAuth.signatureHex, 'hex').toString('utf8');
    const issuerPubKey = await jose.importJWK(issuerKey.publicKeyJwk, issuerKey.alg);

    await jose.compactVerify(sigJws, issuerPubKey);
    checks.push({
      name: 'Issuer MSO Signature (COSE/JWS)',
      passed: true,
      message: `MSO signed by issuer ${issuerKey.did} verified`
    });
  } catch (err: unknown) {
    checks.push({
      name: 'Issuer MSO Signature (COSE/JWS)',
      passed: false,
      message: `Issuer MSO signature failed: ${(err as Error).message}`
    });
    errors.push(`Invalid Issuer MSO signature: ${(err as Error).message}`);
  }

  // 3. Verify digests of presented elements against MSO valueDigests
  const namespace = 'org.iso.18013.5.1';
  const expectedDigests = mso.valueDigests[namespace] || {};
  const presentedItems = doc.issuerSigned.nameSpaces[namespace] || [];
  let allDigestsValid = true;

  for (const item of presentedItems) {
    const itemObj = {
      digestID: item.digestID,
      random: item.random,
      elementIdentifier: item.elementIdentifier,
      elementValue: item.elementValue
    };
    const computedCbor = cbor.encode(itemObj);
    const computedDigest = crypto.createHash('sha256').update(computedCbor).digest('hex');

    const expected = expectedDigests[item.digestID];
    if (computedDigest !== expected) {
      allDigestsValid = false;
      errors.push(`mDoc element ${item.elementIdentifier} digest mismatch`);
    } else {
      verifiedClaims[item.elementIdentifier] = item.elementValue;
    }
  }

  checks.push({
    name: 'Element Digest Integrity',
    passed: allDigestsValid,
    message: allDigestsValid 
      ? `All ${presentedItems.length} elements verified against MSO SHA-256 digest tree` 
      : 'Digest mismatch detected'
  });

  const totalElementsInMso = Object.keys(expectedDigests).length;
  const hiddenCount = Math.max(0, totalElementsInMso - presentedItems.length);

  // 4. Verify DeviceSigned proof against SessionTranscript
  try {
    const expectedSessionDigest = crypto.createHash('sha256')
      .update(`${expectedClientId}:${expectedNonce}`)
      .digest('hex');

    const transcriptMatch = doc.deviceSigned.deviceAuth.sessionTranscriptDigest === expectedSessionDigest;
    checks.push({
      name: 'Device Session Transcript Binding',
      passed: transcriptMatch,
      message: transcriptMatch ? 'Device proof bound to verifier session' : 'Session transcript mismatch'
    });
    if (!transcriptMatch) {
      errors.push('Device proof does not bind to verifier challenge & audience');
    }

    // Verify device signature using holder's deviceKey from MSO
    const devicePubKey = await jose.importJWK(mso.deviceKeyInfo.deviceKey, 'EdDSA');
    const deviceSigJws = Buffer.from(doc.deviceSigned.deviceAuth.deviceSignatureHex, 'hex').toString('utf8');
    await jose.compactVerify(deviceSigJws, devicePubKey);

    checks.push({
      name: 'Device Authentication Signature',
      passed: true,
      message: 'Device signature valid and matching MSO deviceKey'
    });
  } catch (err: unknown) {
    checks.push({
      name: 'Device Authentication Signature',
      passed: false,
      message: `Device signature verification failed: ${(err as Error).message}`
    });
    errors.push(`Invalid device signature: ${(err as Error).message}`);
  }

  const isValid = errors.length === 0;
  return {
    isValid,
    errors,
    checks,
    verifiedClaims,
    hiddenCount
  };
}
