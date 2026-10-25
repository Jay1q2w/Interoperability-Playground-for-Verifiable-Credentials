# Inji Interoperability Test Matrix & Compliance Report

Generated on: 2026-10-25T12:52:26.831Z

### Summary Metrics

- **Total Interoperability Runs**: 205
- **Passed**: 186
- **Failed / Rejected Negative Tests**: 19
- **Pass Rate**: 91%
- **Average End-to-End Latency**: 4 ms

### Module Combinations Matrix

| Issuer | Wallet | Verifier | Format | Total | Pass | Fail | Last Status |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| inji-certify | inji-web | inji-verify | `ldp_vc` | 104 | 94 | 10 | ⚠️ REVOKED |
| inji-certify | inji-mobile | inji-verify | `vc+sd-jwt` | 12 | 11 | 1 | ⚠️ TAMPERED_SIGNATURE |
| inji-certify | inji-web | inji-verify | `vc+sd-jwt` | 30 | 28 | 2 | ⚠️ TAMPERED_SIGNATURE |
| waltid-issuer | generic-wallet | sphereon-verifier | `vc+sd-jwt` | 12 | 11 | 1 | ✅ PASS |
| inji-certify | generic-wallet | sphereon-verifier | `vc+sd-jwt` | 12 | 11 | 1 | ✅ PASS |
| waltid-issuer | inji-web | inji-verify | `ldp_vc` | 15 | 14 | 1 | ✅ PASS |
| inji-certify | inji-mobile | inji-verify | `mso_mdoc` | 12 | 11 | 1 | ✅ PASS |
| inji-certify | inji-mobile | sphereon-verifier | `vc+sd-jwt` | 2 | 2 | 0 | ✅ PASS |
| inji-certify | inji-web | generic-oid4vp | `mso_mdoc` | 1 | 0 | 1 | ✅ PASS |
| inji-certify | inji-web | inji-verify | `mso_mdoc` | 1 | 0 | 1 | ✅ PASS |
| inji-certify | inji-mobile | inji-verify | `ldp_vc` | 3 | 3 | 0 | ✅ PASS |
| inji-certify | generic-wallet | sphereon-verifier | `ldp_vc` | 1 | 1 | 0 | ⚠️ TAMPERED_SIGNATURE |

### Recent Runs Log

| Timestamp | Combination | Format | Tamper Mode | Outcome | Latency |
| :--- | :--- | :--- | :--- | :--- | :---: |
| 12:52:26 | inji-certify → inji-web → inji-verify | `ldp_vc` | `REVOKED_STATUS` | **REVOKED** | 2ms |
| 12:52:26 | inji-certify → inji-web → inji-verify | `ldp_vc` | `MISMATCHED_AUDIENCE` | **MISMATCHED_AUDIENCE** | 1ms |
| 12:52:26 | inji-certify → inji-mobile → inji-verify | `vc+sd-jwt` | `INVALID_NONCE` | **TAMPERED_SIGNATURE** | 2ms |
| 12:52:26 | inji-certify → inji-web → inji-verify | `ldp_vc` | `EXPIRED_CREDENTIAL` | **VALID_BUT_EXPIRED** | 3ms |
| 12:52:26 | inji-certify → inji-web → inji-verify | `vc+sd-jwt` | `TAMPERED_CLAIM` | **TAMPERED_SIGNATURE** | 3ms |
| 12:52:26 | inji-certify → inji-web → inji-verify | `ldp_vc` | `CORRUPTED_SIGNATURE` | **TAMPERED_SIGNATURE** | 3ms |
| 12:52:26 | waltid-issuer → generic-wallet → sphereon-verifier | `vc+sd-jwt` | `NONE` | **VALID** | 6ms |
| 12:52:26 | inji-certify → generic-wallet → sphereon-verifier | `vc+sd-jwt` | `NONE` | **VALID** | 2ms |
| 12:52:26 | waltid-issuer → inji-web → inji-verify | `ldp_vc` | `NONE` | **VALID** | 5ms |
| 12:52:26 | inji-certify → inji-mobile → inji-verify | `mso_mdoc` | `NONE` | **VALID** | 4ms |
| 12:52:26 | inji-certify → inji-web → inji-verify | `vc+sd-jwt` | `NONE` | **VALID** | 3ms |
| 12:52:26 | inji-certify → inji-web → inji-verify | `ldp_vc` | `NONE` | **VALID** | 6ms |
| 12:51:30 | inji-certify → inji-web → inji-verify | `ldp_vc` | `NONE` | **INVALID** | 1ms |
| 12:50:34 | inji-certify → inji-web → inji-verify | `ldp_vc` | `REVOKED_STATUS` | **INVALID** | 0ms |
| 12:50:34 | inji-certify → inji-web → inji-verify | `ldp_vc` | `MISMATCHED_AUDIENCE` | **INVALID** | 0ms |
| 12:50:34 | inji-certify → inji-mobile → inji-verify | `vc+sd-jwt` | `INVALID_NONCE` | **INVALID** | 1ms |
| 12:50:34 | inji-certify → inji-web → inji-verify | `ldp_vc` | `EXPIRED_CREDENTIAL` | **INVALID** | 1ms |
| 12:50:34 | inji-certify → inji-web → inji-verify | `vc+sd-jwt` | `TAMPERED_CLAIM` | **INVALID** | 0ms |
| 12:50:34 | inji-certify → inji-web → inji-verify | `ldp_vc` | `CORRUPTED_SIGNATURE` | **INVALID** | 0ms |
| 12:50:34 | waltid-issuer → generic-wallet → sphereon-verifier | `vc+sd-jwt` | `NONE` | **INVALID** | 0ms |
