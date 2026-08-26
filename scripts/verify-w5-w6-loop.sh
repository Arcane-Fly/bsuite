#!/usr/bin/env bash
# W5+W6 loop verifier — binary PASS/FAIL per loop-engineering success condition.
# Run AFTER lanes commit. Exit 0 only when all checks pass.
set -u
cd /home/braden/Desktop/Dev/bsuite
FAIL=0
chk() { # chk "desc" grep-pattern file
  if grep -q "$2" "$3" 2>/dev/null; then echo "PASS: $1"; else echo "FAIL: $1"; FAIL=1; fi
}
neg() { # neg "desc" pattern file — pattern must NOT appear
  if grep -q "$2" "$3" 2>/dev/null; then echo "FAIL: $1"; FAIL=1; else echo "PASS: $1"; fi
}

M=docs/audits/20260725-jodie-parity-matrix-v1.00F.md
EA=business-suite-unified/src/lib/manuals/manuals/enterprise-admin.ts
EM=business-suite-unified/src/lib/manuals/manuals/employee.ts
FO=business-suite-unified/src/lib/manuals/manuals/field-officer.ts

echo "== W5 parity matrix =="
chk "list tool FULL"  "list_enterprise_sub_orgs\` | FULL" "$M"
chk "create tool FULL" "create_enterprise_sub_org\` | FULL" "$M"
chk "provision stays MISSING" "Provision a new tenant under the Pilbara sub-org.*MISSING" "$M"
chk "feature stays MISSING" "placements feature.*MISSING" "$M"
neg "no stale 'unregistered' text" "unregistered pending" "$M"

echo "== W6 manuals =="
neg "tenant-management has no askJodie" $'tenant-management.*\n.*askJodie' "$EA"
neg "feature-assignment has no askJodie" $'feature-assignment.*\n.*askJodie' "$EA"
chk "getting-started keeps askJodie" 'Show me every sub-org' "$EA"
chk "sub-orgs keeps askJodie" 'Create a sub-organisation for the Pilbara region' "$EA"
neg "employee timesheet has no askJodie" 'Enter my hours for this week and submit them' "$EM"
chk "employee leave keeps askJodie" 'Apply for annual leave next Friday' "$EM"
neg "employee payslip has no askJodie" 'Show me my most recent payslip' "$EM"
neg "FO incident has no askJodie" 'Raise a safety incident for the Acme site' "$FO"
chk "FO case notes keep askJodie" 'Add a case note for Sam Lee' "$FO"
neg "no changelog language (we fixed)" 'we fixed' "$EA"
neg "no changelog language (previously)" 'previously' "$EA"

echo "== Manual tests =="
cd business-suite-unified
if npx vitest run src/lib/manuals 2>&1 | grep -qE "Test Files.*[0-9]+ passed"; then
  echo "PASS: manual integrity tests green"
else
  echo "FAIL: manual tests"; FAIL=1
fi

echo "== VERDICT =="
[ "$FAIL" = "0" ] && { echo "LOOP VERIFIER: PASS"; exit 0; } || { echo "LOOP VERIFIER: FAIL"; exit 1; }
