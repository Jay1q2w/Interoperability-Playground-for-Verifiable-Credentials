import crypto from 'crypto';
import * as jose from 'jose';
import { CryptoKeyPair } from './keys.js';
import { CredentialSubjectClaims } from '../types/index.js';

// Canonical JSON representation (RFC 8785 JSON Canonicalization Scheme - JCS)
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => canonicalizeJson(item)).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return '{' + keys.map((key) => JSON.stringify(key) + ':' + canonicalizeJson((obj as Record<string, unknown>)[key])).join(',') + '}';
}

export interface W3CVerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  validUntil: string;
  credentialSubject: CredentialSubjectClaims & { id: string };
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    jws: string;
  };
}

export interface W3CVerifiablePresentation {
  '@context': string[];
  id: string;
  type: string[];
  verifiableCredential: W3CVerifiableCredential[];
  holder: string;
  proof: {
    type: string;
    created: string;
    challenge: string;
    domain: string;
    verificationMethod: string;
    proofPurpose: string;
    jws: string;
  };
}

/**
 * Signs a W3C Verifiable Credential using Ed25519 or RSA
 */
export async function createW3CCredential(
  issuerKey: CryptoKeyPair,
  holderDid: string,
  type: string[],
  claims: CredentialSubjectClaims,
  validityDays: number = 365,
  customContext?: string[]
): Promise<W3CVerifiableCredential> {
  const now = new Date();
  const validUntil = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

  const vcWithoutProof = {
    '@context': customContext || [
      'https://www.w3.org/2018/credentials/v1',
      'https://schema.mosip.io/credentials/v1'
    ],
    id: `urn:uuid:${crypto.randomUUID()}`,
    type: ['VerifiableCredential', ...type],
    issuer: issuerKey.did,
    issuanceDate: now.toISOString(),
    validUntil: validUntil.toISOString(),
    credentialSubject: {
      id: holderDid,
      ...claims
    }
  };

  const proofInfo = {
    type: issuerKey.alg === 'EdDSA' ? 'Ed25519Signature2020' : 'RsaSignature2018',
    created: now.toISOString(),
    verificationMethod: `${issuerKey.did}#${issuerKey.keyId}`,
    proofPurpose: 'assertionMethod'
  };

  const docToSign = canonicalizeJson({ ...vcWithoutProof, proof: proofInfo });
  const docHash = crypto.createHash('sha256').update(docToSign).digest();

  const privateKey = await jose.importJWK(issuerKey.privateKeyJwk, issuerKey.alg);
  const jws = await new jose.CompactSign(docHash)
    .setProtectedHeader({ alg: issuerKey.alg, kid: issuerKey.keyId })
    .sign(privateKey);

  return {
    ...vcWithoutProof,
    proof: {
      ...proofInfo,
      jws
    }
  };
}

/**
 * Wraps a W3C VC into a signed W3C Verifiable Presentation (VP)
 */
export async function createW3CPresentation(
  holderKey: CryptoKeyPair,
  credential: W3CVerifiableCredential,
  challenge: string,
  domain: string
): Promise<W3CVerifiablePresentation> {
  const now = new Date();

  const vpWithoutProof = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: `urn:uuid:${crypto.randomUUID()}`,
    type: ['VerifiablePresentation'],
    verifiableCredential: [credential],
    holder: holderKey.did
  };

  const proofInfo = {
    type: 'Ed25519Signature2020',
    created: now.toISOString(),
    challenge,
    domain,
    verificationMethod: `${holderKey.did}#${holderKey.keyId}`,
    proofPurpose: 'authentication'
  };

  const docToSign = canonicalizeJson({ ...vpWithoutProof, proof: proofInfo });
  const docHash = crypto.createHash('sha256').update(docToSign).digest();

  const privateKey = await jose.importJWK(holderKey.privateKeyJwk, holderKey.alg);
  const jws = await new jose.CompactSign(docHash)
    .setProtectedHeader({ alg: holderKey.alg, kid: holderKey.keyId })
    .sign(privateKey);

  return {
    ...vpWithoutProof,
    proof: {
      ...proofInfo,
      jws
    }
  };
}

/**
 * Verifies a W3C Verifiable Presentation and its inner Credential
 */
export async function verifyW3CPresentation(
  presentation: W3CVerifiablePresentation,
  expectedChallenge: string,
  expectedDomain: string,
  issuerKey: CryptoKeyPair
): Promise<{
  isValid: boolean;
  errors: string[];
  checks: Array<{ name: string; passed: boolean; message: string }>;
  verifiedClaims: Record<string, unknown>;
}> {
  const errors: string[] = [];
  const checks: Array<{ name: string; passed: boolean; message: string }> = [];

  // Check 1: Presentation structure
  const hasVpStructure = Boolean(
    presentation &&
    Array.isArray(presentation.type) &&
    presentation.type.includes('VerifiablePresentation') &&
    presentation.proof &&
    presentation.proof.jws &&
    Array.isArray(presentation.verifiableCredential) &&
    presentation.verifiableCredential.length > 0
  );

  checks.push({
    name: 'Presentation Structure',
    passed: hasVpStructure,
    message: hasVpStructure ? 'Valid W3C VP format' : 'Missing required VP fields'
  });

  if (!hasVpStructure) {
    errors.push('Malformed Verifiable Presentation payload');
    return { isValid: false, errors, checks, verifiedClaims: {} };
  }

  // Check 2: Challenge (nonce) and Domain (client_id / audience) verification
  const challengeMatch = presentation.proof.challenge === expectedChallenge;
  checks.push({
    name: 'Proof Challenge (Nonce) Match',
    passed: challengeMatch,
    message: challengeMatch ? `Challenge matched: ${expectedChallenge}` : `Nonce mismatch: expected ${expectedChallenge}, got ${presentation.proof.challenge}`
  });
  if (!challengeMatch) {
    errors.push(`Presentation challenge does not match verifier session nonce`);
  }

  const domainMatch = presentation.proof.domain === expectedDomain;
  checks.push({
    name: 'Proof Domain (Audience) Match',
    passed: domainMatch,
    message: domainMatch ? `Domain matched: ${expectedDomain}` : `Domain mismatch: expected ${expectedDomain}, got ${presentation.proof.domain}`
  });
  if (!domainMatch) {
    errors.push(`Presentation domain does not match verifier client_id`);
  }

  // Check 3: Holder VP Proof signature
  try {
    const { jws, ...proofWithoutJws } = presentation.proof;
    const { proof: _discard, ...vpWithoutProof } = presentation;
    const expectedDoc = canonicalizeJson({ ...vpWithoutProof, proof: proofWithoutJws });
    const expectedHash = crypto.createHash('sha256').update(expectedDoc).digest();

    // Extract raw public key from holder DID (did:key)
    const holderDid = presentation.holder;
    let holderPublicKey: jose.KeyLike | Uint8Array;

    if (holderDid.startsWith('did:key:z')) {
      const rawKeyBase58 = holderDid.replace(/^did:key:z/, '');
      const multicodec = base58btcDecode(rawKeyBase58);
      const rawPub = multicodec.subarray(2);
      const holderJwk: jose.JWK = {
        kty: 'OKP',
        crv: 'Ed25519',
        x: Buffer.from(rawPub).toString('base64url')
      };
      holderPublicKey = await jose.importJWK(holderJwk, 'EdDSA');
    } else {
      throw new Error(`Unsupported holder DID format: ${holderDid}`);
    }
    
    const { payload } = await jose.compactVerify(jws, holderPublicKey);
    const hashMatches = Buffer.from(payload).equals(expectedHash);

    checks.push({
      name: 'Holder Authentication Signature',
      passed: hashMatches,
      message: hashMatches 
        ? 'Holder Ed25519 proof signature verified cryptographically' 
        : 'Holder proof hash mismatch'
    });
    if (!hashMatches) {
      errors.push('Holder presentation signature does not match canonical document hash');
    }
  } catch (err: unknown) {
    checks.push({
      name: 'Holder Authentication Signature',
      passed: false,
      message: `Holder proof verification failed: ${(err as Error).message}`
    });
    errors.push(`Invalid holder presentation signature: ${(err as Error).message}`);
  }

  // Check 4: Verifiable Credential Validity and Issuer Signature
  const vc = presentation.verifiableCredential[0];
  const now = new Date();
  const validUntil = new Date(vc.validUntil);
  const issuanceDate = new Date(vc.issuanceDate);

  const notExpired = validUntil.getTime() > now.getTime();
  const alreadyIssued = issuanceDate.getTime() <= now.getTime();

  checks.push({
    name: 'Credential Temporal Validity',
    passed: notExpired && alreadyIssued,
    message: notExpired 
      ? `Valid until ${validUntil.toISOString()}` 
      : `EXPIRED on ${validUntil.toISOString()}`
  });

  if (!notExpired) {
    errors.push(`Credential has expired on ${validUntil.toISOString()}`);
  }

  // Check 5: Issuer Cryptographic Signature
  try {
    const { jws, ...proofWithoutJws } = vc.proof;
    const { proof: _discard, ...vcWithoutProof } = vc;
    const expectedDoc = canonicalizeJson({ ...vcWithoutProof, proof: proofWithoutJws });
    const expectedHash = crypto.createHash('sha256').update(expectedDoc).digest();

    const issuerPublicKey = await jose.importJWK(issuerKey.publicKeyJwk, issuerKey.alg);
    const { payload } = await jose.compactVerify(jws, issuerPublicKey);
    const hashMatches = Buffer.from(payload).equals(expectedHash);

    checks.push({
      name: 'Issuer Cryptographic Signature',
      passed: hashMatches,
      message: hashMatches
        ? `Credential verified against issuer ${vc.issuer} using ${issuerKey.alg}`
        : 'Issuer signature hash mismatch'
    });
    if (!hashMatches) {
      errors.push('Credential signature hash does not match canonical document hash');
    }
  } catch (err: unknown) {
    checks.push({
      name: 'Issuer Cryptographic Signature',
      passed: false,
      message: `Issuer signature failed: ${(err as Error).message}`
    });
    errors.push(`Credential signature tampered or invalid: ${(err as Error).message}`);
  }

  const isValid = errors.length === 0;
  return {
    isValid,
    errors,
    checks,
    verifiedClaims: vc.credentialSubject as Record<string, unknown>
  };
}

function base58btcDecode(s: string): Uint8Array {
  const bs58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let num = 0n;
  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    const index = bs58Chars.indexOf(char);
    if (index === -1) throw new Error('Invalid base58 character');
    num = num * 58n + BigInt(index);
  }
  let hex = num.toString(16);
  if (hex.length % 2 !== 0) hex = '0' + hex;
  const bytes = Buffer.from(hex, 'hex');
  let leadingZeros = 0;
  for (let i = 0; i < s.length && s[i] === '1'; i++) {
    leadingZeros++;
  }
  return Buffer.concat([Buffer.alloc(leadingZeros), bytes]);
}
