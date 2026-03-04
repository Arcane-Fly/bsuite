# BSuite — RAM Credential Government Access Map

**Status:** W (Working) · **Version:** 1.00 · **Date:** 2026-03-04
**Classification:** Internal — contains credential metadata (no key material)

---

## Credential Details

| Field | Value |
|-------|-------|
| **Entity** | BRADEN PTY LTD |
| **ABN** | 21 662 181 740 |
| **Credential ID** | `ABRD:21662181740_crm7` |
| **Authorisation Type** | Principal Authority |
| **Machine Credential Administrator** | Yes |
| **Start Date** | 2026-03-04 |
| **Expiry (notAfter)** | 2028-03-03 |
| **Status** | Active |
| **RAM Portal** | https://info.authorisationmanager.gov.au |
| **ATO Token Endpoint (PROD)** | `https://auth.ato.gov.au/core2/connect/token` |
| **ATO Token Endpoint (EVTE)** | `https://auth.evte.ato.gov.au/core2/connect/token` |
| **Keystore Location** | `~/.ATOMAS/keystore-new.xml` (never commit) |
| **CRM7 DB Column** | `tenants.ram_credential_vault_id` (Supabase Vault ref) |

**Representative:** Braden James Lang · braden.lang@bradengroup.com.au

---

## Agency Access — Full List with BSuite Relevance

### TIER 1 — Implement Now (core BSuite use cases)

| Agency | Service | BSuite Use Case | CRM7 Status |
|--------|---------|----------------|-------------|
| **DEWR** | Apprenticeships Data Management System (ADMS) | Apprenticeship registration, incentive claims (incl. 2026 Priority Hiring, KAP, DAAWS) | `admsAdapter.ts` — code complete, credential pending |
| **DEWR** | Unique Student Identifier (USI) Organisation Portal | Registry verification of apprentice/trainee USIs | `usiService.ts` — format-only; SOAP registry stub |
| **DEWR** | National Training Register (NTR) | Live training contract data — complements TGA REST API | TGA REST live; NTR (auth required) not started |
| **ATO** | Australian Business Register | Live ABN/GST status lookup for host employers, clients | Checksum-only today; no live ABR lookup |
| **ATO** | Online Services for Business | Payroll obligations, withholding declarations, STP events | Xero STP integration exists; ATO direct not started |
| **ATO** | Online Services for Agents / DSPs | Super fund lookups, TFN declarations, payment summaries | `Super Enquiry Service` not started |

### TIER 2 — High Value (implement in Phase 2)

| Agency | Service | BSuite Use Case | Notes |
|--------|---------|----------------|-------|
| **DEWR** | Workforce Australia Online for Businesses | Job market data, apprenticeship matching, BOOT context | Would feed R80.3 market wage benchmarks |
| **DEWR** | Assessing Authority Reporting | RTO compliance and reporting | Integration with `training_providers` table |
| **NSW Dept of Education** | Smart and Skilled Application Portal | NSW state-funded apprenticeship claims | NSW STA adapter (currently stub) |
| **NSW Dept of Education** | State Training Service Online | NSW training contract management | NSW STA adapter |
| **NT Govt** | NT VET Portal | NT training contracts and funding | NT STA adapter (stub) |
| **SA Govt** | SA Government Services Portal | SA training contracts | SA STA adapter (stub) |
| **Online Services for DSPs** | Super Enquiry Service | Verify employee super fund stapling for payroll | ATO super fund lookup |
| **Dept of Industry** | Business Registration Service | Business entity registration and status | Host employer onboarding verification |

### TIER 3 — Strategic Expansion

| Agency | Service | BSuite Use Case |
|--------|---------|----------------|
| **NDIS Quality & Safeguards** | NQSC Identity Broker | Disability apprentice/trainee placement providers |
| **NDIA** | NDIS Provider Portal + Developer Portal | NDIS participant employment and apprenticeships |
| **Dept of Home Affairs** | SkillSelect | Skilled migration + apprenticeship pathway workers |
| **Dept of Home Affairs** | AusCheck Portal | Background checks for apprentices and field officers |
| **Dept of Defence** | Employer Support Payment Scheme | Reservist apprentice support payments |
| **Dept of Education** | Education Funding System | School-based apprenticeship funding |
| **Dept of Industry** | R&D Tax Incentive Portal | R&D claims for GTO innovation (BSU portal) |
| **DEWR** | Federal Safety Commissioner (FSC/FSO) | Host employer safety certification verification |
| **DEWR** | Jobs and Skills Australia Data Sharing Platform | Labour market data for BOOT analysis / charge rate benchmarks |

### TIER 4 — State Revenue Offices (payroll tax obligations)

Each of these can be accessed via the RAM credential — relevant for host employer payroll tax compliance:

| State | Service | Relevance |
|-------|---------|-----------|
| WA | WA OSR – Revenue Online | WA payroll tax for host employers |
| VIC | SRO Victoria Payroll Tax | VIC host employer payroll tax |
| NSW | (via ABR/ATO) | NSW payroll tax |
| SA | SA Government Services Portal | SA payroll tax |
| TAS | Tasmanian Revenue Online | TAS payroll tax |
| NT | INTRA – Integrated Revenue Application | NT payroll tax |
| ACT | ACT Revenue Office Self Service Portal | ACT payroll tax |
| QLD | (via Smart Service QLD) | QLD payroll tax |

### TIER 5 — Specialist/Future (not current BSuite scope)

| Agency | Service | Notes |
|--------|---------|-------|
| APRA | APRA Connect / APRA Extranet | Superannuation fund regulation (not GTO scope) |
| AFSA | Bankruptcy Register, Debt Agreements | Client financial due diligence |
| Treasury | Franchise Disclosure Register | Franchise host employers |
| Treasury | Payment Times Reporting | Large host employer compliance |
| WGEA | Employer Portal | Workplace gender equality reporting |
| ACMA | Lodgement Facility | Communications licensing (not relevant) |
| ACCC | Digital ID Regulator System | Identity framework |
| Services Australia | PRODA | Aged care integration if BSuite expands |
| QLD | QGov Login | QLD portal authentication |

---

## Implementation Roadmap

### Phase 1 (Current sprint — in progress)

- [x] RAM M2M Auth Client (`ramAuthClient.ts`) — code complete
- [x] XML keystore parser + PKCS#8 decryption (`keystoreParser.ts`)
- [x] ADMS adapter migrated to RAM M2M (`admsAdapter.ts`)
- [x] Supabase Vault columns for credential storage (migration `20260304000005`)
- [ ] **BLOCKING: Upload keystore + password via Settings UI → store in Vault**
  - Until this step, ALL government APIs requiring auth are blocked
  - Prerequisite for ADMS, USI registry, NTR, ABR, ATO services

### Phase 2 (Issue #87 remaining tasks)

- [ ] USI Registry SOAP client (`usiRegistryClient.ts`) — verified against EVTE
- [ ] ABR live lookup — `abn.business.gov.au` JSON API (some endpoints public, some need auth)
- [ ] Settings UI for credential upload (Task 5 in issue #87)
- [ ] Connection test button (verify EVTE token acquisition)

### Phase 3 (STA adapters — all states)

All 7 remaining state adapters follow the `dtwdAdapter.ts` document-generation pattern:

| State | Authority | Priority | Portal |
|-------|-----------|----------|--------|
| NSW | Training Services NSW | **HIGH** | `smart.nsw.gov.au` / `state.training.nsw.gov.au` |
| VIC | VRQA | **HIGH** | `skills.vic.gov.au` |
| QLD | DESBT | **HIGH** | `desbt.qld.gov.au` |
| SA | Skills SA / DIS | **MEDIUM** | `skills.sa.gov.au` |
| TAS | Skills Tasmania | **MEDIUM** | `skills.tas.gov.au` |
| ACT | ACT Skills Canberra | **LOWER** | `skills.act.gov.au` |
| NT | DCET | **LOWER** | `dcet.nt.gov.au` |

### Phase 4 (Live data enrichment)

- [ ] NTR live training contract queries (DEWR National Training Register)
- [ ] Super Enquiry Service — ATO super fund stapling verification
- [ ] Workforce Australia API — labour market data for wage benchmarking
- [ ] ANZSCO code lookup (for 2026 incentive priority occupation validation)

---

## Technical Notes

### Credential Setup (one-time — not yet done)

```
1. Open CRM7 Settings → Integrations → RAM Credentials
2. Upload keystore-new.xml
3. Enter the RAM keystore password (set during creation in RAM portal)
4. System decrypts private key via node:crypto PKCS#12-PBE
5. Decrypted PKCS#8 key + leaf cert stored in Supabase Vault
6. tenants.ram_credential_vault_id + ram_credential_expires_at set
7. Test connection: verify EVTE token acquisition succeeds
```

### JWT Construction (implemented in ramAuthClient.ts)

Per ATO M2M specification:
```
Header: { "alg": "RS256", "typ": "JWT", "x5c": ["<base64 leaf DER only>"] }
Claims: { iss: clientId, sub: clientId, aud: tokenEndpoint, jti: uuid, iat, exp: iat+300 }
```

**`x5c` contains only the leaf certificate** (RFC 7515 §4.1.6) — NOT the full ATO chain.
The `publicCertificate` in the XML keystore is a BER-encoded PKCS#7/CMS bundle containing
3 certificates (leaf + ATO Sub CA + ATO Root CA). The `keystoreParser.ts` BER/DER walker
navigates to `SignedData.certificates[0]` to extract only the leaf DER.

### Credential Security Requirements

- **NEVER commit** `~/.ATOMAS/keystore-new.xml` or any `.xml` with credential fields
- **NEVER log** `protectedPrivateKey`, `privateKeyPkcs8Der`, or any derived key material
- The **password is never stored** — used only transiently during `decryptKeystore()`
- Credentials stored via **Supabase Vault** (`pgsodium` encryption at rest)
- Credential expires **2028-03-03** — set calendar reminder for 90 days prior (2027-12-03)
- Renewal: RAM portal → Machine Credentials → Create New → download new XML keystore

### Scope Notes per Service

Different services require different OAuth 2.0 scopes when requesting the Bearer token:

| Service | Scope (indicative — verify in API portal) |
|---------|------------------------------------------|
| ADMS | `apprenticeships:read apprenticeships:write claims:read claims:write payments:read` |
| USI Registry | `usi:verify usi:create` (confirm from usi.gov.au dev docs) |
| ABR | `abr:lookup` or similar |
| ATO Business | Per ATO API portal documentation |

Each scope combination results in a **separately cached token** in `RamAuthClient` — the cache key is the scope string.

---

## Related Files

| File | Description |
|------|-------------|
| `crm7/src/lib/integrations/ram/ramAuthClient.ts` | Token acquisition + caching + JWT signing |
| `crm7/src/lib/integrations/ram/keystoreParser.ts` | XML parsing, PKCS#7 cert extraction, PKCS#8 decryption |
| `crm7/src/lib/integrations/ram/types.ts` | TypeScript types + endpoint constants |
| `crm7/src/lib/funding/admsAdapter.ts` | ADMS integration (migrated to RAM M2M) |
| `crm7/src/lib/integrations/usi/usiService.ts` | USI format validation (registry stub) |
| `crm7/src/lib/integrations/stateAuthorities/` | DTWD (live) + 7 STA stubs |
| `crm7/supabase/migrations/20260304000005_ram_credentials.sql` | Vault columns on tenants table |
| `docs/plans/20260304-crm7-document-lifecycle-design-v1.00D.md` | Document signing design |
| `GTO-Standards.md` | Evidence requirements for GTO compliance |

---

## References

- [RAM Machine Credentials Guide](https://info.authorisationmanager.gov.au/manage-authorisations/resources-for-business-software-users-and-providers/create-and-manage-machine-credentials/how-to-create-a-machine-credential)
- [ATO API Portal — Client Authentication](https://apiportal.ato.gov.au/client-authentication)
- [ATO M2M Authentication](https://softwaredevelopers.ato.gov.au/M2M)
- [ADMS API Developer Portal](https://portal.admsapi.australianapprenticeships.gov.au/)
- [USI System Developers](https://usi.gov.au/system-developers)
- [NTR API Documentation](https://www.training.gov.au/developers)
- [RFC 7515 — JSON Web Signature (x5c header)](https://www.rfc-editor.org/rfc/rfc7515)
- [RFC 7523 — JWT Client Assertions](https://www.rfc-editor.org/rfc/rfc7523)
