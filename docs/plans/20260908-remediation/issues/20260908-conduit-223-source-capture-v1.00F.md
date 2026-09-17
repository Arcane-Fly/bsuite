---
kind: record
authority: none
owner: bsuite
---

# feat(recruitment): online assessment integration (provider-agnostic schema + Criteria/Vervoe webhook)

https://github.com/GaryOcean428/conduit/issues/223

Snapshot updatedAt: 2026-08-24T03:26:31Z. Open at capture; re-read live.

## Scope

the published 9-step apprentice/trainee roadmap step 4 is **"For some roles, you may need to do an online assessment"**. AEP Recruitment Agreement also lists "Aptitude Testing – completed at time of application" as a pre-screening option a host can request. The conduit codebase has **no assessment infrastructure**: no table, no scoring engine, no provider integrations. The pipeline stage "Assessment" exists by name but does nothing programmatically.

## Operational anchor

- the published 9-step apprentice/trainee roadmap (reference GTO operations doc) step 4 (reference GTO operations document)
- AEP Recruitment Agreement `pre_screening_options.aptitude_testing` (file `AEP_Host_Employer_Induction_Manual_Forms_(1).txt`)
- Typical AU GTO assessment providers: **Criteria Corp**, **Predictive Index**, **Vervoe**, **TestGorilla**, **Aon Cut-e**

## Acceptance criteria

### 1. Provider-agnostic schema

```sql
CREATE TABLE r7_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  candidate_id uuid NOT NULL REFERENCES r7_candidates(id) ON DELETE CASCADE,
  application_id uuid REFERENCES r7_applications(id),
  job_id uuid REFERENCES r7_jobs(id),
  provider text NOT NULL CHECK (provider IN ('criteria','predictive_index','vervoe','testgorilla','aon_cute','manual')),
  provider_assessment_id text,  -- the provider's external ID
  assessment_type text NOT NULL CHECK (assessment_type IN (
    'cognitive','personality','skills','situational_judgement','language','custom'
  )),
  invited_at timestamptz NOT NULL DEFAULT now(),
  invitation_url text,
  invitation_expires_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN (
    'invited','started','completed','expired','failed','cancelled'
  )),
  score numeric(5,2),  -- normalized 0–100
  percentile int,
  raw_results jsonb,
  pass_threshold numeric(5,2),
  result text CHECK (result IN ('pass','fail','review','no_result')),
  notes text,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_r7_assessments_candidate ON r7_assessments(candidate_id);
CREATE INDEX idx_r7_assessments_job ON r7_assessments(job_id);
```

### 2. RLS scoped by tenant; candidate self-read allowed (read-only)

```sql
ALTER TABLE r7_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "r7_assessments_tenant" ON r7_assessments
  USING (tenant_id = r7_current_tenant_id());

CREATE POLICY "r7_assessments_candidate_self_select" ON r7_assessments FOR SELECT
  USING (candidate_id IN (
    SELECT id FROM r7_candidates
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ));
```

### 3. Webhook receiver edge function

`supabase/functions/r7-assessment-webhook/index.ts`:
- One endpoint per provider (e.g. `/criteria`, `/vervoe`)
- Validates HMAC signature using `R7_ASSESSMENT_WEBHOOK_SECRET_{provider}` env var
- Updates `r7_assessments` row by `provider_assessment_id`
- On `status='completed'`, fires the configured pipeline auto_action via issue R-3's queue

### 4. Recruiter-side UI

- `/jobs/[id]/edit/_view.tsx`: new "Assessment" section. Toggle "Require assessment", select provider + assessment_type, set pass_threshold.
- `/candidates/[id]/_view.tsx`: new "Assessments" tab. List of r7_assessments rows with status pills + score + invite link copy button + "Re-send invitation" action.
- `/pipeline/_view.tsx`: when a stage's auto_actions include `send_assessment_invitation`, dragging a card into that stage automatically invokes the provider via that provider's SDK + records the row.

### 5. Candidate-side UI

- `/portal/candidate/page.tsx`: extend `CandidatePortalShell` with an `AssessmentsSection`. Shows pending assessments with "Take assessment" deep-link to provider; completed assessments with thank-you state (NOT the score — that's recruiter-side).

### 6. Provider SDK adapter pattern

Following the existing `src/lib/payroll/adapter.ts` pattern in crm7:
```
src/lib/assessments/
  adapter.ts            # interface AssessmentProvider
  criteriaAdapter.ts    # Criteria Corp API
  vervoeAdapter.ts
  testGorillaAdapter.ts
  manualAdapter.ts      # for recruiter-entered manual assessments
  index.ts
```

Interface:
```ts
export interface AssessmentProvider {
  sendInvitation(params: SendInvitationParams): Promise<{ assessmentId: string, invitationUrl: string }>;
  fetchResult(assessmentId: string): Promise<AssessmentResult | null>;
  cancelInvitation(assessmentId: string): Promise<void>;
}
```

### 7. Auto-progression after assessment

In the pipeline stage editor, add a per-stage rule: "After assessment completes with `result='pass'`, automatically advance to stage X". Implementation lives in issue R-3's automation queue.

### 8. Tests

- Webhook signature validation (HMAC) — reject invalid signatures with 401
- Race: provider sends two webhooks for same assessment → idempotency on `provider_assessment_id`
- Pass-threshold logic: score >= threshold → result=pass auto-set
- Candidate portal hides scores but shows status
- Manual provider works without external API (recruiter enters score directly)

## Brand system clause (MANDATORY)

D2C Neon Electric, oklch + semantic tokens only.

## Branch policy (MANDATORY)

Target branch for your PR MUST be `development`, not `main`.

## Deps / blockers

- Depends on issue R-3 (automation engine to send invitations / advance stages)
- Soft-depends on issue R-1 (public apply may pre-trigger an assessment if host requested aptitude testing at the recruitment agreement layer)

## References

- the reference GTO operator Roadmap step 4
- AEP Recruitment Agreement pre-screening options
- Audit: the recruitment-flow audit notes §3 R3
