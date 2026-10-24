import { IssuerId, CredentialProfileId, CredentialSubjectClaims, CredentialFormat } from '../types/index.js';
import { getKeys, CryptoKeyPair } from '../crypto/keys.js';

export interface IssuerModuleInfo {
  id: IssuerId;
  name: string;
  version: string;
  type: 'inji' | 'external' | 'generic';
  description: string;
  supportedFormats: CredentialFormat[];
  supportedAlgorithms: string[];
  protocolVersion: string;
  getKey: () => CryptoKeyPair;
}

export const SAMPLE_PROFILES: Record<CredentialProfileId, {
  name: string;
  description: string;
  defaultFormat: CredentialFormat;
  claims: CredentialSubjectClaims;
}> = {
  MOSIP_NATIONAL_ID: {
    name: 'MOSIP National Identity Card',
    description: 'Official digital identity credential issued by national civil registration authority.',
    defaultFormat: 'ldp_vc',
    claims: {
      uin: '9876-5432-1098',
      fullName: 'Amina Al-Mansoor',
      birthDate: '1994-08-15',
      gender: 'Female',
      nationality: 'Morocco',
      address: '12 Boulevard Mohammed V, Rabat'
    }
  },
  DIGITAL_DRIVING_LICENSE: {
    name: 'ISO/IEC 18013-5 Digital Driving License',
    description: 'Cryptographically signed motor vehicle driving license with vehicle authorization classes.',
    defaultFormat: 'mso_mdoc',
    claims: {
      documentNumber: 'DL-2026-98124',
      fullName: 'Carlos Santiago',
      birthDate: '1988-04-22',
      issueDate: '2024-01-10',
      expiryDate: '2034-01-10',
      vehicleClasses: ['A', 'B', 'C1']
    }
  },
  VACCINATION_CREDENTIAL: {
    name: 'WHO Digital Vaccination Certificate',
    description: 'International health vaccination card for cross-border travel and immunity verification.',
    defaultFormat: 'vc+sd-jwt',
    claims: {
      fullName: 'Elena Rostova',
      vaccineCode: 'COVID-19-mRNA-BIVALENT',
      doseNumber: 3,
      totalDoses: 3,
      dateOfVaccination: '2025-11-04',
      countryOfVaccination: 'Estonia'
    }
  }
};

export const ISSUER_MODULES: Record<IssuerId, IssuerModuleInfo> = {
  'inji-certify': {
    id: 'inji-certify',
    name: 'Inji Certify (MOSIP Core)',
    version: 'v0.12.0',
    type: 'inji',
    description: 'Plugin-based credential issuer from the MOSIP Inji stack supporting OpenID4VCI draft 13, W3C VC, SD-JWT VC, and mock mDoc.',
    supportedFormats: ['ldp_vc', 'vc+sd-jwt', 'mso_mdoc'],
    supportedAlgorithms: ['Ed25519Signature2020', 'EdDSA'],
    protocolVersion: 'OpenID4VCI draft 13',
    getKey: () => getKeys().injiCertifyIssuer
  },
  'waltid-issuer': {
    id: 'waltid-issuer',
    name: 'Walt.id / DIF Reference Issuer',
    version: 'v1.4.2',
    type: 'external',
    description: 'External open-source reference issuer demonstrating cross-ecosystem OpenID4VCI interoperability with RSA and standard W3C/SD-JWT profiles.',
    supportedFormats: ['ldp_vc', 'vc+sd-jwt'],
    supportedAlgorithms: ['RS256', 'ES256'],
    protocolVersion: 'OpenID4VCI draft 13',
    getKey: () => getKeys().externalIssuer
  },
  'generic-oid4vci': {
    id: 'generic-oid4vci',
    name: 'Generic OID4VCI Endpoint',
    version: 'v2.0-spec',
    type: 'generic',
    description: 'Standards-compliant OpenID4VCI mock endpoint conforming strictly to draft 13 specifications.',
    supportedFormats: ['ldp_vc', 'vc+sd-jwt', 'mso_mdoc'],
    supportedAlgorithms: ['EdDSA', 'RS256'],
    protocolVersion: 'OpenID4VCI draft 13',
    getKey: () => getKeys().injiCertifyIssuer
  }
};
