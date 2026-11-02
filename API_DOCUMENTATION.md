# Inji Interoperability Playground — API Specification

> **Comprehensive Technical API Reference for the MOSIP Inji Interoperability Testing & Diagnostic Suite**  
> **Team:** !Paradox!  
> **Protocol Standards:** OpenID4VCI (draft 13) • OpenID4VP (draft 21–23) • W3C VC 1.1/2.0 • IETF SD-JWT VC • ISO/IEC 18013-5 mdoc  

---

## Table of Contents
1. [Overview & Base Architecture](#1-overview--base-architecture)
2. [Authentication & Request Headers](#2-authentication--request-headers)
3. [Standards Conformance & Cryptographic Key Infrastructure](#3-standards-conformance--cryptographic-key-infrastructure)
4. [System & Discovery Endpoints](#4-system--discovery-endpoints)
   - `GET /health`
   - `GET /api/config/modules`
   - `GET /api/.well-known/openid-credential-issuer`
5. [OpenID4VCI Issuance Protocol Endpoints](#5-openid4vci-issuance-protocol-endpoints)
   - `POST /api/issuer/offer`
   - `POST /api/issuer/token`
   - `POST /api/issuer/credential`
6. [OpenID4VP Presentation Protocol Endpoints](#6-openid4vp-presentation-protocol-endpoints)
   - `GET /api/verifier/presentation-request`
   - `POST /api/verifier/response`
7. [Interactive Flow & External Verification Engines](#7-interactive-flow--external-verification-engines)
   - `POST /api/interop/run`
   - `POST /api/verifier/verify-raw`
8. [Automated CI Matrix & Telemetry Endpoints](#8-automated-ci-matrix--telemetry-endpoints)
   - `POST /api/interop/suite`
   - `GET /api/matrix/runs`
   - `GET /api/matrix/stats`
   - `GET /api/matrix/report/markdown`
   - `DELETE /api/matrix/runs`
9. [Real-Time WebSocket Streaming (`/ws`)](#9-real-time-websocket-streaming-ws)
10. [Error Handling & Status Codes](#10-error-handling--status-codes)

---

## 1. Overview & Base Architecture

The Inji Interoperability Playground BFF (Backend-for-Frontend) is a high-performance Node.js service providing protocol engines, cryptographic validation pipelines, and an automated regression matrix runner.

### Service Base URLs
| Environment | Base URL | WebSocket URL |
| :--- | :--- | :--- |
| **Local Development** | `http://localhost:4000` | `ws://localhost:4000/ws` |
| **Docker Compose** | `http://localhost:4000` | `ws://localhost:4000/ws` |
| **Frontend Proxy** | `http://localhost:5173/api` | `ws://localhost:5173/ws` |

### Protocol Lifecycle Architecture
```mermaid
sequenceDiagram
    autonumber
    actor Issuer as Credential Issuer (Inji Certify / Walt.id)
    actor Wallet as Holder Wallet (Inji Web / Mobile)
    actor Verifier as Verifier Relying Party (Inji Verify)

    Note over Issuer,Wallet: Phase 1: OpenID4VCI draft 13 Issuance
    Issuer->>Wallet: POST /api/issuer/offer (Pre-authorized code)
    Wallet->>Issuer: POST /api/issuer/token (grant_type=pre-authorized_code)
    Issuer-->>Wallet: TokenResponse (access_token, c_nonce)
    Wallet->>Issuer: POST /api/issuer/credential (Holder Proof JWT + custom claims)
    Issuer-->>Wallet: CredentialResponse (signed W3C VC, SD-JWT VC, or mdoc)

    Note over Wallet,Verifier: Phase 2: OpenID4VP draft 21-23 Presentation
    Verifier->>Wallet: GET /api/verifier/presentation-request (DIF PEX 2.0 definition, nonce)
    Wallet->>Verifier: POST /api/verifier/response (direct_post with vp_token)
    Verifier-->>Wallet: VerificationResult (Status, Latency, Passed Checks, Crypto Keys)
```

---

## 2. Authentication & Request Headers

### Headers
| Header | Value / Format | Required On |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` (or `application/x-www-form-urlencoded` for OAuth token exchanges) | All `POST` requests |
| `Authorization` | `Bearer <access_token>` | `POST /api/issuer/credential` |
| `Accept` | `application/json`, `text/markdown` | Where relevant |

---

## 3. Standards Conformance & Cryptographic Key Infrastructure

The backend automatically bootstraps four cryptographic key pairs upon startup:

| Participant | DID Method | Algorithm | Public Key Format | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Inji Certify Issuer** | `did:key:z6Mk...` | `Ed25519` (`EdDSA`) | JWK (OKP / Ed25519) | W3C VC 1.1/2.0 signatures & OpenID4VCI |
| **Walt.id Reference Issuer** | `did:jwk:eyJ...` | `RS256` | JWK (RSA 2048-bit) | Cross-ecosystem W3C & SD-JWT issuance |
| **Inji Wallet Holder** | `did:jwk:eyJ...` | `Ed25519` (`EdDSA`) | JWK (OKP / Ed25519) | Proof of Possession & Holder Key Binding (KB-JWT) |
| **Inji Verify Verifier** | `did:key:z6Mk...` | `Ed25519` (`EdDSA`) | JWK (OKP / Ed25519) | OpenID4VP authorization request signing |

---

## 4. System & Discovery Endpoints

### 4.1 System Healthcheck
`GET /health`

Returns service health, subsystem status, and current server UTC timestamp.

#### Response (`200 OK`)
```json
{
  "status": "UP",
  "service": "Inji Interoperability Playground BFF",
  "timestamp": "2026-11-02T16:45:00.000Z"
}
```

---

### 4.2 Module Catalog & Capabilities
`GET /api/config/modules`

Returns the active ecosystem modules, supported credential schema profiles, and available adversarial tamper attack definitions.

#### Response (`200 OK`)
```json
{
  "issuers": [
    {
      "id": "inji-certify",
      "name": "Inji Certify (MOSIP Core)",
      "type": "inji",
      "version": "v0.12.0",
      "supportedFormats": ["ldp_vc", "vc+sd-jwt", "mso_mdoc"],
      "description": "Production MOSIP issuance engine with Ed25519 & pre-authorized code flows."
    },
    {
      "id": "waltid-issuer",
      "name": "Walt.id Reference Issuer",
      "type": "external",
      "version": "v1.0.4",
      "supportedFormats": ["ldp_vc", "vc+sd-jwt"]
    }
  ],
  "wallets": [
    {
      "id": "inji-web",
      "name": "Inji Web (Browser Wallet)",
      "type": "inji",
      "supportedFormats": ["ldp_vc", "vc+sd-jwt", "mso_mdoc"]
    }
  ],
  "verifiers": [
    {
      "id": "inji-verify",
      "name": "Inji Verify (MOSIP Core)",
      "type": "inji",
      "supportedFormats": ["ldp_vc", "vc+sd-jwt", "mso_mdoc"]
    }
  ],
  "profiles": {
    "MOSIP_NATIONAL_ID": {
      "id": "MOSIP_NATIONAL_ID",
      "name": "MOSIP National ID",
      "claims": {
        "uin": "9876-5432-1098",
        "fullName": "Amina Al-Mansoor",
        "birthDate": "1994-08-15",
        "gender": "Female",
        "nationality": "Morocco"
      }
    }
  },
  "tamperScenarios": [
    {
      "id": "NONE",
      "name": "Clean Conformance Flow",
      "category": "Baseline",
      "expectedOutcome": "VALID"
    },
    {
      "id": "TAMPERED_SIGNATURE",
      "name": "Corrupted Cryptographic Signature",
      "category": "Cryptographic Integrity",
      "expectedOutcome": "TAMPERED_SIGNATURE"
    }
  ]
}
```

---

### 4.3 OpenID4VCI Issuer Metadata Discovery
`GET /api/.well-known/openid-credential-issuer`

Standards-compliant OpenID4VCI draft 13 metadata discovery document detailing supported formats, endpoints, and cryptosuites.

#### Response (`200 OK`)
```json
{
  "credential_issuer": "http://localhost:4000",
  "authorization_servers": ["http://localhost:4000"],
  "credential_endpoint": "http://localhost:4000/api/issuer/credential",
  "batch_credential_endpoint": "http://localhost:4000/api/issuer/batch-credential",
  "credentials_supported": [
    {
      "id": "MosipNationalId_ldp_vc",
      "format": "ldp_vc",
      "scope": "MosipNationalId",
      "cryptographic_binding_methods_supported": ["did:key", "did:jwk"],
      "cryptographic_suites_supported": ["Ed25519Signature2020", "JsonWebSignature2020"],
      "credential_definition": {
        "type": ["VerifiableCredential", "MosipNationalIdCredential"]
      }
    },
    {
      "id": "MosipNationalId_sd_jwt",
      "format": "vc+sd-jwt",
      "vct": "urn:mosip:id:national-id:v1",
      "cryptographic_binding_methods_supported": ["jwk"],
      "cryptographic_suites_supported": ["ES256", "EdDSA"]
    },
    {
      "id": "DigitalDrivingLicense_mso_mdoc",
      "format": "mso_mdoc",
      "doctype": "org.iso.18013.5.mDL"
    }
  ]
}
```

---

## 5. OpenID4VCI Issuance Protocol Endpoints

### 5.1 Create Credential Offer
`POST /api/issuer/offer`

Generates an `openid-credential-offer://` URI containing a pre-authorized code and issuer endpoint references.

#### Request Body
```json
{
  "format": "vc+sd-jwt",
  "profileId": "MOSIP_NATIONAL_ID",
  "customClaims": {
    "uin": "784-1988-1234567-1",
    "fullName": "Custom User Sample",
    "clearanceLevel": "TOP_SECRET"
  }
}
```

#### Response (`200 OK`)
```json
{
  "credential_offer": {
    "credential_issuer": "http://localhost:4000",
    "credentials": ["MosipNationalId_sd_jwt"],
    "grants": {
      "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
        "pre-authorized_code": "pac_b9e67ca08892d3e4210a",
        "user_pin_required": false
      }
    }
  },
  "offer_uri": "openid-credential-offer://?credential_offer=%7B%22credential_issuer%22%3A%22http%3A%2F%2Flocalhost%3A4000%22...%7D"
}
```

---

### 5.2 OAuth 2.0 Token Exchange
`POST /api/issuer/token`

Exchanges a pre-authorized code for an OAuth 2.0 Bearer access token and a single-use issuance nonce (`c_nonce`).

#### Request (`application/json` or `application/x-www-form-urlencoded`)
```json
{
  "grant_type": "urn:ietf:params:oauth:grant-type:pre-authorized_code",
  "pre-authorized_code": "pac_b9e67ca08892d3e4210a"
}
```

#### Response (`200 OK`)
```json
{
  "access_token": "at_e98f0293dbcc8a449102",
  "token_type": "Bearer",
  "expires_in": 3600,
  "c_nonce": "cnonce_7a1024b893e1f0",
  "c_nonce_expires_in": 86400
}
```

---

### 5.3 Credential Request & Signing
`POST /api/issuer/credential`

Validates the holder's proof of possession (signed with `c_nonce`), cryptographically signs the requested credential, and returns the issued token.

#### Headers
```http
Authorization: Bearer at_e98f0293dbcc8a449102
Content-Type: application/json
```

#### Request Body
```json
{
  "format": "ldp_vc",
  "proof": {
    "proof_type": "jwt",
    "jwt": "eyJhbGciOiJFZERTQSI...eyJpc3MiOiJkaWQ6andrOi...Iiwibm9uY2UiOiJjbm9uY2VfN2ExMDI0Yjg5M2UxZjAifQ..."
  }
}
```

#### Response (`200 OK` — Example W3C VC 1.1 / 2.0)
```json
{
  "format": "ldp_vc",
  "credential": {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://schema.mosip.io/credentials/v1"
    ],
    "id": "urn:uuid:68e923e4-a102-4fc8-9e01-289410ea129f",
    "type": ["VerifiableCredential", "MosipNationalIdCredential"],
    "issuer": "did:key:z6Mkuw9MazCyq5tuScFkbedZb7EZAdbau7FWFi29DvrYCVgA",
    "issuanceDate": "2026-11-02T16:50:00.000Z",
    "validUntil": "2027-11-02T16:50:00.000Z",
    "credentialSubject": {
      "uin": "784-1988-1234567-1",
      "fullName": "Custom User Sample",
      "clearanceLevel": "TOP_SECRET"
    },
    "proof": {
      "type": "Ed25519Signature2020",
      "created": "2026-11-02T16:50:00.000Z",
      "verificationMethod": "did:key:z6Mkuw9MazCyq5tuScFkbedZb7EZAdbau7FWFi29DvrYCVgA#z6Mkuw9MazCyq5tuScFkbedZb7EZAdbau7FWFi29DvrYCVgA",
      "proofPurpose": "assertionMethod",
      "jws": "eyJhbGciOiJFZERTQSI..."
    }
  }
}
```

---

## 6. OpenID4VP Presentation Protocol Endpoints

### 6.1 Generate Presentation Request
`GET /api/verifier/presentation-request?format=ldp_vc&profileId=MOSIP_NATIONAL_ID&verifierId=inji-verify`

Generates an OpenID4VP draft 21–23 Authorization Request incorporating DIF Presentation Exchange 2.0 input descriptors.

#### Query Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `format` | string | `ldp_vc` | Credential format (`ldp_vc`, `vc+sd-jwt`, `mso_mdoc`) |
| `profileId` | string | `MOSIP_NATIONAL_ID` | Schema profile identifier |
| `verifierId`| string | `inji-verify` | Relying Party module ID |

#### Response (`200 OK`)
```json
{
  "client_id": "http://localhost:4000/verifier/inji-verify",
  "response_uri": "http://localhost:4000/api/verifier/response",
  "response_type": "vp_token",
  "response_mode": "direct_post",
  "nonce": "v_nonce_8891a0c4f8",
  "state": "state_18a902df9c",
  "presentation_definition": {
    "id": "pd_mosip_national_id",
    "input_descriptors": [
      {
        "id": "mosip_id_descriptor",
        "purpose": "Verify National Identity for Public Service Authentication",
        "constraints": {
          "fields": [
            { "path": ["$.credentialSubject.uin", "$.uin"] },
            { "path": ["$.credentialSubject.fullName", "$.fullName"] }
          ]
        }
      }
    ]
  },
  "deepLink": "openid4vp://?client_id=http%3A%2F%2Flocalhost%3A4000...",
  "qrPayload": "openid4vp://?client_id=http%3A%2F%2Flocalhost%3A4000..."
}
```

---

### 6.2 Submit Presentation (`direct_post`)
`POST /api/verifier/response`

The OpenID4VP response endpoint where the Holder Wallet posts its presentation submission.

#### Request Body
```json
{
  "vp_token": {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    "type": ["VerifiablePresentation"],
    "verifiableCredential": [ /* Issued VC */ ],
    "proof": {
      "type": "Ed25519Signature2020",
      "challenge": "v_nonce_8891a0c4f8",
      "domain": "http://localhost:4000/verifier/inji-verify",
      "jws": "eyJhbGciOiJFZERTQSI..."
    }
  },
  "presentation_submission": {
    "id": "ps_sub_991823",
    "definition_id": "pd_mosip_national_id",
    "descriptor_map": [
      {
        "id": "mosip_id_descriptor",
        "format": "ldp_vc",
        "path": "$.verifiableCredential[0]"
      }
    ]
  },
  "state": "state_18a902df9c"
}
```

#### Response (`200 OK` — `VerificationResult`)
```json
{
  "status": "VALID",
  "isValid": true,
  "issuerId": "inji-certify-ed25519-key-01",
  "format": "ldp_vc",
  "profileId": "MOSIP_NATIONAL_ID",
  "verifiedClaims": {
    "uin": "784-1988-1234567-1",
    "fullName": "Custom User Sample",
    "clearanceLevel": "TOP_SECRET"
  },
  "disclosedClaimsCount": 3,
  "hiddenClaimsCount": 0,
  "checks": [
    {
      "name": "Presentation Submission Descriptor Match",
      "passed": true,
      "message": "Descriptor mapped to input descriptor"
    },
    {
      "name": "Proof Challenge (Nonce) Match",
      "passed": true,
      "message": "Challenge matched: v_nonce_8891a0c4f8"
    },
    {
      "name": "Issuer Cryptographic Signature",
      "passed": true,
      "message": "Verified against issuer DID using EdDSA"
    },
    {
      "name": "Credential Temporal Validity",
      "passed": true,
      "message": "Valid until 2027-11-02T16:50:00.000Z"
    },
    {
      "name": "Credential Revocation Status Check",
      "passed": true,
      "message": "Credential status is ACTIVE (not revoked)"
    }
  ],
  "errors": [],
  "warnings": [],
  "latencyMs": 3,
  "timestamp": "2026-11-02T16:50:02.100Z",
  "cryptographicDetails": {
    "algorithm": "EdDSA",
    "issuerKeyId": "inji-certify-ed25519-key-01",
    "holderBindingVerified": true,
    "replayProtectionVerified": true,
    "notExpired": true,
    "revocationStatusVerified": true
  }
}
```

---

## 7. Interactive Flow & External Verification Engines

### 7.1 Execute Full Interoperability Flow
`POST /api/interop/run`

Executes the complete, live 5-step lifecycle in one invocation while streaming progress events over WebSockets.

#### Request Body
```json
{
  "issuerId": "inji-certify",
  "walletId": "inji-web",
  "verifierId": "inji-verify",
  "format": "vc+sd-jwt",
  "profileId": "MOSIP_NATIONAL_ID",
  "tamperScenario": "NONE",
  "selectedClaims": ["uin", "fullName"],
  "customClaims": {
    "uin": "9876-5432-1098",
    "fullName": "Amina Al-Mansoor",
    "nationality": "Morocco"
  }
}
```

#### Response (`200 OK`)
Returns `InteropRunRecord` containing all 5 protocol exchange steps, wire payloads, timings, and the final `VerificationResult`.

---

### 7.2 Direct External Credential Verification Engine
`POST /api/verifier/verify-raw`

Allows judges and third-party developers to upload or paste arbitrary credentials (`.json` or compact `.jwt`) to test Inji Verify standards compliance.

#### Request Body
```json
{
  "rawCredential": "eyJhbGciOiJFUzI1NiIsInR5cCI6InZjK3NkLWp3dCJ9.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tIiwiaWF0IjoxNzg0ODMwMDAwfQ...~WyJTYWx0MSIsICJ1aW4iLCAiMTIzNCJd~",
  "format": "auto"
}
```

#### Response (`200 OK`)
Returns a complete `VerificationResult` breakdown detailing syntax validation, cryptographic signature evaluation, temporal status, and disclosed attributes.

---

## 8. Automated CI Matrix & Telemetry Endpoints

### 8.1 Execute Automated Test Matrix
`POST /api/interop/suite`

Executes a 12-test automated batch suite traversing format combinations (W3C VC, SD-JWT, ISO mdoc), cross-ecosystem paths (Walt.id -> Inji), and adversarial attacks (signature tampering, expiration, replay nonce, revocation).

#### Response (`200 OK`)
```json
{
  "totalRuns": 12,
  "passedRuns": 12,
  "failedRuns": 0,
  "passRate": 100,
  "records": [ /* 12 InteropRunRecord objects */ ]
}
```

---

### 8.2 Historical Run Query
`GET /api/matrix/runs`

#### Query Parameters
- `issuerId`: Filter by Issuer module (`inji-certify`, `waltid-issuer`)
- `walletId`: Filter by Wallet module (`inji-web`, `inji-mobile`)
- `verifierId`: Filter by Verifier module (`inji-verify`)
- `format`: Filter by format (`ldp_vc`, `vc+sd-jwt`, `mso_mdoc`)
- `outcome`: Filter by status (`VALID`, `TAMPERED_SIGNATURE`, `VALID_BUT_EXPIRED`, etc.)

#### Response (`200 OK`)
```json
{
  "count": 12,
  "runs": [ /* Array of InteropRunRecord */ ]
}
```

---

### 8.3 Aggregated Matrix Telemetry & Heatmap
`GET /api/matrix/stats`

Returns overall summary metrics (pass rate, mean verification latency) and cell-by-cell matrix aggregations.

#### Response (`200 OK`)
```json
{
  "total": 12,
  "passed": 12,
  "failed": 0,
  "passRate": 100,
  "avgLatencyMs": 3.8,
  "matrixCells": [
    {
      "issuerId": "inji-certify",
      "walletId": "inji-web",
      "verifierId": "inji-verify",
      "format": "ldp_vc",
      "totalRuns": 4,
      "passedRuns": 4,
      "failedRuns": 0,
      "lastOutcome": "VALID"
    }
  ]
}
```

---

### 8.4 Export Telemetry Report as Markdown
`GET /api/matrix/report/markdown`

Exports the entire test matrix and run history as an authoritative GitHub Flavored Markdown report.

#### Response (`200 OK`)
- `Content-Type: text/markdown; charset=utf-8`
- `Content-Disposition: attachment; filename="inji-interop-report.md"`

---

### 8.5 Reset Telemetry Store
`DELETE /api/matrix/runs`

#### Response (`200 OK`)
```json
{
  "message": "Run history cleared"
}
```

---

## 9. Real-Time WebSocket Streaming (`/ws`)

Connect to `ws://localhost:4000/ws` to receive live JSON event broadcasts during protocol execution.

### Event Types
| Event Type | Payload | Trigger Condition |
| :--- | :--- | :--- |
| `CONNECTED` | `{ message, timestamp }` | Client successfully opens connection |
| `CREDENTIAL_OFFER_CREATED` | `CredentialOffer` | Offer issued via OpenID4VCI |
| `STEP_PROCESSED` | `ProtocolExchangeStep` | Protocol boundary crossed in flow |
| `PRESENTATION_REQUEST_CREATED`| `PresentationRequestPayload` | OpenID4VP request generated |
| `PRESENTATION_VERIFIED` | `VerificationResult` | Inji Verify finishes assertion audit |
| `RUN_COMPLETED` | `InteropRunRecord` | Full 5-step flow concludes |
| `SUITE_PROGRESS` | `{ current, total, record }` | Automated batch test step completes |
| `SUITE_COMPLETED` | `{ totalRuns, passedRuns }` | 12-test suite finishes execution |

#### Example Event Payload
```json
{
  "type": "STEP_PROCESSED",
  "timestamp": "2026-11-02T16:50:01.500Z",
  "payload": {
    "stepIndex": 3,
    "id": "step_3",
    "title": "Credential Issuance Request & Cryptographic Signing",
    "source": "Wallet",
    "target": "Issuer",
    "protocol": "OpenID4VCI",
    "endpoint": "/api/issuer/credential",
    "method": "POST",
    "status": "SUCCESS",
    "durationMs": 4
  }
}
```

---

## 10. Error Handling & Status Codes

The API utilizes standard HTTP response codes accompanied by structured RFC 6749 / RFC 7515 error descriptors.

| HTTP Code | Error Code | Common Cause |
| :--- | :--- | :--- |
| `400 Bad Request` | `invalid_request` | Missing required parameters (`pre-authorized_code`, `vp_token`, `state`) |
| `400 Bad Request` | `invalid_grant` | Pre-authorized code expired or already consumed |
| `400 Bad Request` | `invalid_credential_request` | Proof-of-possession JWT signature verification failed or nonce mismatch |
| `401 Unauthorized` | `invalid_token` | Missing or malformed `Authorization: Bearer <token>` header |
| `500 Server Error` | `internal_error` | Cryptographic key failure or unhandled exception |

#### Structured Error Envelope Example
```json
{
  "error": "invalid_credential_request",
  "error_description": "Proof of possession challenge nonce does not match current c_nonce"
}
```

---

*Authored by Team **!Paradox!** for the **MOSIP Decode 2026 Hackathon**.*
