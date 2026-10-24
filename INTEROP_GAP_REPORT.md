# Inji Verifiable Credentials Interoperability & Gap Analysis Report

## Executive Summary

The **Inji Stack** (Inji Certify, Inji Wallet, Inji Verify) constitutes a modern, modular, open-source credentialing suite supporting:
- **Credential Issuance:** OpenID for Verifiable Credential Issuance (**OpenID4VCI draft 13**)
- **Credential Presentation:** OpenID for Verifiable Presentations (**OpenID4VP draft 21–23**)
- **Credential Formats:** W3C Verifiable Credentials 1.1 / 2.0 (**ldp_vc**), IETF Selective Disclosure JWT VC (**vc+sd-jwt**), and ISO/IEC 18013-5 Mobile Driving License (**mso_mdoc**).

This report documents the architectural testing and cross-ecosystem benchmarking conducted using the **Inji Interoperability Playground**, evaluating internal Inji compatibility against reference implementations from Walt.id, Sphereon, DIF, and European Digital Identity (EUDI) architectures.

---

## 1. Interoperability Test Matrix & Outcomes

| Combination ID | Issuer Module | Wallet Module | Verifier Module | Credential Format | Scenario / Tamper Mode | Expected Outcome | Actual Outcome | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-01** | Inji Certify | Inji Web | Inji Verify | `ldp_vc` (W3C VC) | Clean (NONE) | VALID | VALID | ✅ PASS |
| **TC-02** | Inji Certify | Inji Web | Inji Verify | `vc+sd-jwt` | Clean (NONE) | VALID | VALID | ✅ PASS |
| **TC-03** | Inji Certify | Inji Mobile | Inji Verify | `mso_mdoc` (ISO 18013-5) | Clean (NONE) | VALID | VALID | ✅ PASS |
| **TC-04** | Walt.id Issuer | Inji Web | Inji Verify | `ldp_vc` (W3C VC) | Clean (NONE) | VALID | VALID | ✅ PASS |
| **TC-05** | Inji Certify | Generic Wallet | Sphereon Verifier | `vc+sd-jwt` | Clean (NONE) | VALID | VALID | ✅ PASS |
| **TC-06** | Walt.id Issuer | Generic Wallet | Sphereon Verifier | `vc+sd-jwt` | Clean (NONE) | VALID | VALID | ✅ PASS |
| **TC-07** | Inji Certify | Inji Web | Inji Verify | `ldp_vc` | Corrupted Signature | TAMPERED_SIGNATURE | TAMPERED_SIGNATURE | ✅ PASS |
| **TC-08** | Inji Certify | Inji Web | Inji Verify | `vc+sd-jwt` | Tampered Claim (MITM) | TAMPERED_SIGNATURE | TAMPERED_SIGNATURE | ✅ PASS |
| **TC-09** | Inji Certify | Inji Web | Inji Verify | `ldp_vc` | Expired Validity Period | VALID_BUT_EXPIRED | VALID_BUT_EXPIRED | ✅ PASS |
| **TC-10** | Inji Certify | Inji Mobile | Inji Verify | `vc+sd-jwt` | Replay Nonce Injection | INVALID_NONCE | INVALID_NONCE | ✅ PASS |
| **TC-11** | Inji Certify | Inji Web | Inji Verify | `ldp_vc` | Cross-Site Audience Mismatch | MISMATCHED_AUDIENCE | MISMATCHED_AUDIENCE | ✅ PASS |
| **TC-12** | Inji Certify | Inji Web | Inji Verify | `ldp_vc` | Revoked Status in Registry | REVOKED | REVOKED | ✅ PASS |

**Result Summary:** 12/12 Automated Suite Tests Passing (100% Pass Rate).

---

## 2. In-Depth Interoperability Gaps & Actionable Recommendations

### Gap 1: Optical QR Density Limits in Offline Cross-Device Presentations (ISO 18013-5 & W3C VC)
- **Target Repository:** `mosip/inji-wallet`
- **Component:** QR Presentation & PixelPass
- **Severity:** High
- **Technical Finding:**
  When presenting a W3C VC JSON-LD credential with embedded `@context`, claims, and detached JWS proofs, the raw presentation payload routinely exceeds 2.4 KB. Standard 2D QR codes (Version 40, Level L) have an absolute physical maximum of 2,953 alphanumeric characters. When displayed on smartphone screens and scanned by budget smartphone cameras (e.g. offline field verifiers), high module density leads to optical focus and decode failure.
- **Root Cause:**
  Lack of automatic payload compression or animated chunking when payload size exceeds 1.8 KB.
- **Recommended Fix:**
  1. Mandate IETF SD-JWT VC as the preferred format for QR presentations, keeping the base token under 1 KB.
  2. Implement MOSIP PixelPass chunked animated QR code streaming (BC-UR standard) for payloads > 1.8 KB.
  3. Pre-compress JSON strings using DEFLATE before base64url serialization.

---

### Gap 2: OpenID4VP `direct_post` vs. `direct_post.jwt` Response Mode Divergence
- **Target Repository:** `mosip/inji-verify`
- **Component:** `verify-service` & `react-inji-verify-sdk`
- **Severity:** Critical
- **Technical Finding:**
  Inji Verify predominantly relies on unencrypted `response_mode: direct_post` for receiving `vp_token` submissions. In contrast, international specifications (including EU Digital Identity Wallet ARF and German PID specifications) strictly mandate `response_mode: direct_post.jwt` with JWE encryption (ECDH-ES + A256GCM).
- **Security Impact:**
  Unencrypted `direct_post` transmits plaintext identity attributes over HTTP bodies, creating exposure risks if TLS is terminated at intermediate reverse proxies or edge load balancers.
- **Recommended Fix:**
  1. Update Inji Verify authorization request generator to publish verifier encryption keys in `client_metadata.jwks`.
  2. Implement JWE decryption handler in Inji Verify BFF prior to dispatching to DIF PEX schema verification.

---

### Gap 3: DID Method and Cryptographic Signature Suite Incompatibilities
- **Target Repository:** `mosip/inji-certify`
- **Component:** `inji-certify-core`
- **Severity:** High
- **Technical Finding:**
  Inji Certify defaults to `did:key` with `Ed25519Signature2020` / `EdDSA`. While Ed25519 is cryptographically superior in performance and key size, NIST P-256 (`ES256`) and RSA (`RS256`) remain legally required by many government PKI frameworks and mobile platform keystores (Apple Wallet, Google Wallet). Furthermore, `did:key` identifiers cannot support key rotation.
- **Recommended Fix:**
  1. Add modular signature algorithm plugins allowing issuers to configure `ES256` (ECDSA P-256) and `RS256`.
  2. Add `did:web` and `did:jwk` resolution support across Inji Certify and Inji Verify.

---

### Gap 4: DIF Presentation Exchange 2.0 Path Traversal Mismatch in SD-JWT
- **Target Repository:** `mosip/inji-verify`
- **Component:** `react-inji-verify-sdk`
- **Severity:** Medium
- **Technical Finding:**
  DIF PEX 2.0 input descriptors traditionally define field constraints targeting W3C credential envelopes, e.g. `path: ["$.credentialSubject.uin"]`. However, in IETF SD-JWT VC, claims are emitted directly at the top level of the payload (`$.uin`). Verifiers strictly expecting `credentialSubject` will fail to extract claims from legitimate SD-JWT credentials.
- **Recommended Fix:**
  1. Configure multi-path queries in presentation definitions: `path: ["$.credentialSubject.uin", "$.uin"]`.
  2. Implement an automatic envelope normalization layer in Inji Verify that flattens or nests subject claims before JSONPath evaluation.

---

## 3. GitHub Issue Submission Templates

### Issue 1: `mosip/inji-wallet`
```markdown
### [BUG] Optical QR failure for W3C VC JSON-LD payloads exceeding 2.2KB

**Repository:** mosip/inji-wallet
**Module:** QR Presentation & PixelPass
**Severity:** High

#### Description
When presenting a W3C VC JSON-LD identity credential via OpenID4VP QR code, the raw JSON payload size exceeds 2,400 bytes. On mid-range mobile devices running Inji Wallet, scanning fails due to excessive QR code density.

#### Steps to Reproduce
1. Issue a W3C VC JSON-LD with standard MOSIP National ID schema.
2. Select Cross-Device QR Presentation.
3. Observe QR density; camera autofocus fails to resolve data modules.

#### Expected Behavior
Payload should be automatically compressed via PixelPass or fragmented into an animated multi-frame QR stream (BC-UR format).
```

### Issue 2: `mosip/inji-verify`
```markdown
### [FEATURE] Support direct_post.jwt with JWE response encryption in Inji Verify

**Repository:** mosip/inji-verify
**Module:** verify-service & SDK
**Severity:** Critical

#### Description
Currently Inji Verify relies predominantly on unencrypted direct_post for receiving vp_token submissions. In cross-border eIDAS 2.0 / EUDI wallet testing, all relying parties mandate 'response_mode: direct_post.jwt' with ECDH-ES JWE encryption.

#### Proposed Solution
1. Update OpenID4VP presentation request builder to declare 'response_mode: direct_post.jwt' support.
2. Provide 'client_metadata.jwks' containing the verifier encryption public key.
3. Decrypt incoming JWE before dispatching to DIF PEX schema verification.
```
