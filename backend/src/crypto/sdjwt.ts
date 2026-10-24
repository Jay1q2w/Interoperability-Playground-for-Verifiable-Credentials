import crypto from 'crypto';
import * as jose from 'jose';
import { CryptoKeyPair } from './keys.js';
import { CredentialSubjectClaims } from '../types/index.js';

export interface SDJwtDisclosure {
  salt: string;
  claimKey: string;
  claimValue: unknown;
  rawDisclosure: string;
  digest: string; // base64url(sha256(rawDisclosure))
}

export interface SDJwtCredentialPackage {
  issuerJwt: string;
  disclosures: SDJwtDisclosure[];
  combinedSdJwt: string; // issuerJwt~disc1~disc2~...~
  claims: Record<string, unknown>;
}

export interface SDJwtPresentationPackage {
  presentationToken: string; // issuerJwt~selectedDisc1~...~kbJwt
  disclosedClaims: Record<string, unknown>;
  hiddenClaimsCount: number;
}

export function createDisclosure(key: string, value: unknown): SDJwtDisclosure {
  const salt = crypto.randomBytes(16).toString('base64url');
  const disclosureArray = [salt, key, value];
  const rawDisclosure = Buffer.from(JSON.stringify(disclosureArray)).toString('base64url');
  const digest = crypto.createHash('sha256').update(rawDisclosure).digest('base64url');

  return {
    salt,
    claimKey: key,
    claimValue: value,
    rawDisclosure,
    digest
  };
}

/**
 * Issues an IETF SD-JWT VC with salted SHA-256 disclosures
 */
export async function issueSDJwtCredential(
  issuerKey: CryptoKeyPair,
  holderKey: CryptoKeyPair,
  vct: string,
  claims: CredentialSubjectClaims,
  validitySeconds: number = 365 * 24 * 3600
): Promise<SDJwtCredentialPackage> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + validitySeconds;

  // Generate disclosures for credential subject claims
  const disclosures: SDJwtDisclosure[] = [];
  const sdHashes: string[] = [];

  for (const [key, value] of Object.entries(claims)) {
    if (value !== undefined) {
      const disc = createDisclosure(key, value);
      disclosures.push(disc);
      sdHashes.push(disc.digest);
    }
  }

  // Issuer JWT payload
  const payload = {
    iss: issuerKey.did,
    sub: holderKey.did,
    vct,
    iat: now,
    nbf: now,
    exp,
    _sd_alg: 'sha-256',
    _sd: sdHashes,
    cnf: {
      jwk: holderKey.publicKeyJwk
    }
  };

  const privateKey = await jose.importJWK(issuerKey.privateKeyJwk, issuerKey.alg);
  const issuerJwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: issuerKey.alg, typ: 'vc+sd-jwt', kid: issuerKey.keyId })
    .sign(privateKey);

  // Serialized SD-JWT: <issuer_jwt>~<disc_1>~<disc_2>~...~
  const disclosurePart = disclosures.map(d => d.rawDisclosure).join('~');
  const combinedSdJwt = `${issuerJwt}~${disclosurePart}~`;

  return {
    issuerJwt,
    disclosures,
    combinedSdJwt,
    claims: claims as Record<string, unknown>
  };
}

/**
 * Creates a Holder Presentation from an SD-JWT with selective disclosure and Holder Key Binding JWT (KB-JWT)
 */
export async function createSDJwtPresentation(
  holderKey: CryptoKeyPair,
  sdJwtPackage: SDJwtCredentialPackage,
  disclosedKeys: string[],
  verifierNonce: string,
  verifierAudience: string
): Promise<SDJwtPresentationPackage> {
  // Filter disclosures
  const selectedDisclosures = sdJwtPackage.disclosures.filter(d => disclosedKeys.includes(d.claimKey));
  const hiddenCount = sdJwtPackage.disclosures.length - selectedDisclosures.length;

  const disclosedClaims: Record<string, unknown> = {};
  for (const d of selectedDisclosures) {
    disclosedClaims[d.claimKey] = d.claimValue;
  }

  const disclosureStrings = selectedDisclosures.map(d => d.rawDisclosure).join('~');
  const sdJwtWithoutBinding = disclosureStrings.length > 0 
    ? `${sdJwtPackage.issuerJwt}~${disclosureStrings}~`
    : `${sdJwtPackage.issuerJwt}~~`;

  // Calculate sd_hash over the SD-JWT before the KB-JWT
  const sdHash = crypto.createHash('sha256').update(sdJwtWithoutBinding).digest('base64url');

  // Sign Key Binding JWT
  const now = Math.floor(Date.now() / 1000);
  const holderPrivateKey = await jose.importJWK(holderKey.privateKeyJwk, holderKey.alg);
  
  const kbJwt = await new jose.SignJWT({
    nonce: verifierNonce,
    aud: verifierAudience,
    iat: now,
    sd_hash: sdHash
  })
    .setProtectedHeader({ alg: holderKey.alg, typ: 'kb+jwt', kid: holderKey.keyId })
    .sign(holderPrivateKey);

  const presentationToken = `${sdJwtWithoutBinding}${kbJwt}`;

  return {
    presentationToken,
    disclosedClaims,
    hiddenClaimsCount: hiddenCount
  };
}

/**
 * Verifies an SD-JWT VC presentation token
 */
export async function verifySDJwtPresentation(
  presentationToken: string,
  expectedNonce: string,
  expectedAudience: string,
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

  const parts = presentationToken.split('~');
  if (parts.length < 2) {
    errors.push('Invalid SD-JWT structure: Missing delimiter `~`');
    return { isValid: false, errors, checks, verifiedClaims, hiddenCount: 0 };
  }

  const issuerJwt = parts[0];
  const kbJwt = parts[parts.length - 1];
  const rawDisclosures = parts.slice(1, parts.length - 1).filter(p => p.length > 0);

  // 1. Verify Issuer JWT
  let issuerPayload: Record<string, unknown> | null = null;
  try {
    const issuerPubKey = await jose.importJWK(issuerKey.publicKeyJwk, issuerKey.alg);
    const { payload } = await jose.jwtVerify(issuerJwt, issuerPubKey, {
      algorithms: [issuerKey.alg]
    });
    issuerPayload = payload as Record<string, unknown>;
    checks.push({
      name: 'Issuer Signature (SD-JWT)',
      passed: true,
      message: `Issuer JWT signature verified with ${issuerKey.alg} (${issuerKey.did})`
    });
  } catch (err: unknown) {
    checks.push({
      name: 'Issuer Signature (SD-JWT)',
      passed: false,
      message: `Issuer signature failed: ${(err as Error).message}`
    });
    errors.push(`Issuer signature invalid: ${(err as Error).message}`);
    return { isValid: false, errors, checks, verifiedClaims, hiddenCount: 0 };
  }

  // 2. Check Expiration & Temporal Validity
  const now = Math.floor(Date.now() / 1000);
  const exp = typeof issuerPayload.exp === 'number' ? issuerPayload.exp : 0;
  const isNotExpired = exp > now;
  checks.push({
    name: 'Credential Expiration',
    passed: isNotExpired,
    message: isNotExpired 
      ? `Valid until ${new Date(exp * 1000).toISOString()}` 
      : `EXPIRED on ${new Date(exp * 1000).toISOString()}`
  });
  if (!isNotExpired) {
    errors.push(`SD-JWT credential has expired`);
  }

  // 3. Verify Disclosures against `_sd` array in Issuer JWT
  const sdList = Array.isArray(issuerPayload._sd) ? (issuerPayload._sd as string[]) : [];
  let disclosuresValid = true;

  for (const rawDisc of rawDisclosures) {
    try {
      const digest = crypto.createHash('sha256').update(rawDisc).digest('base64url');
      if (!sdList.includes(digest)) {
        disclosuresValid = false;
        errors.push(`Disclosure digest not found in issuer _sd commitment`);
        continue;
      }

      const decoded = JSON.parse(Buffer.from(rawDisc, 'base64url').toString('utf8'));
      if (Array.isArray(decoded) && decoded.length === 3) {
        const [_, claimKey, claimValue] = decoded;
        verifiedClaims[claimKey] = claimValue;
      }
    } catch (e: unknown) {
      disclosuresValid = false;
      errors.push(`Malformed disclosure: ${(e as Error).message}`);
    }
  }

  checks.push({
    name: 'Selective Disclosures Hash Integrity',
    passed: disclosuresValid,
    message: disclosuresValid 
      ? `All ${rawDisclosures.length} disclosures verified against issuer SHA-256 commitments` 
      : `Disclosures tampering detected`
  });

  const hiddenCount = Math.max(0, sdList.length - rawDisclosures.length);

  // 4. Verify Holder Key Binding JWT (KB-JWT)
  if (!kbJwt || kbJwt.trim().length === 0) {
    checks.push({
      name: 'Holder Key Binding (KB-JWT)',
      passed: false,
      message: 'Missing Holder Key Binding JWT'
    });
    errors.push('Missing Holder Key Binding JWT in presentation');
    return { isValid: false, errors, checks, verifiedClaims, hiddenCount };
  }

  try {
    const cnf = issuerPayload.cnf as { jwk?: jose.JWK } | undefined;
    if (!cnf || !cnf.jwk) {
      throw new Error('Issuer JWT lacks holder cnf.jwk binding');
    }

    const holderPubKey = await jose.importJWK(cnf.jwk, 'EdDSA');
    const { payload: kbPayload } = await jose.jwtVerify(kbJwt, holderPubKey);

    // Check nonce
    const nonceMatch = kbPayload.nonce === expectedNonce;
    checks.push({
      name: 'KB-JWT Nonce Match',
      passed: nonceMatch,
      message: nonceMatch ? `Nonce matched: ${expectedNonce}` : `Expected nonce ${expectedNonce}, got ${kbPayload.nonce}`
    });
    if (!nonceMatch) {
      errors.push('Holder Key Binding nonce does not match verifier session challenge');
    }

    // Check audience
    const audMatch = kbPayload.aud === expectedAudience;
    checks.push({
      name: 'KB-JWT Audience Match',
      passed: audMatch,
      message: audMatch ? `Audience matched: ${expectedAudience}` : `Expected aud ${expectedAudience}, got ${kbPayload.aud}`
    });
    if (!audMatch) {
      errors.push('Holder Key Binding audience does not match verifier client_id');
    }

    // Check sd_hash
    const expectedSdPart = rawDisclosures.length > 0
      ? `${issuerJwt}~${rawDisclosures.join('~')}~`
      : `${issuerJwt}~~`;
    const expectedSdHash = crypto.createHash('sha256').update(expectedSdPart).digest('base64url');
    const hashMatch = kbPayload.sd_hash === expectedSdHash;

    checks.push({
      name: 'KB-JWT SD-Hash Binding',
      passed: hashMatch,
      message: hashMatch ? 'KB-JWT cryptographically binds to presented disclosures' : 'sd_hash mismatch'
    });
    if (!hashMatch) {
      errors.push('KB-JWT sd_hash mismatch: disclosures were altered after binding');
    }

  } catch (err: unknown) {
    checks.push({
      name: 'Holder Key Binding (KB-JWT)',
      passed: false,
      message: `Holder KB-JWT verification failed: ${(err as Error).message}`
    });
    errors.push(`Invalid holder key binding: ${(err as Error).message}`);
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
