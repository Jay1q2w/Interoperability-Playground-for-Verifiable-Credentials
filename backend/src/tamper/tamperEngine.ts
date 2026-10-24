import crypto from 'crypto';
import * as jose from 'jose';
import { TamperScenario, CredentialFormat, AuthorizationResponsePayload } from '../types/index.js';
import { W3CVerifiablePresentation } from '../crypto/w3c.js';
import { DeviceResponse } from '../crypto/mdoc.js';

export interface TamperDescription {
  id: TamperScenario;
  name: string;
  category: 'Cryptographic' | 'Temporal' | 'Replay/Audience' | 'Revocation' | 'Format';
  description: string;
  expectedOutcome: string;
}

export const TAMPER_CATALOG: TamperDescription[] = [
  {
    id: 'NONE',
    name: 'Clean Submission (No Tampering)',
    category: 'Cryptographic',
    description: 'Submits legitimate, unmodified verifiable presentation with valid holder binding and issuer signatures.',
    expectedOutcome: 'VALID'
  },
  {
    id: 'CORRUPTED_SIGNATURE',
    name: 'Corrupted Cryptographic Signature',
    category: 'Cryptographic',
    description: 'Flips bits in the issuer or holder cryptographic signature block to simulate forgery or transport corruption.',
    expectedOutcome: 'TAMPERED_SIGNATURE'
  },
  {
    id: 'TAMPERED_CLAIM',
    name: 'Tampered Credential Claims (Man-in-the-Middle)',
    category: 'Cryptographic',
    description: 'Alters claims (e.g. birthDate or legal name) inside the payload without possessing the issuer private signing key.',
    expectedOutcome: 'TAMPERED_SIGNATURE'
  },
  {
    id: 'EXPIRED_CREDENTIAL',
    name: 'Expired Validity Period',
    category: 'Temporal',
    description: 'Presents a credential whose validUntil or exp expiration timestamp has elapsed in the past.',
    expectedOutcome: 'VALID_BUT_EXPIRED'
  },
  {
    id: 'INVALID_NONCE',
    name: 'Replay Attack (Mismatched Nonce)',
    category: 'Replay/Audience',
    description: 'Replays a stale presentation token with an expired or mismatched verifier challenge nonce.',
    expectedOutcome: 'INVALID_NONCE'
  },
  {
    id: 'MISMATCHED_AUDIENCE',
    name: 'Cross-Site Presentation (Mismatched Audience)',
    category: 'Replay/Audience',
    description: 'Presents a token generated for a different relying party (client_id mismatch).',
    expectedOutcome: 'MISMATCHED_AUDIENCE'
  },
  {
    id: 'REVOKED_STATUS',
    name: 'Revoked Credential in Status List',
    category: 'Revocation',
    description: 'Simulates presentation of a credential marked as REVOKED in the MOSIP/Inji revocation status registry.',
    expectedOutcome: 'REVOKED'
  },
  {
    id: 'UNSUPPORTED_FORMAT',
    name: 'Unsupported Format Envelope',
    category: 'Format',
    description: 'Submits a corrupted envelope header or unknown credential format type.',
    expectedOutcome: 'UNSUPPORTED_FORMAT'
  }
];

export function applyTamperScenario(
  payload: AuthorizationResponsePayload,
  format: CredentialFormat,
  scenario: TamperScenario
): AuthorizationResponsePayload {
  if (scenario === 'NONE') {
    return payload;
  }

  const cloned: AuthorizationResponsePayload = JSON.parse(JSON.stringify(payload));

  switch (scenario) {
    case 'CORRUPTED_SIGNATURE': {
      if (format === 'ldp_vc') {
        const vp = cloned.vp_token as W3CVerifiablePresentation;
        if (vp.proof && vp.proof.jws) {
          // Flip characters in JWS signature portion
          const parts = vp.proof.jws.split('.');
          if (parts[2]) {
            parts[2] = parts[2].substring(0, parts[2].length - 4) + 'X9Z_';
            vp.proof.jws = parts.join('.');
          }
        }
      } else if (format === 'vc+sd-jwt') {
        let token = cloned.vp_token as string;
        // corrupt the issuer jwt signature or kb_jwt signature
        const parts = token.split('~');
        if (parts[0]) {
          const jwtParts = parts[0].split('.');
          if (jwtParts[2]) {
            jwtParts[2] = 'FAKED' + jwtParts[2].substring(5);
            parts[0] = jwtParts.join('.');
          }
        }
        cloned.vp_token = parts.join('~');
      } else if (format === 'mso_mdoc') {
        const mdoc = cloned.vp_token as DeviceResponse;
        if (mdoc.documents && mdoc.documents[0]) {
          const auth = mdoc.documents[0].issuerSigned.issuerAuth;
          auth.signatureHex = 'deadbeef' + auth.signatureHex.substring(8);
        }
      }
      break;
    }

    case 'TAMPERED_CLAIM': {
      if (format === 'ldp_vc') {
        const vp = cloned.vp_token as W3CVerifiablePresentation;
        if (vp.verifiableCredential && vp.verifiableCredential[0]) {
          vp.verifiableCredential[0].credentialSubject.fullName = 'Tampered Impostor Name';
          vp.verifiableCredential[0].credentialSubject.birthDate = '1970-01-01';
        }
      } else if (format === 'vc+sd-jwt') {
        // Tamper with disclosure content without changing digest
        let token = cloned.vp_token as string;
        const parts = token.split('~');
        if (parts.length > 2 && parts[1]) {
          // Alter raw disclosure string
          const fakeDisc = Buffer.from(JSON.stringify(['fakesalt', 'fullName', 'Altered Fraudulent Name'])).toString('base64url');
          parts[1] = fakeDisc;
        }
        cloned.vp_token = parts.join('~');
      } else if (format === 'mso_mdoc') {
        const mdoc = cloned.vp_token as DeviceResponse;
        if (mdoc.documents && mdoc.documents[0]) {
          const ns = mdoc.documents[0].issuerSigned.nameSpaces['org.iso.18013.5.1'];
          if (ns && ns[0]) {
            ns[0].elementValue = 'Tampered Document Value';
          }
        }
      }
      break;
    }

    case 'EXPIRED_CREDENTIAL': {
      if (format === 'ldp_vc') {
        const vp = cloned.vp_token as W3CVerifiablePresentation;
        if (vp.verifiableCredential && vp.verifiableCredential[0]) {
          vp.verifiableCredential[0].validUntil = '2020-01-01T00:00:00Z';
        }
      } else if (format === 'vc+sd-jwt') {
        // SD-JWT with expired exp in issuer JWT
        let token = cloned.vp_token as string;
        const parts = token.split('~');
        const issuerJwt = parts[0];
        try {
          const header = jose.decodeProtectedHeader(issuerJwt);
          const payload = jose.decodeJwt(issuerJwt);
          payload.exp = Math.floor(new Date('2020-01-01').getTime() / 1000);
          // Re-encode unsigned to simulate expired token
          const fakeJwt = `${Buffer.from(JSON.stringify(header)).toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${issuerJwt.split('.')[2]}`;
          parts[0] = fakeJwt;
          cloned.vp_token = parts.join('~');
        } catch (_) {}
      } else if (format === 'mso_mdoc') {
        const mdoc = cloned.vp_token as DeviceResponse;
        if (mdoc.documents && mdoc.documents[0]) {
          mdoc.documents[0].issuerSigned.issuerAuth.payload.validityInfo.validUntil = '2020-01-01T00:00:00.000Z';
        }
      }
      break;
    }

    case 'INVALID_NONCE': {
      if (format === 'ldp_vc') {
        const vp = cloned.vp_token as W3CVerifiablePresentation;
        if (vp.proof) {
          vp.proof.challenge = 'stale_replayed_nonce_9999999';
        }
      } else if (format === 'vc+sd-jwt') {
        let token = cloned.vp_token as string;
        const parts = token.split('~');
        const kbJwt = parts[parts.length - 1];
        if (kbJwt) {
          try {
            const header = jose.decodeProtectedHeader(kbJwt);
            const payload = jose.decodeJwt(kbJwt);
            payload.nonce = 'stale_replayed_nonce_9999999';
            parts[parts.length - 1] = `${Buffer.from(JSON.stringify(header)).toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${kbJwt.split('.')[2]}`;
            cloned.vp_token = parts.join('~');
          } catch (_) {}
        }
      } else if (format === 'mso_mdoc') {
        const mdoc = cloned.vp_token as DeviceResponse;
        if (mdoc.documents && mdoc.documents[0]) {
          mdoc.documents[0].deviceSigned.deviceAuth.sessionTranscriptDigest = '0000deadbeefstalenonce0000';
        }
      }
      break;
    }

    case 'MISMATCHED_AUDIENCE': {
      if (format === 'ldp_vc') {
        const vp = cloned.vp_token as W3CVerifiablePresentation;
        if (vp.proof) {
          vp.proof.domain = 'https://malicious-relying-party.xyz';
        }
      } else if (format === 'vc+sd-jwt') {
        let token = cloned.vp_token as string;
        const parts = token.split('~');
        const kbJwt = parts[parts.length - 1];
        if (kbJwt) {
          try {
            const header = jose.decodeProtectedHeader(kbJwt);
            const payload = jose.decodeJwt(kbJwt);
            payload.aud = 'https://malicious-relying-party.xyz';
            parts[parts.length - 1] = `${Buffer.from(JSON.stringify(header)).toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${kbJwt.split('.')[2]}`;
            cloned.vp_token = parts.join('~');
          } catch (_) {}
        }
      }
      break;
    }

    case 'REVOKED_STATUS': {
      (cloned as unknown as Record<string, unknown>)._simulatedRevoked = true;
      break;
    }

    case 'UNSUPPORTED_FORMAT': {
      cloned.presentation_submission.descriptor_map[0].format = 'unsupported_custom_format' as CredentialFormat;
      break;
    }
  }

  return cloned;
}
