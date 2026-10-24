import crypto from 'crypto';
import * as jose from 'jose';

export interface CryptoKeyPair {
  publicKeyJwk: jose.JWK;
  privateKeyJwk: jose.JWK;
  did: string;
  alg: string;
  keyId: string;
}

// Convert Ed25519 raw public key to did:key (multicodec 0xed, 0x01 = 0xed01)
function ed25519PublicKeyToDidKey(rawPublicKeyBytes: Buffer): string {
  // Multicodec prefix for ed25519-pub is 0xed, 0x01 (varint 0xed01)
  const prefix = Buffer.from([0xed, 0x01]);
  const multicodec = Buffer.concat([prefix, rawPublicKeyBytes]);
  const bs58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  
  // Base58btc encoding
  let x = BigInt('0x' + multicodec.toString('hex'));
  let result = '';
  while (x > 0n) {
    const mod = Number(x % 58n);
    result = bs58Chars[mod] + result;
    x = x / 58n;
  }
  for (let i = 0; i < multicodec.length && multicodec[i] === 0; i++) {
    result = '1' + result;
  }
  return `did:key:z${result}`;
}

let issuerKeyPair: CryptoKeyPair | null = null;
let externalIssuerKeyPair: CryptoKeyPair | null = null;
let holderKeyPair: CryptoKeyPair | null = null;
let verifierKeyPair: CryptoKeyPair | null = null;

export async function generateEd25519KeyPair(keyId: string): Promise<CryptoKeyPair> {
  const { publicKey, privateKey } = await jose.generateKeyPair('EdDSA', { crv: 'Ed25519', extractable: true });
  const publicKeyJwk = await jose.exportJWK(publicKey);
  const privateKeyJwk = await jose.exportJWK(privateKey);

  publicKeyJwk.kid = keyId;
  privateKeyJwk.kid = keyId;

  const rawPub = Buffer.from(publicKeyJwk.x!, 'base64url');
  const did = ed25519PublicKeyToDidKey(rawPub);

  return {
    publicKeyJwk,
    privateKeyJwk,
    did,
    alg: 'EdDSA',
    keyId
  };
}

export async function generateRsaKeyPair(keyId: string): Promise<CryptoKeyPair> {
  const { publicKey, privateKey } = await jose.generateKeyPair('RS256', { extractable: true });
  const publicKeyJwk = await jose.exportJWK(publicKey);
  const privateKeyJwk = await jose.exportJWK(privateKey);

  publicKeyJwk.kid = keyId;
  privateKeyJwk.kid = keyId;

  return {
    publicKeyJwk,
    privateKeyJwk,
    did: `did:jwk:${Buffer.from(JSON.stringify(publicKeyJwk)).toString('base64url')}`,
    alg: 'RS256',
    keyId
  };
}

export async function initKeyInfrastructure(): Promise<{
  injiCertifyIssuer: CryptoKeyPair;
  externalIssuer: CryptoKeyPair;
  injiWalletHolder: CryptoKeyPair;
  injiVerifier: CryptoKeyPair;
}> {
  if (!issuerKeyPair) {
    issuerKeyPair = await generateEd25519KeyPair('inji-certify-ed25519-key-01');
  }
  if (!externalIssuerKeyPair) {
    externalIssuerKeyPair = await generateRsaKeyPair('external-oid4vci-rsa-key-01');
  }
  if (!holderKeyPair) {
    holderKeyPair = await generateEd25519KeyPair('inji-holder-device-key-01');
  }
  if (!verifierKeyPair) {
    verifierKeyPair = await generateEd25519KeyPair('inji-verifier-session-key-01');
  }

  return {
    injiCertifyIssuer: issuerKeyPair,
    externalIssuer: externalIssuerKeyPair,
    injiWalletHolder: holderKeyPair,
    injiVerifier: verifierKeyPair
  };
}

export function getKeys() {
  if (!issuerKeyPair || !holderKeyPair || !verifierKeyPair || !externalIssuerKeyPair) {
    throw new Error('Key infrastructure not initialized. Call initKeyInfrastructure() first.');
  }
  return {
    injiCertifyIssuer: issuerKeyPair,
    externalIssuer: externalIssuerKeyPair,
    injiWalletHolder: holderKeyPair,
    injiVerifier: verifierKeyPair
  };
}
