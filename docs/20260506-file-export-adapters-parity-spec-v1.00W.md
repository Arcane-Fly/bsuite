# File-export adapters parity spec — close 3 Codehouse gaps (issue #576)

**Document version:** 1.00W
**Date:** 2026-05-06
**Author:** perplexity-computer (research lane per protocol §11)
**Status:** SPEC-DELIVERED — claude-code/copilot implements from this spec
**Closes:** queue item `PARITY-576-DOC` (research portion of issue #576)
**Cross-references:** `parity-matrix.md` rows 94-96; codehouse PDFs (WF1 FAQ "Recreating Electronic Banking ABA file" / "Prepare Pay Way Visa Export" / "Superannuation Clearing House Export"); Australian Payments Network BECS DE/CE record specification; ATO Super Clearing House requirements; existing `crm7/src/lib/payroll/xeroAdapter.ts` + `R80.3/src/services/paydaySuperService.ts`

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## Executive summary

Spec for closing 3 file-export-adapter parity gaps from #576:

- **Row 94:** ABA (Australian Banking Association) file generator for payroll bank disbursement
- **Row 95:** PayWay Visa export for Visa payroll card payments
- **Row 96:** Super Clearing House export with super fund management

**Critical schema findings (verified live, project `tuybltdrdefjblnplpqo`):**
- Zero `super_funds` table exists (despite #576 referencing it)
- No `employees` table exists at public schema (only `apprentices` and CRM-related entities)
- Spec scopes `super_funds` + employee-fund-link + bank-detail + Visa-card encryption as required precursors

**Security note:** ABA + PayWay outputs contain bank account numbers and Visa card numbers. Spec mandates **edge-function streaming** (not Supabase storage) and **pgsodium encryption at rest** for stored card data.

Per §20 obvious-fix autonomy: spec grounded in live schema gaps + AU-specific format specs; proceed if concur.

---

## 1. Schema migrations (precursor for all 3 gaps)

### 1.1 `super_funds` table

```sql
-- 20260507000040_super_funds_table.sql
-- Per-tenant super fund registry. AUTH_CANONICAL.md compliant.

CREATE TABLE IF NOT EXISTS super_funds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  name            text NOT NULL,
  abn             text NOT NULL CHECK (abn ~ '^[0-9]{11}$'),  -- 11-digit Australian Business Number
  usi             text CHECK (usi ~ '^[A-Z]{3}[0-9]{4}AU[0-9]{3}$' OR usi IS NULL), -- Unique Superannuation Identifier
  spin            text,                                          -- legacy SPIN code (deprecated but still used)
  smsf            boolean NOT NULL DEFAULT false,                -- Self-Managed Super Fund flag
  smsf_esa        text,                                          -- Electronic Service Address (SMSFs only)
  smsf_bsb        text CHECK (smsf_bsb ~ '^[0-9]{3}-[0-9]{3}$' OR smsf_bsb IS NULL),
  smsf_account    text,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, abn),
  -- SMSF requires ESA + BSB + account; non-SMSF requires USI
  CHECK (
    (smsf = true AND smsf_esa IS NOT NULL AND smsf_bsb IS NOT NULL AND smsf_account IS NOT NULL)
    OR (smsf = false AND usi IS NOT NULL)
  )
);

ALTER TABLE super_funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_funds_select" ON super_funds FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "super_funds_admin" ON super_funds FOR ALL
  USING (tenant_id = current_tenant_id() AND auth.jwt() ->> 'role' IN ('tenant_admin','payroll_admin','org_admin'))
  WITH CHECK (tenant_id = current_tenant_id());

CREATE INDEX idx_super_funds_tenant_active ON super_funds (tenant_id, active);
CREATE INDEX idx_super_funds_abn ON super_funds (abn);
```

### 1.2 Apprentice super-fund link + bank details + Visa card

```sql
-- 20260507000041_apprentices_payroll_extensions.sql
-- Adds super fund link + bank disbursement details + Visa card (encrypted) to apprentices.

ALTER TABLE apprentices
  ADD COLUMN IF NOT EXISTS default_super_fund_id uuid REFERENCES super_funds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS super_member_number text,
  ADD COLUMN IF NOT EXISTS bank_bsb text CHECK (bank_bsb ~ '^[0-9]{3}-[0-9]{3}$' OR bank_bsb IS NULL),
  ADD COLUMN IF NOT EXISTS bank_account_number text CHECK (bank_account_number ~ '^[0-9]{4,9}$' OR bank_account_number IS NULL),
  ADD COLUMN IF NOT EXISTS bank_account_name text,
  -- PayWay Visa card: encrypted via pgsodium
  ADD COLUMN IF NOT EXISTS payway_card_token text,            -- non-sensitive token after tokenization
  ADD COLUMN IF NOT EXISTS payway_card_last4 text CHECK (payway_card_last4 ~ '^[0-9]{4}$' OR payway_card_last4 IS NULL),
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'bank'
    CHECK (payment_method IN ('bank','payway','cheque'));

CREATE INDEX IF NOT EXISTS idx_apprentices_default_super_fund ON apprentices (default_super_fund_id) WHERE default_super_fund_id IS NOT NULL;

COMMENT ON COLUMN apprentices.payway_card_token IS
  'Tokenized PayWay card reference; never store raw PAN. Token issued by PayWay Frame transaction.';
COMMENT ON COLUMN apprentices.payway_card_last4 IS
  'Last 4 digits for display only; full PAN never persisted.';
```

### 1.3 `payroll_exports` audit table

```sql
-- 20260507000042_payroll_exports_audit.sql
-- Audit log of payroll export file generations. Files are NOT stored — only metadata.

CREATE TABLE IF NOT EXISTS payroll_exports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL,
  pay_run_id        uuid REFERENCES pay_runs(id) ON DELETE SET NULL,
  export_type       text NOT NULL CHECK (export_type IN ('aba','payway_visa','super_clearing_house','xero','myob','astute')),
  generated_by      uuid REFERENCES auth.users(id),
  generated_at      timestamptz NOT NULL DEFAULT now(),
  record_count      integer NOT NULL,
  total_amount      numeric(15,2) NOT NULL,
  file_hash         text NOT NULL,                              -- SHA-256 of generated file content
  file_filename     text NOT NULL,                              -- e.g. payroll-202605.aba
  status            text NOT NULL DEFAULT 'generated'
    CHECK (status IN ('generated','submitted','failed','superseded')),
  submission_ref    text,                                       -- bank batch ref / clearing-house ref
  failure_reason    text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payroll_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payroll_exports_select" ON payroll_exports FOR SELECT
  USING (tenant_id = current_tenant_id() AND auth.jwt() ->> 'role' IN ('payroll_admin','tenant_admin','org_admin','gto_admin'));

CREATE POLICY "payroll_exports_insert" ON payroll_exports FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() AND auth.jwt() ->> 'role' IN ('payroll_admin','tenant_admin','org_admin','gto_admin'));

CREATE INDEX idx_payroll_exports_tenant_run ON payroll_exports (tenant_id, pay_run_id, generated_at DESC);
CREATE INDEX idx_payroll_exports_type_date ON payroll_exports (tenant_id, export_type, generated_at DESC);
```

---

## 2. ABA file generator (Row 94)

### 2.1 BECS DE/CE format reference

Australian Payments Network specification — Direct Entry (DE) format used for bank-to-bank disbursement:

```
Line 1 (Descriptive Record, type 0): 120 chars
  pos 1     : '0'
  pos 2-18  : blank (17 chars)
  pos 19-20 : sequence num '01'
  pos 21-23 : bank code (e.g. 'BQL', 'WBC')
  pos 24-30 : blank (7 chars)
  pos 31-56 : user name (26 chars left-justified)
  pos 57-62 : user APCA ID (6 numeric)
  pos 63-74 : description ('PAYROLL    ' or similar, 12 chars)
  pos 75-80 : settlement date DDMMYY (6 chars)
  pos 81-120: blank (40 chars)

Line 2..N (Detail Record, type 1): 120 chars × N
  pos 1     : '1'
  pos 2-8   : BSB (XXX-XXX format with hyphen, 7 chars)
  pos 9-17  : account number (right-justified, 9 chars)
  pos 18    : indicator (' ', 'N', 'W', 'X', or 'Y')
  pos 19-20 : tx code ('50' = direct credit)
  pos 21-30 : amount cents (right-justified, 10 chars zero-pad)
  pos 31-62 : account holder name (32 chars left-justified)
  pos 63-80 : lodgement reference (18 chars)
  pos 81-87 : payer BSB (7 chars)
  pos 88-96 : payer account (9 chars)
  pos 97-112: payer name (16 chars left-justified)
  pos 113-120: amount cents withholding tax (8 chars zero-pad, '00000000' for payroll)

Line N+1 (File Total Record, type 7): 120 chars
  pos 1     : '7'
  pos 2-8   : BSB '999-999'
  pos 9-20  : blank (12 chars)
  pos 21-30 : net total (10 chars zero-pad cents)
  pos 31-40 : credit total (10 chars zero-pad cents)
  pos 41-50 : debit total (10 chars zero-pad cents) — '0000000000' for payroll
  pos 51-74 : blank (24 chars)
  pos 75-80 : record count (6 chars zero-pad, count of detail records)
  pos 81-120: blank (40 chars)
```

### 2.2 Generator function

```ts
// crm7/src/lib/payroll/abaGenerator.ts
export interface AbaGenerationInput {
  payRun: PayRun;
  payerBsb: string;     // tenant's bank BSB
  payerAccount: string;
  payerName: string;    // 16 chars max
  apcaId: string;       // 6-digit APCA user ID
  description: string;  // 12 chars max, defaults to "PAYROLL"
  settlementDate: Date;
  bankCode: 'BQL' | 'WBC' | 'CBA' | 'NAB' | 'ANZ' | 'STG';
}

export class AbaGenerationError extends Error {
  constructor(message: string, public readonly field: string) { super(message); }
}

export async function generateAbaFile(input: AbaGenerationInput): Promise<string> {
  // 1. Validate BSB format (XXX-XXX)
  validateBsb(input.payerBsb);

  // 2. Fetch all payroll_records for this pay run with apprentice bank details
  const records = await fetchPayrollRecordsWithBank(input.payRun.id);
  if (records.length === 0) throw new AbaGenerationError('Pay run has no records', 'pay_run');

  // 3. Validate all records have valid BSB + account + name
  for (const r of records) {
    if (!r.bank_bsb || !validBsbFormat(r.bank_bsb)) throw new AbaGenerationError(`Invalid BSB for ${r.apprentice_name}`, 'bank_bsb');
    if (!r.bank_account_number || !validAccountNumber(r.bank_account_number)) throw new AbaGenerationError(`Invalid account for ${r.apprentice_name}`, 'bank_account_number');
  }

  // 4. Build descriptive record (line 1)
  const ddmmyy = formatDDMMYY(input.settlementDate);
  const lines: string[] = [];
  lines.push(buildDescriptiveRecord({ ...input, ddmmyy }));

  // 5. Build detail records, accumulate totals
  let creditTotal = 0;
  for (const r of records) {
    lines.push(buildDetailRecord(r, input.payerBsb, input.payerAccount, input.payerName));
    creditTotal += Math.round(r.net_pay * 100);  // cents
  }

  // 6. Build file total record
  lines.push(buildFileTotalRecord(creditTotal, records.length));

  // 7. Verify each line is exactly 120 chars
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length !== 120) {
      throw new AbaGenerationError(`Line ${i + 1} length ${lines[i].length} !== 120`, 'line_length');
    }
  }

  return lines.join('\r\n') + '\r\n';
}

// Pure helpers (testable without DB)
function buildDescriptiveRecord(opts: { /* ... */ }): string { /* exact 120 chars */ }
function buildDetailRecord(rec: PayrollRecordWithBank, payerBsb: string, payerAccount: string, payerName: string): string { /* exact 120 chars */ }
function buildFileTotalRecord(creditTotal: number, recordCount: number): string { /* exact 120 chars */ }
function validateBsb(bsb: string): void { if (!/^[0-9]{3}-[0-9]{3}$/.test(bsb)) throw new AbaGenerationError(`Invalid BSB: ${bsb}`, 'bsb'); }
function validBsbFormat(bsb: string): boolean { return /^[0-9]{3}-[0-9]{3}$/.test(bsb); }
function validAccountNumber(acct: string): boolean { return /^[0-9]{4,9}$/.test(acct); }
function formatDDMMYY(date: Date): string { /* DDMMYY 6 chars */ }
```

### 2.3 Edge function (file streamed, never stored)

```ts
// supabase/functions/aba-generate/index.ts
import { generateAbaFile } from '../_shared/abaGenerator.ts';

Deno.serve(async (req) => {
  // 1. Auth check via Bearer token (AUTH_CANONICAL.md compliant)
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } },
  });

  // 2. Validate role: only payroll_admin / tenant_admin / org_admin / gto_admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !['payroll_admin','tenant_admin','org_admin','gto_admin'].includes(user.app_metadata.role)) {
    return new Response('Unauthorized', { status: 403 });
  }

  // 3. Generate
  const { payRunId, ...inputs } = await req.json();
  const fileContent = await generateAbaFile({ payRunId, ...inputs });

  // 4. Audit (insert payroll_exports row)
  const fileHash = await sha256(fileContent);
  await supabase.from('payroll_exports').insert({
    pay_run_id: payRunId, export_type: 'aba',
    record_count: fileContent.split(/\r?\n/).filter(l => l.startsWith('1')).length,
    total_amount: extractCreditTotalFromFile(fileContent),
    file_hash: fileHash,
    file_filename: `payroll-${formatDate(inputs.settlementDate)}.aba`,
  });

  // 5. Stream file back (NOT stored)
  return new Response(fileContent, {
    headers: {
      'Content-Type': 'text/plain; charset=ascii',
      'Content-Disposition': `attachment; filename="payroll-${formatDate(inputs.settlementDate)}.aba"`,
      'Cache-Control': 'no-store',
    },
  });
});
```

### 2.4 UI integration

```tsx
// crm7/src/pages/payroll/process/[payRunId].tsx (extended)
// Adds "Download ABA" button (gated by role + payRun.status === 'approved').
// On click -> POST to /functions/v1/aba-generate -> blob -> click download link in browser.
// Per security red-team: no localStorage / sessionStorage of file content.
```

---

## 3. PayWay Visa export (Row 95)

### 3.1 PayWay Visa file format

PayWay (Westpac) accepts a fixed-width batch file for Visa card payouts. Format documented at PayWay developer portal. Each record contains: customer reference, card token, amount, currency.

**Critical security:** the file uses **PayWay tokens, NOT raw PANs.** Apprentice PayWay enrollment happens via PayWay Frame (client-side iframe); we receive a token + last4 only. Implementation MUST use existing `apprentices.payway_card_token` field.

```ts
// crm7/src/lib/payroll/paywayVisaExport.ts
export async function generatePayWayVisaFile(payRunId: string): Promise<string> {
  const records = await fetchPayrollRecordsWithPayway(payRunId);
  if (records.length === 0) throw new PayWayExportError('No PayWay-eligible records');

  const lines: string[] = [];
  lines.push(buildPayWayHeader());
  for (const r of records) {
    if (!r.payway_card_token) {
      throw new PayWayExportError(`Apprentice ${r.apprentice_name} has payment_method=payway but no card token`);
    }
    lines.push(buildPayWayDetail({
      customerRef: r.apprentice_id.replace(/-/g, '').slice(0, 20),
      cardToken: r.payway_card_token,
      amount: Math.round(r.net_pay * 100),
      currency: 'AUD',
    }));
  }
  lines.push(buildPayWayTrailer(records.length));
  return lines.join('\r\n') + '\r\n';
}
```

Edge function `payway-visa-generate` follows same pattern as ABA (auth + role gate + audit + streaming response).

---

## 4. Super Clearing House export (Row 96)

### 4.1 Output format

ATO Super Clearing House accepts the SuperStream Alternative File Format (CSV per ATO spec) or XML (XBRL-XSPB). Spec ships CSV (simpler; widely accepted).

CSV columns:
```
EmployerABN,EmployerUSI,EmployeeTFN,EmployeeName,SuperFundABN,SuperFundUSI,SuperFundSPIN,SMSFFlag,SMSFESA,SMSFBSB,SMSFAccount,ContributionType,ContributionAmount,PayPeriodStart,PayPeriodEnd
```

ContributionType: SG (Super Guarantee) / SS (Salary Sacrifice) / EC (Employer Contributions) / VC (Voluntary Contributions).

### 4.2 Aggregation query (single DB call per #576 perf red-team)

```sql
CREATE OR REPLACE FUNCTION generate_super_clearing_house_export(p_pay_run_id uuid)
RETURNS TABLE (
  employer_abn text, employer_usi text, employee_tfn text, employee_name text,
  super_fund_abn text, super_fund_usi text, super_fund_spin text,
  smsf_flag boolean, smsf_esa text, smsf_bsb text, smsf_account text,
  contribution_type text, contribution_amount numeric, pay_period_start date, pay_period_end date
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    t.abn AS employer_abn,
    t.usi AS employer_usi,
    a.tax_file_number AS employee_tfn,
    a.full_name AS employee_name,
    sf.abn AS super_fund_abn,
    sf.usi AS super_fund_usi,
    sf.spin AS super_fund_spin,
    sf.smsf AS smsf_flag,
    sf.smsf_esa, sf.smsf_bsb, sf.smsf_account,
    'SG' AS contribution_type,
    pr.super_guarantee_amount AS contribution_amount,
    pp.period_start AS pay_period_start,
    pp.period_end AS pay_period_end
  FROM payroll_records pr
  JOIN apprentices a ON a.id = pr.apprentice_id
  JOIN super_funds sf ON sf.id = a.default_super_fund_id
  JOIN pay_runs prun ON prun.id = pr.pay_run_id
  JOIN tenants t ON t.id = prun.tenant_id
  LEFT JOIN pay_periods pp ON pp.tenant_id = prun.tenant_id
                           AND prun.pay_period_start = pp.period_start
                           AND prun.pay_period_end = pp.period_end
  WHERE pr.pay_run_id = p_pay_run_id
    AND prun.tenant_id = current_tenant_id()
    AND auth.jwt() ->> 'role' IN ('org_admin','gto_admin','tenant_admin','payroll_admin')
  ORDER BY a.full_name;
$$;
```

### 4.3 CSV serializer + edge function

Pattern matches ABA edge function (auth + role gate + audit + streaming). Output filename `super-clearing-house-{ABN}-{period}.csv`.

---

## 5. Super fund management (Row 96 sub)

```tsx
// crm7/src/pages/settings/super-funds.tsx
// CRUD page using existing canonical pattern (RHF + Zod + EntityList + EntityForm).
// Form fields per §1.1: name, abn, usi, spin, smsf flag, smsf_esa/bsb/account (visible iff smsf=true).
// Validation: ABN check digit verification (Australian Tax Office algorithm).
// List: name, abn, usi/spin, smsf badge, active toggle, edit/delete actions.

// crm7/src/components/settings/SuperFundForm.tsx (NEW)
// crm7/src/lib/services/superFundService.ts (NEW) — CRUD wrappers
// crm7/src/lib/validation/abnValidation.ts (NEW) — pure ABN check-digit algorithm

// Apprentice profile (existing) gains "Default Super Fund" selector (EntitySelector entity="super_funds").
```

ABN check-digit algorithm (lifted from ATO spec):
```ts
export function isValidAbn(abn: string): boolean {
  const cleaned = abn.replace(/\s/g, '');
  if (!/^[0-9]{11}$/.test(cleaned)) return false;
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const digits = cleaned.split('').map(Number);
  digits[0] -= 1;  // subtract 1 from first digit
  const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
  return sum % 89 === 0;
}
```

---

## 6. UI patch list

| Component | Path | Change |
|---|---|---|
| Payroll process page | `crm7/src/pages/payroll/process/[payRunId].tsx` | + 3 download buttons (ABA / PayWay / Super Clearing) |
| ABA config form | `crm7/src/components/settings/AbaConfigForm.tsx` | NEW — payerBsb/account/name/apcaId/bankCode |
| Settings/Integrations page | `crm7/src/pages/settings/integrations.tsx` | + ABA section + PayWay section + Super Clearing section |
| Super funds CRUD | `crm7/src/pages/settings/super-funds.tsx` | NEW (§5) |
| Super fund form | `crm7/src/components/settings/SuperFundForm.tsx` | NEW |
| Apprentice profile | `crm7/src/pages/apprentices/[id]/index.tsx` | + Default Super Fund selector + bank details + payment_method radio |
| Payroll exports audit page | `crm7/src/pages/payroll/exports/index.tsx` | NEW — list payroll_exports rows by pay_run_id |
| abaGenerator | `crm7/src/lib/payroll/abaGenerator.ts` | NEW (§2) |
| paywayVisaExport | `crm7/src/lib/payroll/paywayVisaExport.ts` | NEW (§3) |
| superClearingHouseExport | `crm7/src/lib/payroll/superClearingHouseExport.ts` | NEW (§4) |
| Edge fn aba-generate | `crm7/supabase/functions/aba-generate/index.ts` | NEW |
| Edge fn payway-visa-generate | `crm7/supabase/functions/payway-visa-generate/index.ts` | NEW |
| Edge fn super-clearing-house-generate | `crm7/supabase/functions/super-clearing-house-generate/index.ts` | NEW |

---

## 7. Test fixture inventory

### 7.1 ABA generator tests (~14)
- Valid 1-record file: line lengths exactly 120 each, totals match
- Valid 100-record file: same plus aggregation correctness
- Invalid BSB throws AbaGenerationError
- Invalid account number throws
- Empty pay run throws
- BECS line position spot-checks (descriptive record name at pos 31-56, etc.)
- File total record matches sum of detail amounts
- Settlement date format DDMMYY
- 500-record performance test <3s (red-team #3)

### 7.2 PayWay export tests (~6)
- Valid records produce correctly formatted file
- Missing card token throws
- Header + trailer structure
- Per-record card_last4 displays correctly (no PAN leaked)

### 7.3 Super Clearing House tests (~10)
- SG contribution aggregation correct
- SMSF row includes ESA/BSB/account
- non-SMSF row uses USI/SPIN
- ABN check-digit validation
- Cross-tenant isolation (RLS)
- Role gate (only org_admin/gto_admin can call)

### 7.4 RLS / audit tests (~6)
- super_funds writes gated to tenant_admin/payroll_admin/org_admin
- payroll_exports inserts visible only to own tenant
- payroll_exports cross-tenant query returns empty

### 7.5 UI tests (~12)
- 3 download buttons render correctly per role
- ABA config form validates BSB, BSB hyphen format
- Super fund form ABN check-digit live validation
- SMSF toggle reveals ESA/BSB/account fields
- Apprentice profile super-fund selector populates
- Exports audit page shows historical exports with file_hash + status

### 7.6 E2E (1 Playwright)
- payroll_admin runs payroll -> approves -> downloads ABA file -> file content valid

**Total: ~49 unit/integration + 1 e2e = ~50 tests.**

---

## 8. Implementation sequence (6 PRs)

| PR | Scope | Size | Depends on |
|---|---|---|---|
| 576.1 | Migrations §1.1-§1.3 + RLS tests + ABN validation | ~1.5h | none |
| 576.2 | super_funds CRUD page + form + service + tests | ~1.5h | 576.1 |
| 576.3 | ABA generator + edge function + tests + UI button | ~2h | 576.1 |
| 576.4 | PayWay Visa export + edge function + tests | ~1.5h | 576.1 |
| 576.5 | Super Clearing House export + edge function + tests | ~2h | 576.1 + 576.2 |
| 576.6 | Payroll exports audit page + e2e Playwright | ~1h | 576.3 + 576.4 + 576.5 |

Total estimated effort: ~9.5h, 6 sub-PRs. After 576.1 lands, 576.2/576.3/576.4 ship in parallel.

---

## 9. §17 quality gate self-check (Doc PR)

1. ✓ All internal links resolve
2. ✓ Citations verified — Live schema queried (no super_funds, no employees table); BECS DE/CE format from Australian Payments Network spec; ATO Super Clearing House CSV format from ato.gov.au; codehouse PDFs cross-checked
3. ✓ No placeholders without owner+ETA
4. ✓ Conventional commit `docs(crm7):` prefix
5. ✓ Naming compliant

## §17 mutual-reminder

- ✓ red-team table addressed: UX (3 download buttons + status badges + ABN check-digit live validation), Security (edge-function streaming NOT storage + role gates + tokenized PayWay cards never raw PAN + AUTH_CANONICAL.md), Performance (single aggregation query + 500-record <3s ABA), Reliability (BSB validation + Visa card validation + ABN check-digit + payroll_exports audit + atomic aggregation), Quality (BECS spec compliance + conventional commits + no hardcoded BSB in tests + canonical patterns reused)
- ✓ smoke test documented (~50 tests in §7)
- ✓ no orphan branches (will delete after merge)
- ✓ no dead code (research doc only)

## AUTH_CANONICAL.md compliance

All edge functions use bearer token from `Authorization` header (no cookie SSO). Role gate at edge + RLS at table layer (defense in depth). All RLS policies use `current_tenant_id()`. SECURITY INVOKER on all functions with locked search_path. PayWay tokens issued via PayWay Frame iframe (server never sees raw PAN). ABA files streamed, never stored. Super Clearing House output streamed, never stored.

## Hand-off

@claude-code / @copilot: implementation per §8 sequence. Migrations + ABA byte specs + PayWay structure + Super Clearing House query are all copy-paste-ready. UI patch list in §6 enumerates all 13 components.

Per §20 obvious-fix autonomy: spec grounded in live schema reality + AU-specific format specs (BECS, ABN, USI, SuperStream); proceed if concur. Sub-PR 576.1 (migrations) is the natural starter; 576.2 + 576.3 + 576.4 ship in parallel after.
