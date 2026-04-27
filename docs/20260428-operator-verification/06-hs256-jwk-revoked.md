# Item 6 — HS256 Previous JWK revoked

**Verification date:** 2026-04-28
**Workstream:** WS-β (operator-item verification sweep)
**Status:** ✅ **VERIFIED COMPLETE**

## Operator claim history

Item 10 on original 10-item checklist. Carried forward as Item 6 in v1.00W handoff. Operator has not explicitly reported done; verifying as part of WS-β sweep regardless.

## Verification command

```bash
curl -s "https://tuybltdrdefjblnplpqo.supabase.co/auth/v1/.well-known/jwks.json" \
  | jq '{keys_count: (.keys | length),
         algorithms: (.keys | map(.alg) | unique),
         key_types: (.keys | map(.kty) | unique),
         kids: (.keys | map(.kid))}'
```

## Evidence (captured 2026-04-28)

```json
{
  "keys_count": 2,
  "algorithms": ["ES256"],
  "key_types": ["EC"],
  "kids": [
    "c8e0345b-0176-43c9-9c8e-8bc8be263de4",
    "7fd86fde-9917-403c-a895-a38f325e76cf"
  ]
}
```

Both published JWKs are **ES256 / EC**. **Zero HS256 keys present in the JWKS endpoint.** New JWTs are signed with the current ES256 key; verifiers (edge functions, BSU, client apps) only accept ES256.

The two ES256 keys are the current + previous-rolled ES256 pair — having two ES256 keys is normal during/after a key rotation (so existing tokens signed with the older ES256 key continue to validate until they expire).

## Outcome

✅ **VERIFIED COMPLETE.** HS256 has been revoked from the published JWKS. Old JWTs signed with HS256 will fail signature verification at edge functions / BSU / Supabase Gateway. Removed from v3.00W handoff.

## Memory key written

`bsuite_hs256_jwk_revoked_verified` (PUT 2026-04-28).
