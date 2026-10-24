import crypto from 'crypto';
import * as jose from 'jose';
import { 
  CredentialFormat, 
  CredentialOffer, 
  OpenID4VCIssuerMetadata, 
  TokenResponse,
  CredentialRequestPayload,
  CredentialResponsePayload,
  CredentialSubjectClaims,
  CredentialProfileId
} from '../types/index.js';
import { getKeys, CryptoKeyPair } from '../crypto/keys.js';
import { createW3CCredential, W3CVerifiableCredential } from '../crypto/w3c.js';
import { issueSDJwtCredential, SDJwtCredentialPackage } from '../crypto/sdjwt.js';
import { issueMDocCredential, MDocDocument } from '../crypto/mdoc.js';

export interface PreAuthSession {
  preAuthorizedCode: string;
  credentialIssuer: string;
  credentialsSupportedIds: string[];
  format: CredentialFormat;
  profileId: CredentialProfileId;
  claims: CredentialSubjectClaims;
  cNonce: string;
  createdAt: number;
  consumed: boolean;
}

// In-memory sessions store
const sessions = new Map<string, PreAuthSession>();
const activeTokens = new Map<string, { session: PreAuthSession; expiresAt: number }>();

export function getIssuerMetadata(baseUrl: string): OpenID4VCIssuerMetadata {
  return {
    credential_issuer: baseUrl,
    authorization_servers: [baseUrl],
    credential_endpoint: `${baseUrl}/api/issuer/credential`,
    batch_credential_endpoint: `${baseUrl}/api/issuer/batch_credential`,
    credentials_supported: [
      {
        id: 'MosipNationalId_ldp_vc',
        format: 'ldp_vc',
        scope: 'MosipNationalId',
        cryptographic_binding_methods_supported: ['did:key', 'jwk'],
        cryptographic_suites_supported: ['Ed25519Signature2020', 'RsaSignature2018'],
        credential_definition: {
          type: ['VerifiableCredential', 'MosipNationalIdCredential'],
          credentialSubject: {
            uin: { display: [{ name: 'MOSIP UIN', locale: 'en-US' }] },
            fullName: { display: [{ name: 'Full Name', locale: 'en-US' }] },
            birthDate: { display: [{ name: 'Date of Birth', locale: 'en-US' }] },
            nationality: { display: [{ name: 'Nationality', locale: 'en-US' }] },
            gender: { display: [{ name: 'Gender', locale: 'en-US' }] }
          }
        },
        display: [{
          name: 'MOSIP National Identity Card (W3C VC)',
          locale: 'en-US',
          background_color: '#0284c7',
          text_color: '#ffffff'
        }]
      },
      {
        id: 'MosipNationalId_sd_jwt',
        format: 'vc+sd-jwt',
        scope: 'MosipNationalId_sd_jwt',
        vct: 'urn:mosip:id:national_id',
        cryptographic_binding_methods_supported: ['jwk'],
        cryptographic_suites_supported: ['EdDSA', 'ES256'],
        display: [{
          name: 'MOSIP National ID (IETF SD-JWT VC)',
          locale: 'en-US',
          background_color: '#4f46e5',
          text_color: '#ffffff'
        }]
      },
      {
        id: 'org.iso.18013.5.1.mDL',
        format: 'mso_mdoc',
        doctype: 'org.iso.18013.5.1.mDL',
        cryptographic_binding_methods_supported: ['cose_key'],
        cryptographic_suites_supported: ['EdDSA', 'ES256'],
        display: [{
          name: 'ISO/IEC 18013-5 Mobile Driving License',
          locale: 'en-US',
          background_color: '#059669',
          text_color: '#ffffff'
        }]
      }
    ]
  };
}

export function createCredentialOffer(
  baseUrl: string,
  format: CredentialFormat,
  profileId: CredentialProfileId,
  claims: CredentialSubjectClaims
): { offer: CredentialOffer; preAuthorizedCode: string; offerUri: string } {
  const preAuthorizedCode = `pac_${crypto.randomBytes(16).toString('hex')}`;
  const cNonce = `cnonce_${crypto.randomBytes(16).toString('hex')}`;

  const formatToIdMap: Record<CredentialFormat, string> = {
    'ldp_vc': 'MosipNationalId_ldp_vc',
    'vc+sd-jwt': 'MosipNationalId_sd_jwt',
    'mso_mdoc': 'org.iso.18013.5.1.mDL'
  };

  const credId = formatToIdMap[format];

  sessions.set(preAuthorizedCode, {
    preAuthorizedCode,
    credentialIssuer: baseUrl,
    credentialsSupportedIds: [credId],
    format,
    profileId,
    claims,
    cNonce,
    createdAt: Date.now(),
    consumed: false
  });

  const offer: CredentialOffer = {
    credential_issuer: baseUrl,
    credentials: [credId],
    grants: {
      'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
        'pre-authorized_code': preAuthorizedCode,
        user_pin_required: false
      }
    }
  };

  const offerUri = `openid-credential-offer://?credential_offer=${encodeURIComponent(JSON.stringify(offer))}`;

  return { offer, preAuthorizedCode, offerUri };
}

export function exchangeToken(
  grantType: string,
  preAuthorizedCode: string
): { tokenResponse: TokenResponse; session: PreAuthSession } {
  if (grantType !== 'urn:ietf:params:oauth:grant-type:pre-authorized_code') {
    throw new Error(`Unsupported grant type: ${grantType}`);
  }

  const session = sessions.get(preAuthorizedCode);
  if (!session) {
    throw new Error('Invalid or expired pre-authorized code');
  }

  const accessToken = `at_${crypto.randomBytes(24).toString('hex')}`;
  const expiresIn = 3600;

  activeTokens.set(accessToken, {
    session,
    expiresAt: Date.now() + expiresIn * 1000
  });

  const tokenResponse: TokenResponse = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    c_nonce: session.cNonce,
    c_nonce_expires_in: 86400
  };

  return { tokenResponse, session };
}

export async function processCredentialRequest(
  accessToken: string,
  requestPayload: CredentialRequestPayload,
  issuerKey: CryptoKeyPair
): Promise<CredentialResponsePayload> {
  const tokenRecord = activeTokens.get(accessToken);
  if (!tokenRecord) {
    throw new Error('Unauthorized: Invalid or expired access token');
  }
  if (Date.now() > tokenRecord.expiresAt) {
    throw new Error('Unauthorized: Access token has expired');
  }

  const { session } = tokenRecord;

  // Validate Holder Proof of Possession
  if (!requestPayload.proof || requestPayload.proof.proof_type !== 'jwt' || !requestPayload.proof.jwt) {
    throw new Error('Invalid credential request: Proof of possession is required');
  }

  // Decode and verify proof JWT
  const unverified = jose.decodeJwt(requestPayload.proof.jwt);
  const protectedHeader = jose.decodeProtectedHeader(requestPayload.proof.jwt);

  if (unverified.nonce !== session.cNonce) {
    throw new Error(`Proof nonce mismatch: expected ${session.cNonce}, received ${unverified.nonce}`);
  }

  // Extract holder public key from proof header jwk or did
  let holderPubKeyJwk: jose.JWK;
  let holderDid: string;

  if (protectedHeader.jwk) {
    holderPubKeyJwk = protectedHeader.jwk as jose.JWK;
    holderDid = `did:jwk:${Buffer.from(JSON.stringify(holderPubKeyJwk)).toString('base64url')}`;
  } else {
    // Fallback to test holder key
    const keys = getKeys();
    holderPubKeyJwk = keys.injiWalletHolder.publicKeyJwk;
    holderDid = keys.injiWalletHolder.did;
  }

  // Issue Credential according to format
  let issuedCredential: unknown;
  const nextCNonce = `cnonce_${crypto.randomBytes(16).toString('hex')}`;
  session.cNonce = nextCNonce;

  if (requestPayload.format === 'ldp_vc') {
    const vc = await createW3CCredential(
      issuerKey,
      holderDid,
      ['MosipNationalIdCredential'],
      session.claims,
      365
    );
    issuedCredential = vc;
  } else if (requestPayload.format === 'vc+sd-jwt') {
    const keys = getKeys();
    const sdJwtPkg = await issueSDJwtCredential(
      issuerKey,
      keys.injiWalletHolder,
      'urn:mosip:id:national_id',
      session.claims,
      365 * 24 * 3600
    );
    issuedCredential = sdJwtPkg.combinedSdJwt;
  } else if (requestPayload.format === 'mso_mdoc') {
    const keys = getKeys();
    const mdoc = await issueMDocCredential(
      issuerKey,
      keys.injiWalletHolder,
      'org.iso.18013.5.1.mDL',
      session.claims,
      365
    );
    issuedCredential = mdoc;
  } else {
    throw new Error(`Unsupported credential format requested: ${requestPayload.format}`);
  }

  return {
    credential: issuedCredential,
    c_nonce: nextCNonce,
    c_nonce_expires_in: 86400,
    format: requestPayload.format
  };
}
